import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * The audits already run on this machine.
 *
 * `rcc audit history` prints the last ten as coloured text it builds by
 * grepping its own files. There is no reason to read that back: the files are
 * JSON, with the same shape as a fresh report, so this reads them directly. No
 * subprocess, nothing to wait for, and the whole archive rather than ten.
 */

export const HISTORY_DIR = join(homedir(), ".raccoon", "audit-history");

/** `audit_2026-09-02_01:32:46.json` */
const FILE = /^audit_(.+)\.json$/;

export type PastAudit = {
	/** The stamp rcc wrote, `2026-09-02_01:32:46`. */
	stamp: string;
	/** That stamp as a date, or undefined when it is not one this can read. */
	at?: Date;
	pass: number;
	warning: number;
	fail: number;
	deep: boolean;
	file: string;
};

/**
 * rcc writes `2026-09-02_01:32:46`: an ISO date, an underscore, a clock.
 * `Date.parse` does not accept that, and a wrong date shown confidently is
 * worse than no date, so a stamp that does not fit the shape stays a string.
 */
export function stampToDate(stamp: string): Date | undefined {
	const match = /^(\d{4}-\d{2}-\d{2})_(\d{2}):(\d{2}):(\d{2})$/.exec(stamp);
	if (!match) return undefined;
	const [, day, hour, minute, second] = match;
	const at = new Date(`${day}T${hour}:${minute}:${second}`);
	return Number.isNaN(at.getTime()) ? undefined : at;
}

/** One run, from the JSON rcc saved for it. */
export function summarise(
	file: string,
	contents: string,
): PastAudit | undefined {
	const stamp = FILE.exec(file)?.[1];
	if (!stamp) return undefined;
	let parsed: unknown;
	try {
		parsed = JSON.parse(contents);
	} catch {
		// A run cut short leaves a half-written file. One unreadable run must
		// not take the rest of the archive down with it.
		return undefined;
	}
	if (typeof parsed !== "object" || parsed === null) return undefined;
	const run = parsed as Record<string, unknown>;
	const count = (key: string): number =>
		typeof run[key] === "number" ? (run[key] as number) : 0;
	return {
		stamp: typeof run.timestamp === "string" ? run.timestamp : stamp,
		at: stampToDate(stamp),
		pass: count("pass"),
		warning: count("warning"),
		fail: count("fail"),
		deep: run.deep === true,
		file,
	};
}

/** Newest first, which is the order anyone asks this question in. */
export function newestFirst(a: PastAudit, b: PastAudit): number {
	return b.stamp.localeCompare(a.stamp);
}

/** Every run rcc has kept, or an empty list on a machine that has none. */
export async function readHistory(
	dir: string = HISTORY_DIR,
): Promise<PastAudit[]> {
	let names: string[];
	try {
		names = await readdir(dir);
	} catch (error) {
		// No audit has ever been run here. That is an answer, not a failure.
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw error;
	}
	const runs = await Promise.all(
		names
			.filter((name) => FILE.test(name))
			.map(async (name) => {
				try {
					return summarise(
						name,
						await readFile(join(dir, name), "utf8"),
					);
				} catch {
					return undefined;
				}
			}),
	);
	return runs
		.filter((run): run is PastAudit => run !== undefined)
		.sort(newestFirst);
}
