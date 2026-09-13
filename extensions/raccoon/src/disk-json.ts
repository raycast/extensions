import { expectObject } from "./json-out.ts";

/**
 * `rcc disk --json`.
 *
 * The question is whether a volume is about to fill up. The text report
 * answers it twice, in two tables: one with used and free, another with the
 * percentage for the same mounts.
 */
export type PhysicalDisk = {
	id: string;
	type: string;
	size: string;
	mount: string;
	smart: string;
};

export type Volume = {
	name: string;
	mount: string;
	used: string;
	free: string;
	percent: string;
};

export type DiskReport = {
	disks: PhysicalDisk[];
	volumes: Volume[];
	apfs_container: { reference: string; size: string; free: string };
	network_mounts: Array<{ source: string; mount: string }>;
	/**
	 * Local APFS snapshots, which hold blocks belonging to deleted files.
	 *
	 * `available` is not decoration: without diskutil on PATH rcc cannot look,
	 * and a count of 0 would then mean "none found" and "could not check" at
	 * once — on a disk that is full because of them, those are opposite
	 * answers. An rcc older than this field reports nothing, which reads the
	 * same as not having checked, which is what it did.
	 */
	snapshots: {
		available: boolean;
		count: number;
		reclaimable: number;
		oldest: string;
	};
};

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : 0);

export function parseDisk(stdout: string): DiskReport {
	const r = expectObject(stdout, "disk");
	const c = (r.apfs_container ?? {}) as Record<string, unknown>;
	const snap = (r.snapshots ?? {}) as Record<string, unknown>;
	return {
		disks: Array.isArray(r.disks)
			? r.disks.map((v) => {
					const d = (v ?? {}) as Record<string, unknown>;
					return {
						id: str(d.id),
						type: str(d.type),
						size: str(d.size),
						mount: str(d.mount),
						smart: str(d.smart),
					};
				})
			: [],
		volumes: Array.isArray(r.volumes)
			? r.volumes.map((v) => {
					const x = (v ?? {}) as Record<string, unknown>;
					return {
						name: str(x.name),
						mount: str(x.mount),
						used: str(x.used),
						free: str(x.free),
						percent: str(x.percent),
					};
				})
			: [],
		apfs_container: {
			reference: str(c.reference),
			size: str(c.size),
			free: str(c.free),
		},
		snapshots: {
			available: snap.available === true,
			count: num(snap.count),
			reclaimable: num(snap.reclaimable),
			oldest: str(snap.oldest),
		},
		network_mounts: Array.isArray(r.network_mounts)
			? r.network_mounts.map((v) => {
					const n = (v ?? {}) as Record<string, unknown>;
					return { source: str(n.source), mount: str(n.mount) };
				})
			: [],
	};
}

/** "86%" as a number, or null when df said nothing useful. */
export function fillPercent(percent: string): number | null {
	const value = Number(percent.replace("%", "").trim());
	return Number.isFinite(value) && percent.trim() !== "" ? value : null;
}

/**
 * 75% is where a Mac starts behaving differently, and 90% is where APFS runs
 * out of room to do its own work.
 */
export function fillLevel(percent: string): "ok" | "tight" | "full" {
	const value = fillPercent(percent);
	if (value === null) return "ok";
	if (value >= 90) return "full";
	if (value >= 75) return "tight";
	return "ok";
}

/** SMART says Verified, Failing, or nothing this disk supports. */
export function smartLevel(smart: string): "ok" | "failing" | "unknown" {
	if (smart === "Verified") return "ok";
	if (smart.toLowerCase().includes("fail")) return "failing";
	return "unknown";
}
