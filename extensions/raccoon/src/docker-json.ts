import { expectObject } from "./json-out.ts";

/**
 * `rcc docker --json`.
 *
 * Absence is a value, not an error: a Mac without Docker reports
 * installed:false, and a Mac with the CLI but no daemon reports running:false.
 * The text report collapsed both into one line.
 */
export type DockerImage = { repository: string; tag: string; size: string };
export type DockerContainer = { id: string; image: string; status: string };
export type DockerVolume = { name: string; driver: string };
export type DockerSpace = { type: string; size: string; reclaimable: string };

export type DockerReport = {
	installed: boolean;
	running: boolean;
	images: DockerImage[];
	containers: DockerContainer[];
	volumes: DockerVolume[];
	space: DockerSpace[];
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

function list<T>(value: unknown, map: (r: Record<string, unknown>) => T): T[] {
	return Array.isArray(value)
		? value.map((v) => map((v ?? {}) as Record<string, unknown>))
		: [];
}

export function parseDocker(stdout: string): DockerReport {
	const r = expectObject(stdout, "docker");
	return {
		installed: r.installed === true,
		running: r.running === true,
		images: list(r.images, (i) => ({
			repository: str(i.repository),
			tag: str(i.tag),
			size: str(i.size),
		})),
		containers: list(r.containers, (c) => ({
			id: str(c.id),
			image: str(c.image),
			status: str(c.status),
		})),
		volumes: list(r.volumes, (v) => ({
			name: str(v.name),
			driver: str(v.driver),
		})),
		space: list(r.space, (s) => ({
			type: str(s.type),
			size: str(s.size),
			reclaimable: str(s.reclaimable),
		})),
	};
}

/** Running, stopped, or something that needs reading. */
export function containerState(status: string): "up" | "exited" | "other" {
	const s = status.toLowerCase();
	if (s.startsWith("up")) return "up";
	if (s.startsWith("exited")) return "exited";
	return "other";
}
