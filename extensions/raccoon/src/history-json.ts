import { expectObject } from "./json-out.ts";

/**
 * `rcc history --json`.
 *
 * Only the first word of each recent command: the rest is arguments, and
 * arguments are where paths and secrets live.
 */
export type HistoryReport = {
	counts: { zsh: number; bash: number; fish: number; total: number };
	recent: string[];
};

const num = (v: unknown) => (typeof v === "number" ? v : 0);

export function parseHistory(stdout: string): HistoryReport {
	const r = expectObject(stdout, "history");
	const c = (r.counts ?? {}) as Record<string, unknown>;
	return {
		counts: {
			zsh: num(c.zsh),
			bash: num(c.bash),
			fish: num(c.fish),
			total: num(c.total),
		},
		recent: Array.isArray(r.recent)
			? r.recent.filter((x): x is string => typeof x === "string")
			: [],
	};
}

/** A shell with no history is not a shell you use. */
export function used(count: number): boolean {
	return count > 0;
}
