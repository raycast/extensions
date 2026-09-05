import { expectArray, expectObject, extractJson } from "./json-out.ts";

/**
 * `rcc memory --json`.
 *
 * Two things: what the machine as a whole is holding, and which processes
 * cost the most. Cost is physical footprint — compressed pages included —
 * because that is what a Mac pays for a process. An rcc before 0.19 ranked by
 * RSS, which leaves compressed memory out: the process costing 23 GB on one
 * Mac had 110 MB of RSS and never made the top ten.
 */

export type MemoryProcess = {
	pid: number;
	/** Kilobytes of physical footprint, compressed pages included. */
	footprint_kb: number;
	/** Kilobytes resident. What `ps` calls RSS. */
	rss_kb: number;
	command: string;
};

export type MachineMemory = {
	total_mb: number;
	used_mb: number;
	wired_mb: number;
	active_mb: number;
	cached_mb: number;
	compressed_mb: number;
	swap_total_mb: number;
	swap_used_mb: number;
	swap_free_mb: number;
};

export type MemoryReport = {
	/** null from an rcc that reported the process list alone. */
	memory: MachineMemory | null;
	processes: MemoryProcess[];
};

export type Weight = "light" | "heavy" | "huge";

const num = (v: unknown) => (typeof v === "number" ? v : 0);

function process(value: unknown, index: number): MemoryProcess {
	const p = value as Record<string, unknown>;
	if (typeof p?.pid !== "number" || typeof p?.command !== "string") {
		throw new Error(`Process ${index + 1} is not shaped like a process.`);
	}
	// footprint_kb arrived in 0.19; before it the only figure was rss.
	const rss = num(p.rss_kb ?? p.rss);
	const footprint = typeof p.footprint_kb === "number" ? p.footprint_kb : rss;
	return {
		pid: p.pid,
		footprint_kb: footprint,
		rss_kb: rss,
		command: p.command,
	};
}

export function parseMemory(stdout: string): MemoryReport {
	const raw = extractJson(stdout, "memory");
	if (Array.isArray(raw)) {
		return {
			memory: null,
			processes: expectArray(stdout, "memory").map(process),
		};
	}
	const r = expectObject(stdout, "memory");
	const m = (r.memory ?? null) as Record<string, unknown> | null;
	return {
		memory: m
			? {
					total_mb: num(m.total_mb),
					used_mb: num(m.used_mb),
					wired_mb: num(m.wired_mb),
					active_mb: num(m.active_mb),
					cached_mb: num(m.cached_mb),
					compressed_mb: num(m.compressed_mb),
					swap_total_mb: num(m.swap_total_mb),
					swap_used_mb: num(m.swap_used_mb),
					swap_free_mb: num(m.swap_free_mb),
				}
			: null,
		processes: Array.isArray(r.processes) ? r.processes.map(process) : [],
	};
}

/** KB to whole megabytes, the unit the table shows. */
export function megabytes(kb: number): number {
	return Math.round(kb / 1024);
}

/** Megabytes to gigabytes with one decimal, for the machine-wide figures. */
export function gigabytes(mb: number): string {
	return (mb / 1024).toFixed(1);
}

/**
 * How much of the machine one process is holding.
 *
 * A gigabyte is where a single process is worth knowing about on any Mac, and
 * half of one is where a browser tab stops being ordinary.
 */
export function weight(kb: number): Weight {
	const mb = megabytes(kb);
	if (mb >= 1024) return "huge";
	if (mb >= 512) return "heavy";
	return "light";
}

/**
 * Whether the machine is short of memory. Swap in use means it already ran
 * out once; a compressor holding more than a quarter of RAM means it is
 * spending CPU to pretend it has not.
 */
export function pressure(m: MachineMemory): Weight {
	if (m.swap_used_mb > 1024 || m.compressed_mb > m.total_mb / 4)
		return "huge";
	if (m.swap_used_mb > 0 || m.compressed_mb > m.total_mb / 8) return "heavy";
	return "light";
}

/**
 * The name worth reading. `ps` reports the executable path, and the last
 * component is what a person recognises: the full path pushes it off screen
 * and repeats /Applications/... on every row.
 */
export function displayName(command: string): string {
	const base = command.split("/").filter(Boolean).pop();
	return base && base !== "" ? base : command;
}
