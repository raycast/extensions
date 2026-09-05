import { expectObject } from "./json-out.ts";

/**
 * `rcc xcode --json`.
 *
 * Two things are worth acting on: DerivedData, which is the largest thing
 * Xcode leaves behind and the only one safe to delete, and a simulator left
 * booted, which holds memory until someone shuts it down. The rest is what is
 * installed.
 */
export type Simulator = { name: string; booted: boolean };

export type XcodeReport = {
	installed: boolean;
	simulators: Simulator[];
	derived_data: { present: boolean; bytes: number; projects: number };
	platforms: string[];
	version: string | null;
	build: string | null;
};

const num = (v: unknown) => (typeof v === "number" ? v : 0);
const strOrNull = (v: unknown) =>
	typeof v === "string" && v !== "" ? v : null;

export function parseXcode(stdout: string): XcodeReport {
	const r = expectObject(stdout, "xcode");
	const d = (r.derived_data ?? {}) as Record<string, unknown>;
	return {
		installed: r.installed === true,
		simulators: Array.isArray(r.simulators)
			? r.simulators.map((v) => {
					const s = (v ?? {}) as Record<string, unknown>;
					return {
						name: typeof s.name === "string" ? s.name : "",
						booted: s.booted === true,
					};
				})
			: [],
		derived_data: {
			present: d.present === true,
			bytes: num(d.bytes),
			projects: num(d.projects),
		},
		platforms: Array.isArray(r.platforms)
			? r.platforms.filter((p): p is string => typeof p === "string")
			: [],
		version: strOrNull(r.version),
		build: strOrNull(r.build),
	};
}

/** Bytes as a person reads them. 0 stays "empty", not "0 B". */
export function humanBytes(bytes: number): string {
	if (bytes <= 0) return "empty";
	const units = ["B", "KB", "MB", "GB", "TB"];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/** A gigabyte of build cache is worth noticing; ten is worth clearing. */
export function derivedLevel(bytes: number): "empty" | "ok" | "large" {
	if (bytes <= 0) return "empty";
	if (bytes >= 10 * 1024 ** 3) return "large";
	return "ok";
}
