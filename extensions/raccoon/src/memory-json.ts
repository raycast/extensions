import { expectArray } from "./json-out.ts";

/**
 * `rcc memory --json`, read as rows.
 *
 * The JSON is the process list and nothing else: memory pressure, swap and the
 * compressor are in the text output only. What is here is what the CLI offers.
 */

export type MemoryProcess = {
	pid: number;
	/** Kilobytes. `ps aux` reports RSS in KB, and bin/memory.sh passes it through. */
	rss: number;
	command: string;
};

export type Weight = "light" | "heavy" | "huge";

export function parseMemory(stdout: string): MemoryProcess[] {
	return expectArray(stdout, "memory").map((value, index) => {
		const p = value as Record<string, unknown>;
		if (
			typeof p?.pid !== "number" ||
			typeof p?.rss !== "number" ||
			typeof p?.command !== "string"
		) {
			throw new Error(
				`Process ${index + 1} is not shaped like a process.`,
			);
		}
		return { pid: p.pid, rss: p.rss, command: p.command };
	});
}

/** KB to whole megabytes, the unit the table shows. */
export function megabytes(rssKb: number): number {
	return Math.round(rssKb / 1024);
}

/**
 * How much of the machine one process is holding.
 *
 * A gigabyte is where a single process is worth knowing about on any Mac, and
 * half of one is where a browser tab stops being ordinary.
 */
export function weight(rssKb: number): Weight {
	const mb = megabytes(rssKb);
	if (mb >= 1024) return "huge";
	if (mb >= 512) return "heavy";
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
