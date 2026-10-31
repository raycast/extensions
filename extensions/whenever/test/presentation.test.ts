import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Workflow } from '../src/api.ts';
import { md } from '../src/format.ts';
import {
	appNames,
	formatClock,
	formatDate,
	formatTime,
	formatDuration,
	formatTimestamp,
	runDescription,
	runFields,
	runTrigger,
	workflowMarkdown,
	workflowPresentation,
} from '../src/presentation.ts';

const draft: Workflow = {
	id: 'workflow-1',
	name: 'Summarize',
	deployedVersion: undefined,
	activation: undefined,
	planPaused: false,
	planPauseCauses: [],
	pinned: false,
	lastActivityAt: undefined,
};

test('labels workflows with the same lifecycle statuses as the web app sidebar', () => {
	const published = { ...draft, deployedVersion: 2 };
	assert.deepEqual(
		[
			draft,
			published,
			{ ...published, activation: 'active' as const },
			{ ...published, activation: 'setup-required' as const },
			{ ...published, activation: 'active' as const, planPaused: true },
		].map((workflow) => [
			workflowPresentation(workflow).label,
			workflowPresentation(workflow).tone,
		]),
		[
			['Draft', 'neutral'],
			['Turned On', 'neutral'],
			['Active', 'success'],
			['Setup required', 'warning'],
			['Paused — plan limit', 'warning'],
		],
	);
});

test('explains a plan pause by its recorded cause', () => {
	const paused = { ...draft, planPaused: true, planPauseCauses: ['schedule-limit' as const] };
	assert.match(workflowPresentation(paused).description ?? '', /one scheduled run per day/);
});

test('describes a run as status, trigger and version, and a refused start as did not start', () => {
	const run = {
		runId: 'run-1',
		workflowId: 'workflow-1',
		startedAt: 0,
		triggerType: 'webhook',
	};
	assert.equal(
		runDescription({ ...run, version: '1', status: 'succeeded' }),
		'Succeeded · Webhook · v1',
	);
	assert.equal(
		runDescription({ ...run, version: undefined, status: 'failed' }),
		'Did not start · Webhook',
	);
});

test('formats durations and times as the web app does', () => {
	assert.deepEqual([584, 2865, 125000].map(formatDuration), ['584ms', '2.9s', '2m 5s']);
	assert.equal(formatTimestamp(Date.UTC(2026, 9, 23, 12, 10), 'UTC'), 'Oct 23, 12:10 UTC');
	assert.equal(formatClock(Date.UTC(2026, 9, 23, 12, 10, 44, 48), 'UTC'), '12:10:44.048 UTC');
	assert.equal(formatTime(Date.UTC(2026, 9, 23, 12, 10, 44, 48), 'UTC'), '12:10:44');
});

test('asks only for the run input and trigger the saved source uses', () => {
	assert.deepEqual(runFields({ usesInput: false, triggers: [{ key: 'manual', type: 'manual' }] }), {
		input: false,
		trigger: 'hidden',
	});
	const triggers = [
		{ key: 'manual', type: 'manual' },
		{ key: 'push', type: 'webhook' },
	];
	assert.deepEqual(runFields({ usesInput: true, triggers }), { input: true, trigger: triggers });
	assert.deepEqual(runFields({ usesInput: true, triggers: [] }), {
		input: true,
		trigger: 'hidden',
	});
});

test('keeps both run fields when the server does not say what the source uses', () => {
	assert.deepEqual(runFields({}), { input: true, trigger: 'typed' });
});

test('sends a declared trigger even after a refresh drops the one picked earlier', () => {
	const triggers = [
		{ key: 'manual', type: 'manual' },
		{ key: 'github-push', type: 'webhook' },
	];
	assert.equal(runTrigger(triggers, 'github-push'), 'github-push');
	assert.equal(runTrigger(triggers, 'push'), 'manual');
	assert.equal(runTrigger('hidden', 'push'), undefined);
	assert.equal(runTrigger('typed', '  push '), 'push');
});

test('names the apps a workflow calls once each, in order', () => {
	assert.deepEqual(
		appNames([
			'slackbot.sendMessage',
			'linear.listIssues',
			'slackbot.addReaction',
			'acme_crm.getLead',
		]),
		['Acme crm', 'Linear', 'Slack'],
	);
});

test('formats a saved date as month and day', () => {
	assert.equal(formatDate('2026-10-21T11:33:44.153Z', 'UTC'), 'Oct 21');
});

test('summarizes what a workflow runs on, the apps it uses and its last run', () => {
	const active = { ...draft, deployedVersion: 4, activation: 'active' as const };
	const markdown = workflowMarkdown(active, {
		triggers: [
			{ key: 'weekday-mornings', type: 'schedule' },
			{ key: 'post-now', type: 'manual' },
		],
		integrations: ['slackbot.sendMessage', 'linear.listIssues'],
		runs: [
			{ runId: 'old', workflowId: 'workflow-1', version: '4', status: 'failed', startedAt: 1000 },
			{
				runId: 'new',
				workflowId: 'workflow-1',
				version: '4',
				status: 'succeeded',
				startedAt: 5000,
				endedAt: 9100,
			},
		],
	});
	const [title, facts, ...rest] = markdown.split('\n\n');
	assert.equal(title, '# Summarize');
	assert.deepEqual(rest, []);
	const lines = facts.split('\n');
	assert.equal(lines[0], '- **Runs on** weekday-mornings (schedule) · post-now (manual)');
	assert.equal(lines[1], '- **Uses** Linear, Slack');
	assert.match(lines[2], /^- \*\*Last run\*\* Succeeded · .+ · 4\.1s$/);
});

test('explains a status that stops the workflow from running', () => {
	const paused = { ...draft, deployedVersion: 4, activation: 'paused' as const };
	assert.equal(
		workflowMarkdown(paused, { runs: [] }),
		'# Summarize\n\nWorkflow triggers are paused.\n\n- **Last run** No runs yet',
	);
});

test('says when the last run could not be read instead of claiming there are none', () => {
	assert.equal(
		workflowMarkdown(draft, { runsFailed: true }),
		'# Summarize\n\nThis workflow is not turned on.\n\n- **Last run** Could not be read',
	);
});

test('keeps names readable in Raycast markdown, which renders backslashed brackets as math', () => {
	assert.equal(
		md('Sync [beta] (v2) for $5 & #1'),
		'Sync &#91;beta&#93; (v2) for &#36;5 &amp; \\#1',
	);
});
