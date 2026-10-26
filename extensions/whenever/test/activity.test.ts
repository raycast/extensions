import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Activity, launchRun } from '../src/activity.ts';
import { LaunchUncertain, type Start } from '../src/api.ts';
function storage() {
	const values = new Map<string, string>();
	return {
		get: async (key: string) => values.get(key),
		set: async (key: string, value: string) => {
			values.set(key, value);
		},
		remove: async (key: string) => {
			values.delete(key);
		},
	};
}
const run = (runId: string) => ({ runId, workflowId: 'workflow-1', version: 3, pending: true });
test('run records stay within the connected session', async () => {
	const db = storage();
	await new Activity(db, 'first').rememberRun(run('run-1'));
	assert.deepEqual(
		(await new Activity(db, 'first').read()).runs.map((item) => item.runId),
		['run-1'],
	);
	assert.deepEqual((await new Activity(db, 'second').read()).runs, []);
});
test('clearing a connection removes only its own local activity', async () => {
	const db = storage();
	const first = new Activity(db, 'first');
	const second = new Activity(db, 'second');
	await first.rememberRun(run('run-1'));
	await second.rememberRun(run('run-2'));
	await first.clear();
	assert.deepEqual((await first.read()).runs, []);
	assert.deepEqual(
		(await second.read()).runs.map((item) => item.runId),
		['run-2'],
	);
});
test('remembers a lost launch before dispatch and prevents a second launch for that workflow', async () => {
	const activity = new Activity(storage(), 'first');
	let calls = 0;
	const client = {
		start: async (request: Start) => {
			calls++;
			assert.equal((await activity.read()).runs[0].runId, request.runId);
			throw new LaunchUncertain(request.runId);
		},
	};
	const request = {
		workflowId: 'workflow-1',
		version: 3,
		runId: 'stable',
		input: { text: 'private input' },
	};
	await assert.rejects(launchRun(client, activity, request), LaunchUncertain);
	await assert.rejects(launchRun(client, activity, { ...request, runId: 'second' }), /Inspect/);
	assert.equal(calls, 1);
	assert.equal(JSON.stringify(await activity.read()).includes('private input'), false);
});
test('releases an inspected launch for a deliberate new run', async () => {
	const activity = new Activity(storage(), 'first');
	await activity.rememberRun({
		runId: 'first',
		workflowId: 'workflow-1',
		version: 3,
		pending: true,
	});
	await activity.observed('first');
	await launchRun(
		{ start: async (request) => ({ runId: request.runId, launchState: 'launched' }) },
		activity,
		{ workflowId: 'workflow-1', version: 3, runId: 'second', input: null },
	);
	assert.equal((await activity.read()).runs[0].pending, false);
});

test('overlapping updates keep every remembered run', async () => {
	const activity = new Activity(storage(), 'first');
	await Promise.all([activity.rememberRun(run('run-1')), activity.rememberRun(run('run-2'))]);
	assert.deepEqual((await activity.read()).runs.map((item) => item.runId).sort(), [
		'run-1',
		'run-2',
	]);
});
