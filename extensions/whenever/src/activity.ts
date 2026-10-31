import { LaunchUncertain, type Start, type WheneverClient } from './api.ts';
import { serialized } from './serialized.ts';
export type RememberedRun = {
	runId: string;
	workflowId: string;
	version: number;
	pending: boolean;
};
export type ActivityData = { runs: RememberedRun[] };
type Storage = {
	get(key: string): Promise<string | undefined>;
	set(key: string, value: string): Promise<void>;
	remove(key: string): Promise<void>;
};
export class Activity {
	private storage: Storage;
	private key: string;
	private writes = serialized();
	constructor(storage: Storage, session: string) {
		this.storage = storage;
		this.key = `activity:${session}`;
	}
	async read(): Promise<ActivityData> {
		const raw = await this.storage.get(this.key);
		if (raw === undefined) return { runs: [] };
		const { runs = [] }: Partial<ActivityData> = JSON.parse(raw);
		return { runs };
	}
	private update(change: (state: ActivityData) => ActivityData) {
		return this.writes(async () => {
			const state = change(await this.read());
			await this.storage.set(this.key, JSON.stringify(state));
			return state;
		});
	}
	clear() {
		return this.writes(() => this.storage.remove(this.key));
	}
	async rememberRun(run: RememberedRun) {
		return this.update((state) => ({
			runs: [run, ...state.runs.filter((item) => item.runId !== run.runId)].filter(
				(entry, index) => entry.pending || index < 50,
			),
		}));
	}
	async observed(runId: string) {
		return this.update((state) => ({
			runs: state.runs.map((run) => (run.runId === runId ? { ...run, pending: false } : run)),
		}));
	}
}
export async function launchRun(
	client: Pick<WheneverClient, 'start'>,
	activity: Activity,
	request: Start,
) {
	const pending = (await activity.read()).runs.find(
		(run) => run.workflowId === request.workflowId && run.pending,
	);
	const attempt = pending ? { ...request, runId: pending.runId } : request;
	await activity.rememberRun({
		runId: attempt.runId,
		workflowId: attempt.workflowId,
		version: attempt.version,
		pending: true,
	});
	let result;
	try {
		result = await client.start(attempt);
	} catch (error) {
		if (!pending && !(error instanceof LaunchUncertain)) await activity.observed(attempt.runId);
		throw error;
	}
	try {
		await activity.observed(attempt.runId);
	} catch {
		throw new LaunchUncertain(attempt.runId);
	}
	return result;
}
