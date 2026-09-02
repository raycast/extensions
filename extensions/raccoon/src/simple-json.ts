import { expectArray, expectObject } from "./json-out.ts";

/**
 * Small readers for the commands whose --json is a shape of its own.
 *
 * Each one checks rather than casts: a missing field must be named here, not
 * rendered as "undefined" three screens later.
 */

export type TrashReport = { path: string; size: string; count: number };

export function parseTrash(stdout: string): TrashReport {
	const r = expectObject(stdout, "trash");
	return {
		path: typeof r.path === "string" ? r.path : "",
		size: typeof r.size === "string" ? r.size : "0",
		count: typeof r.count === "number" ? r.count : 0,
	};
}

export type WifiReport = {
	interface: string;
	active_ssid: string;
	known_networks: string[];
	passwords: Record<string, string>;
};

export function parseWifi(stdout: string): WifiReport {
	const r = expectObject(stdout, "wifi");
	return {
		interface: typeof r.interface === "string" ? r.interface : "",
		active_ssid: typeof r.active_ssid === "string" ? r.active_ssid : "",
		known_networks: Array.isArray(r.known_networks)
			? r.known_networks.filter((n): n is string => typeof n === "string")
			: [],
		passwords:
			typeof r.passwords === "object" && r.passwords !== null
				? (r.passwords as Record<string, string>)
				: {},
	};
}

export type PathEntry = {
	name: string;
	path: string;
	resolved: string;
	manager: string;
};

export function parseOverlap(stdout: string): PathEntry[] {
	return expectArray(stdout, "overlap").map((value, index) => {
		const e = value as Record<string, unknown>;
		if (typeof e?.name !== "string" || typeof e?.manager !== "string") {
			throw new Error(
				`Entry ${index + 1} is not shaped like a PATH entry.`,
			);
		}
		return {
			name: e.name,
			path: typeof e.path === "string" ? e.path : "",
			resolved: typeof e.resolved === "string" ? e.resolved : "",
			manager: e.manager,
		};
	});
}

/**
 * One row per name, not per PATH entry.
 *
 * The command answers "which names come from more than one manager", so the
 * unit is the name: a name provided twice is one row carrying two managers,
 * not two rows a reader has to notice are the same word. Which copy actually
 * runs is decided by PATH order, so the first entry is the winner and the
 * rest are shadowed.
 */
export type NameGroup = {
	name: string;
	/** In PATH order. The first one is the copy that runs. */
	entries: PathEntry[];
	/** Distinct managers, in the order they appear on the PATH. */
	managers: string[];
};

export function groupByName(entries: PathEntry[]): NameGroup[] {
	const groups = new Map<string, PathEntry[]>();
	for (const entry of entries) {
		const existing = groups.get(entry.name);
		if (existing) existing.push(entry);
		else groups.set(entry.name, [entry]);
	}
	return [...groups.entries()].map(([name, list]) => ({
		name,
		entries: list,
		managers: [...new Set(list.map((e) => e.manager))],
	}));
}

/**
 * How much a name is worth looking at. Two managers is a clash worth knowing;
 * three or more is a mess, and gets the colour that says so.
 */
export function clashLevel(group: NameGroup): "single" | "double" | "worse" {
	if (group.entries.length >= 3) return "worse";
	if (group.entries.length === 2) return "double";
	return "single";
}

/** Worst first, then alphabetical: the reason to open this is at the top. */
export function byClash(a: NameGroup, b: NameGroup): number {
	const rank = b.entries.length - a.entries.length;
	return rank !== 0 ? rank : a.name.localeCompare(b.name);
}
