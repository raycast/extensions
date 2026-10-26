import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RunPage } from '../src/api.ts';
import { observe, runStatus, timeline, unobserved } from '../src/run-observation.ts';

function page(overrides: Partial<RunPage> = {}): RunPage {
	return {
		run: {
			runId: 'run-1',
			workflowId: 'workflow-1',
			version: '3',
			status: 'running',
			startedAt: 100,
		},
		events: [],
		nextSeq: 0,
		truncated: false,
		complete: false,
		output: { kind: 'not-observed' },
		...overrides,
	};
}

test('a re-read from the start does not repeat events already shown', () => {
	const first = observe(
		unobserved,
		page({ events: [{ runId: 'run-1', seq: 0, type: 'run_started' }] }),
	);
	const second = observe(
		first,
		page({
			events: [
				{ runId: 'run-1', seq: 0, type: 'run_started' },
				{ runId: 'run-1', seq: 1, type: 'step_started', name: 'fetch' },
			],
		}),
	);
	assert.deepEqual(
		second.events.map((event) => event.seq),
		[0, 1],
	);
});

test('keeps observed output when a later page carries none', () => {
	const done = observe(unobserved, page({ output: { kind: 'available', value: 'done' } }));
	assert.deepEqual(observe(done, page()).output, { kind: 'available', value: 'done' });
});

test('does not present a success as final until observation is complete', () => {
	const run = { ...page().run, status: 'succeeded' as const };
	assert.deepEqual(runStatus(observe(unobserved, page({ run, complete: false })), false), {
		label: 'Success reported · observation incomplete',
		tone: 'warning',
	});
	assert.deepEqual(runStatus(observe(unobserved, page({ run, complete: true })), false), {
		label: 'Succeeded',
		tone: 'success',
	});
});

test('names an uncertain launch until the run is read', () => {
	assert.equal(runStatus(unobserved, true).label, 'Launch uncertain');
	assert.equal(runStatus(unobserved, false).label, 'Awaiting run evidence');
});

test('shows one timeline row per step with its final state, like the web app', () => {
	const rows = timeline([
		{
			runId: 'run-1',
			seq: 0,
			ts: 0,
			type: 'run_started',
			triggerType: 'webhook',
			triggerKey: 'slack-app-mention',
		},
		{ runId: 'run-1', seq: 1, ts: 1000, type: 'step_started', stepIndex: 0, name: 'Reply' },
		{ runId: 'run-1', seq: 2, ts: 1500, type: 'integration_call_completed', stepIndex: 0 },
		{ runId: 'run-1', seq: 3, ts: 1584, type: 'step_completed', stepIndex: 0, durationMs: 584 },
		{ runId: 'run-1', seq: 4, ts: 2865, type: 'run_succeeded' },
	]);
	assert.deepEqual(
		rows.map(({ title, tone }) => [title, tone]),
		[
			['Started', 'neutral'],
			['Reply', 'success'],
			['Succeeded', 'success'],
		],
	);
	assert.match(rows[0].description, /^slack-app-mention \(webhook\) · \d{2}:\d{2}:\d{2}$/);
	assert.equal(rows[1].description, 'Completed · 584ms');
	assert.match(rows[1].tooltip ?? '', /^Started \d{2}:\d{2}:\d{2}\.000 /);
	assert.equal(rows[2].description, '2.9s total');
});

test('shows a log with its level and a short clock time, keeping the exact time on hover', () => {
	const [row] = timeline([
		{ runId: 'run-1', seq: 1, ts: 980, type: 'log', level: 'info', message: 'Found 14 issues' },
	]);
	assert.equal(row.title, 'Found 14 issues');
	assert.match(row.description, /^Info · \d{2}:\d{2}:\d{2}$/);
	assert.match(row.tooltip ?? '', /^\d{2}:\d{2}:\d{2}\.980 /);
});

test('a failed step carries its failure, and a failure before start reads as did not start', () => {
	const rows = timeline([
		{ runId: 'run-1', seq: 0, ts: 0, type: 'run_failed', message: 'Connection expired' },
	]);
	assert.equal(rows[0].title, 'Did not start');
	const step = timeline([
		{ runId: 'run-1', seq: 1, ts: 0, type: 'step_started', stepIndex: 0, name: 'Send' },
		{
			runId: 'run-1',
			seq: 2,
			ts: 10,
			type: 'step_failed',
			stepIndex: 0,
			durationMs: 10,
			message: 'Permission denied',
		},
	]);
	assert.equal(step[0].tone, 'error');
	assert.equal(step[0].description, 'Failed · 10ms · Permission denied');
});
