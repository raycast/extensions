import { isRecord, postJson } from './http.ts';
import { MCP_URL } from './urls.ts';

const RUN_STATUSES = ['running', 'succeeded', 'failed', 'timed_out', 'cancelled'] as const;
const LAUNCHED_STATES = ['claimed', 'launched', 'not_started'] as const;
const ACTIVATIONS = ['active', 'activating', 'degraded', 'paused', 'setup-required'] as const;
const PLAN_PAUSES = ['pause-pending', 'paused'] as const;
const PLAN_PAUSE_CAUSES = [
	'active-workflow-limit',
	'schedule-limit',
	'connection-limit',
	'check-failed',
] as const;
const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type Workflow = {
	id: string;
	name: string;
	deployedVersion: number | undefined;
	activation: (typeof ACTIVATIONS)[number] | undefined;
	planPaused: boolean;
	planPauseCauses: (typeof PLAN_PAUSE_CAUSES)[number][];
	pinned: boolean;
	lastActivityAt: string | undefined;
	updatedAt?: string;
};
export type Profile = { name: string; email?: string };
export type Trigger = { key: string; type: string };
export type Run = {
	runId: string;
	workflowId: string;
	version: string | undefined;
	triggerType?: string;
	triggerKey?: string;
	status: (typeof RUN_STATUSES)[number];
	startedAt: number;
	endedAt?: number;
	failure?: string;
};
export type RunEvent = {
	runId: string;
	seq: number;
	type: string;
	ts?: number;
	name?: string;
	message?: string;
	stepIndex?: number;
	durationMs?: number;
	level?: (typeof LOG_LEVELS)[number];
	triggerType?: string;
	triggerKey?: string;
};
export type Output =
	| { kind: 'not-observed' | 'none' }
	| { kind: 'omitted'; reason: 'too_large' | 'unserializable' }
	| { kind: 'available'; value: unknown };
