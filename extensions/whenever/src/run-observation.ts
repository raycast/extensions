import type { Output, Run, RunEvent, RunPage } from './api.ts';
import { humanize } from './format.ts';
import {
	NEVER_STARTED,
	formatClock,
	formatTime,
	formatDuration,
	runPresentation,
	runStatusPresentation,
	startedTriggerLabel,
	type Presentation,
	type Tone,
} from './presentation.ts';

const EVENT_LIMIT = 500;
export type Observation = {
	run?: Run;
	events: RunEvent[];
	output: Output;
	complete: boolean;
	more: boolean;
	reading: boolean;
	error?: unknown;
};
export const unobserved: Observation = {
	events: [],
	output: { kind: 'not-observed' },
	complete: false,
	more: false,
	reading: false,
};
const KEPT_TYPES = new Set([
	'step_started',
	'step_completed',
	'step_failed',
	'step_retried',
	'run_started',
	'run_succeeded',
	'run_failed',
	'run_timed_out',
	'run_cancelled',
]);
// Step and lifecycle events build the timeline rows, so only logs and other events are dropped.
function capped(events: RunEvent[]) {
	let excess = events.length - EVENT_LIMIT;
	if (excess <= 0) return events;
	return events.filter((event) => KEPT_TYPES.has(event.type) || excess-- <= 0);
}
export function observe(state: Observation, page: RunPage): Observation {
	const last = state.events.at(-1)?.seq ?? -1;
	return {
		run: page.run,
		events: capped([...state.events, ...page.events.filter((event) => event.seq > last)]),
		output: page.output.kind === 'not-observed' ? state.output : page.output,
		complete: page.complete,
		more: page.truncated,
		reading: false,
	};
}

export function runStatus({ run, complete }: Observation, uncertain: boolean): Presentation {
	if (!run)
		return uncertain
			? { label: 'Launch uncertain', tone: 'warning' }
			: { label: 'Awaiting run evidence', tone: 'neutral' };
	if (run.status === 'succeeded' && !complete)
		return { label: 'Success reported · observation incomplete', tone: 'warning' };
	return runPresentation(run);
}

export type TimelineItem = {
	key: string;
	title: string;
	description: string;
	tooltip?: string;
	tone: Tone;
};
const LIFECYCLE: Partial<Record<string, Run['status']>> = {
	run_started: 'running',
	run_succeeded: 'succeeded',
	run_failed: 'failed',
	run_timed_out: 'timed_out',
	run_cancelled: 'cancelled',
};
const STEP_TONE = { running: 'warning', completed: 'success', failed: 'error' } as const;
const STEP_LABEL = { running: 'Running', completed: 'Completed', failed: 'Failed' } as const;
const LOG_LABEL = { debug: 'Debug', info: 'Info', warn: 'Warning', error: 'Error' } as const;
const STEP_RESULT: Partial<Record<string, keyof typeof STEP_TONE>> = {
	step_completed: 'completed',
	step_failed: 'failed',
	step_retried: 'running',
};
type Step = {
	seq: number;
	name: string;
	status: keyof typeof STEP_TONE;
	ts?: number;
	durationMs?: number;
	failure?: string;
};
const clock = (ts: number | undefined) => (ts === undefined ? [] : [formatTime(ts)]);
const exact = (ts: number | undefined, prefix = '') =>
	ts === undefined ? {} : { tooltip: `${prefix}${formatClock(ts)}` };
const stepRow = (step: Step): TimelineItem => ({
	key: `step-${step.seq}`,
	title: step.name,
	description: [
		step.failure === undefined
			? STEP_LABEL[step.status]
			: step.status === 'running'
				? 'Retrying'
				: 'Failed',
		...(step.durationMs === undefined ? [] : [formatDuration(step.durationMs)]),
		...(step.failure === undefined ? [] : [step.failure]),
	].join(' · '),
	...exact(step.ts, 'Started '),
	tone: STEP_TONE[step.status],
});

// Mirrors the web app's run timeline: one row per step, plus logs and run lifecycle events.
export function timeline(events: RunEvent[]): TimelineItem[] {
	// Steps are rendered last because later events finish them.
	const rows: Array<() => TimelineItem> = [];
	const steps = new Map<number, Step>();
	let startedAt: number | undefined;
	for (const event of events) {
		const step = event.stepIndex === undefined ? undefined : steps.get(event.stepIndex);
		const result = STEP_RESULT[event.type];
		if (result !== undefined) {
			if (!step) continue;
			step.status = result;
			if (event.durationMs !== undefined) step.durationMs = event.durationMs;
			if (event.message !== undefined) step.failure = event.message;
			continue;
		}
		switch (event.type) {
			case 'step_started': {
				const started: Step = {
					seq: event.seq,
					name: event.name ?? 'Step',
					status: 'running',
					...(event.ts === undefined ? {} : { ts: event.ts }),
				};
				if (event.stepIndex !== undefined) steps.set(event.stepIndex, started);
				rows.push(() => stepRow(started));
				break;
			}
			case 'log': {
				const row: TimelineItem = {
					key: `log-${event.seq}`,
					title: event.message ?? 'Log',
					description: [event.level ? LOG_LABEL[event.level] : 'Log', ...clock(event.ts)].join(
						' · ',
					),
					...exact(event.ts),
					tone: 'neutral',
				};
				rows.push(() => row);
				break;
			}
			default: {
				const status = LIFECYCLE[event.type];
				if (status === undefined) break;
				if (status === 'running') startedAt = event.ts;
				const presentation =
					status === 'running'
						? { label: 'Started', tone: 'neutral' as const }
						: status === 'failed' && event.seq === 0
							? NEVER_STARTED
							: runStatusPresentation(status);
				const elapsed =
					status !== 'running' &&
					startedAt !== undefined &&
					event.ts !== undefined &&
					event.ts >= startedAt
						? [`${formatDuration(event.ts - startedAt)} total`]
						: [];
				const row: TimelineItem = {
					key: `life-${event.seq}`,
					title: presentation.label,
					description: [
						...(status === 'running' && event.triggerType !== undefined
							? [startedTriggerLabel(event.triggerType, event.triggerKey)]
							: []),
						...(elapsed.length > 0 ? elapsed : clock(event.ts)),
						...(event.message === undefined ? [] : [event.message]),
					].join(' · '),
					...exact(event.ts),
					tone: presentation.tone,
				};
				rows.push(() => row);
			}
		}
	}
	return rows.map((row) => row());
}

export function outputNotice(output: Output): string {
	switch (output.kind) {
		case 'omitted':
			return `Output omitted: ${humanize(output.reason)}`;
		case 'none':
			return 'The run returned no output';
		case 'not-observed':
			return 'Output has not been observed';
		case 'available':
			return 'Output available';
	}
}
