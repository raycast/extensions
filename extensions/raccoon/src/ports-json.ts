import { expectArray } from "./json-out.ts";

/**
 * `rcc ports --json`, read as rows.
 *
 * The interesting question about a port is not its number but whether anything
 * can reach it, so the row is coloured by where it listens rather than by the
 * protocol.
 */

export type Port = {
	port: string;
	proto: string;
	pid: number | null;
	user: string;
	process: string;
	address: string;
	state: string;
};

/** Reachable from another machine, only from this one, or nothing bound. */
export type Exposure = "exposed" | "local" | "idle";

export function parsePorts(stdout: string): Port[] {
	return expectArray(stdout, "ports").map((value, index) => {
		const p = value as Record<string, unknown>;
		const str = (key: string) =>
			typeof p?.[key] === "string" ? (p[key] as string) : "";
		if (typeof p !== "object" || p === null || str("port") === "") {
			throw new Error(`Port ${index + 1} is not shaped like a port.`);
		}
		return {
			port: str("port"),
			proto: str("proto"),
			pid: typeof p.pid === "number" ? p.pid : null,
			user: str("user"),
			process: str("process"),
			address: str("address"),
			state: str("state"),
		};
	});
}

/**
 * How far a port reaches.
 *
 * A wildcard address answers on every interface, so anything on the network
 * can knock: that is the row worth finding. Loopback answers only this Mac. A
 * socket with no port bound is neither.
 */
export function exposure(port: Port): Exposure {
	if (port.port === "*") return "idle";
	const address = port.address;
	if (address.startsWith("127.0.0.1") || address.startsWith("[::1]")) {
		return "local";
	}
	if (address.startsWith("*:")) return "exposed";
	// A concrete address that is not loopback is an interface with a route.
	return address === "" ? "idle" : "exposed";
}

/** Listening sockets first: an open door matters more than a conversation. */
export function byInterest(a: Port, b: Port): number {
	const rank = (p: Port) =>
		exposure(p) === "exposed" ? 0 : exposure(p) === "local" ? 1 : 2;
	const byRank = rank(a) - rank(b);
	if (byRank !== 0) return byRank;
	const numeric = Number(a.port) - Number(b.port);
	return Number.isNaN(numeric) ? a.port.localeCompare(b.port) : numeric;
}
