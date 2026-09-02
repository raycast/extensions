import { expectObject } from "./json-out.ts";

/**
 * `rcc backup --json`.
 *
 * One question: is this Mac backed up, and how long ago. Everything else is
 * detail hanging off the answer.
 */
export type BackupReport = {
	destination: { configured: boolean; name: string; kind: string };
	phase: string;
	running: boolean;
	last_backup: { date: string; hours_ago: number };
	exclusions: string[];
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

export function parseBackup(stdout: string): BackupReport {
	const r = expectObject(stdout, "backup");
	const d = (r.destination ?? {}) as Record<string, unknown>;
	const l = (r.last_backup ?? {}) as Record<string, unknown>;
	return {
		destination: {
			configured: d.configured === true,
			name: str(d.name),
			kind: str(d.kind),
		},
		phase: str(r.phase),
		running: r.running === true,
		last_backup: {
			date: str(l.date),
			// -1 means there has never been one, which is not the same as zero
			// hours ago.
			hours_ago: typeof l.hours_ago === "number" ? l.hours_ago : -1,
		},
		exclusions: Array.isArray(r.exclusions)
			? r.exclusions.filter((e): e is string => typeof e === "string")
			: [],
	};
}

export type BackupHealth = "never" | "fresh" | "late" | "overdue";

/**
 * A day is fine, a week is late, beyond that the backup is not protecting
 * anything you did recently.
 */
export function health(b: BackupReport): BackupHealth {
	const hours = b.last_backup.hours_ago;
	if (hours < 0) return "never";
	if (hours < 24) return "fresh";
	if (hours < 168) return "late";
	return "overdue";
}

/** Hours as something a person says out loud. */
export function humanAge(hours: number): string {
	if (hours < 0) return "never";
	if (hours < 1) return "just now";
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days} ${days === 1 ? "day" : "days"} ago`;
}