export type RunPage = {
	run: Run;
	events: RunEvent[];
	nextSeq: number;
	truncated: boolean;
	complete: boolean;
	output: Output;
};
export type Start = {
	workflowId: string;
	version: number;
	runId: string;
	input: unknown;
	triggerKey?: string;
};
class RequestRefused extends Error {
	payload: Record<string, unknown>;
	constructor(message: string, payload: Record<string, unknown> = {}) {
		super(message);
		this.payload = payload;
	}
}
export class SignInRequired extends Error {
	constructor() {
		super('Connect your Whenever account to continue.');
	}
}
export class LaunchUncertain extends Error {
	runId: string;
	constructor(runId: string) {
		super('The launch outcome is uncertain. Inspect this run before starting another.');
		this.runId = runId;
	}
}
function invalid(field = 'response'): never {
	throw new Error(`Whenever returned invalid ${field} data. Refresh to try the read again.`);
}
function data(value: unknown): Record<string, unknown> {
	if (!isRecord(value)) invalid();
	return value;
}
function text(value: unknown): string {
	if (typeof value !== 'string' || !value || value.length > 20000) invalid();
	return value;
}
function integer(value: unknown): number {
	if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalid();
	return value;
}
function flag(value: unknown): boolean {
	if (typeof value !== 'boolean') invalid();
	return value;
}
function oneOf<const T extends string>(value: unknown, options: readonly T[]): T {
	const match = options.find((option) => option === value);
	if (match === undefined) invalid();
	return match;
}
function recognized<const T extends string>(value: unknown, options: readonly T[]) {
	return options.find((option) => option === value);
}
function duration(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) invalid();
	return value;
}
function array(value: unknown): unknown[] {
	if (!Array.isArray(value)) invalid();
	return value;
}
const published = (version: number) => (version > 0 ? version : undefined);
function completeness(value: unknown) {
	return oneOf(value === undefined ? 'not-evidenced' : value, [
		'complete',
		'truncated',
		'not-evidenced',
	]);
}
function workflow(value: unknown): Workflow {
	const item = data(value);
	const causes = item.planEnforcementCauses;
	return {
		id: text(item.id),
		name: text(item.name),
		deployedVersion:
			item.deployedVersion === undefined ? undefined : published(integer(item.deployedVersion)),
		activation: recognized(item.activation, ACTIVATIONS),
		planPaused: recognized(item.planEnforcement, PLAN_PAUSES) !== undefined,
		planPauseCauses: Array.isArray(causes)
			? PLAN_PAUSE_CAUSES.filter((cause) => causes.includes(cause))
			: [],
		pinned: item.pinned === true,
		lastActivityAt:
			typeof item.lastActivityAt === 'string' && item.lastActivityAt
				? item.lastActivityAt
				: undefined,
		...(item.updatedAt === undefined ? {} : { updatedAt: text(item.updatedAt) }),
	};
}
function trigger(value: unknown): Trigger {
	const item = data(value);
	return { key: text(item.key), type: text(item.type) };
}
function run(value: unknown): Run {
	const item = data(value);
	return {
		runId: text(item.runId),
		workflowId: text(item.workflowId),
		version: item.version === '' ? undefined : text(item.version),
		...(item.triggerType === undefined ? {} : { triggerType: text(item.triggerType) }),
		...(item.triggerKey === undefined ? {} : { triggerKey: text(item.triggerKey) }),
		status: oneOf(item.status, RUN_STATUSES),
		startedAt: integer(item.startedAt),
		...(item.endedAt === undefined ? {} : { endedAt: integer(item.endedAt) }),
		...(item.failure === undefined ? {} : { failure: text(data(item.failure).message) }),
	};
}
function runEvent(item: Record<string, unknown>, runId: string): RunEvent {
	const triggerKey = item.trigger === undefined ? undefined : data(item.trigger).key;
	return {
		runId,
		seq: integer(item.seq),
		type: text(item.type),
		...(item.ts === undefined ? {} : { ts: integer(item.ts) }),
		...(item.stepIndex === undefined ? {} : { stepIndex: integer(item.stepIndex) }),
		...(item.durationMs === undefined ? {} : { durationMs: duration(item.durationMs) }),
		...(item.level === undefined ? {} : { level: oneOf(item.level, LOG_LEVELS) }),
		...(item.triggerType === undefined ? {} : { triggerType: text(item.triggerType) }),
		...(triggerKey === undefined ? {} : { triggerKey: text(triggerKey) }),
		...(item.name === undefined ? {} : { name: text(item.name) }),
		...(item.failure !== undefined
			? { message: text(data(item.failure).message) }
			: item.message === undefined
				? {}
				: { message: text(item.message) }),
	};
}
function succeededOutput(item: Record<string, unknown>): Output {
	if (item.outputOmitted !== undefined) {
		if (item.outputJson !== undefined) invalid();
		return { kind: 'omitted', reason: oneOf(item.outputOmitted, ['too_large', 'unserializable']) };
	}
	if (item.outputJson === undefined) return { kind: 'none' };
	if (typeof item.outputJson !== 'string' || item.outputJson.length > 20000) invalid();
	return { kind: 'available', value: JSON.parse(item.outputJson) };
}
export function outputText(output: Output): string | undefined {
	if (output.kind !== 'available') return undefined;
	return typeof output.value === 'string' ? output.value : JSON.stringify(output.value, null, 2);
}
export function resultUrl(output: Output): string | undefined {
	if (output.kind !== 'available' || typeof output.value !== 'string') return undefined;
	try {
		const url = new URL(output.value);
		return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
			? url.href
			: undefined;
	} catch {
		return undefined;
	}
}
export function parseInput(input: string): unknown {
	if (input.trim() === '') return undefined;
	if (Buffer.byteLength(input) > 100000) throw new Error('Input must be smaller than 100 KB.');
	try {
		return JSON.parse(input);
	} catch {
		throw new Error('Enter valid JSON, or leave the input empty.');
	}
}
export class WheneverClient {
	private token: () => Promise<string>;
	private fetcher: typeof fetch;
	private sequence = 0;
	constructor(token: () => Promise<string>, fetcher: typeof fetch = fetch) {
		this.token = token;
		this.fetcher = fetcher;
	}
	private async call(name: string, args: Record<string, unknown> = {}) {
		return this.send(await this.token(), name, args);
	}
	private async send(
		token: string,
		name: string,
		args: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		const id = ++this.sequence;
		const response = await postJson(
			this.fetcher,
			MCP_URL,
			{ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } },
			{
				Authorization: `Bearer ${token}`,
				Accept: 'application/json, text/event-stream',
				'MCP-Protocol-Version': '2025-03-26',
			},
		);
		if (response.status === 401) throw new SignInRequired();
		if (!response.ok) {
			const message = `Whenever request failed (HTTP ${response.status}).`;
			if (response.status >= 400 && response.status < 500 && response.status !== 408)
				throw new RequestRefused(message);
			throw new Error(message);
		}
		const reply = data(await response.json());
		if (reply.jsonrpc !== '2.0' || reply.id !== id || reply.error !== undefined) invalid();
		const result = data(reply.result);
		const payload = data(data(result.structuredContent).result);
		if (result.isError === true)
			throw new RequestRefused(
				typeof payload.message === 'string'
					? payload.message.slice(0, 4000)
					: 'Whenever refused this request. Check the workflow setup in Whenever.',
				payload,
			);
		return payload;
	}
	async workflows() {
		const result = await this.call('list_workflows');
		return {
			workflows: array(result.workflows).map(workflow),
			completeness: completeness(result.completeness),
		};
	}
	async profile(): Promise<Profile> {
		const result = await this.call('get_current_user');
		if (result.isLoggedIn === false) throw new SignInRequired();
		return {
			name:
				typeof result.displayName === 'string' ? result.displayName : 'Connected Whenever account',
			...(typeof result.email === 'string' ? { email: result.email } : {}),
		};
	}
	async workflow(id: string) {
		const result = await this.call('get_workflow', { workflow_id: id });
		const item = workflow(result.workflow);
		if (item.id !== id) invalid();
		const source = data(result.source);
		return {
			workflow: item,
			version: source.latestVersion === null ? undefined : integer(source.latestVersion),
			deployedVersion: published(integer(source.deployedVersion)),
			savedAt: typeof source.savedAt === 'string' && source.savedAt ? source.savedAt : undefined,
			integrations: Array.isArray(source.requiredIntegrationIds)
				? source.requiredIntegrationIds.map(text)
				: [],
			usesInput: source.usesInput === undefined ? undefined : flag(source.usesInput),
			triggers: source.triggers === undefined ? undefined : array(source.triggers).map(trigger),
		};
	}
	async runs(workflowId: string) {
		const result = await this.call('list_runs', { workflow_id: workflowId });
		const runs = array(result.runs).map(run);
		if (runs.some((item) => item.workflowId !== workflowId)) invalid();
		return { runs, completeness: completeness(result.completeness) };
	}
	async start(request: Start) {
		const token = await this.token();
		// The run id is chosen before dispatch. A lost answer never authorizes a second launch.
		try {
			const result = await this.send(token, 'run_workflow_manual', {
				workflow_id: request.workflowId,
				expected_version: request.version,
				run_id: request.runId,
				confirm_external_side_effects: true,
				...(request.input === undefined ? {} : { input: request.input }),
				...(request.triggerKey ? { trigger_key: request.triggerKey } : {}),
			});
			if (
				result.runId !== request.runId ||
				result.workflowId !== request.workflowId ||
				result.version !== request.version
			)
				throw new LaunchUncertain(request.runId);
			return { runId: request.runId, launchState: oneOf(result.launchState, LAUNCHED_STATES) };
		} catch (error) {
			if (error instanceof SignInRequired) throw error;
			if (error instanceof RequestRefused && error.payload.status !== 'launch_uncertain')
				throw error;
			throw new LaunchUncertain(request.runId);
		}
	}
	async run(runId: string, afterSeq: number): Promise<RunPage> {
		const result = await this.call('get_run', { run_id: runId, after_seq: afterSeq, limit: 100 });
		const summary = run(result.run);
		const nextSeq = integer(result.nextSeq);
		if (
			summary.runId !== runId ||
			nextSeq < afterSeq ||
			typeof result.truncated !== 'boolean' ||
			(result.truncated && nextSeq === afterSeq) ||
			(result.observationComplete !== undefined && typeof result.observationComplete !== 'boolean')
		)
			invalid('run page or cursor');
		const raw = array(result.events);
		if (raw.length > 100) invalid();
		let previous = afterSeq === 0 ? -1 : afterSeq;
		let output: Output = { kind: 'not-observed' };
		const events = raw.map((value) => {
			const item = data(value);
			const event = runEvent(item, runId);
			if (item.runId !== runId || event.seq <= previous || event.seq > nextSeq)
				invalid('event identity or order');
			previous = event.seq;
			if (event.type === 'run_succeeded') {
				if (output.kind !== 'not-observed') invalid();
				output = succeededOutput(item);
			}
			return event;
		});
		return {
			run: summary,
			events,
			nextSeq,
			truncated: result.truncated,
			complete:
				summary.status !== 'running' && result.observationComplete !== false && !result.truncated,
			output,
		};
	}
}
