import { expectObject } from "./json-out.ts";

/**
 * `rcc network --json`.
 *
 * Ten numbered sections asked ten questions. Three of them are the ones people
 * actually open this for: what address am I on, who resolves my names, and is
 * anything sitting between me and the network.
 */
export type Interface = {
	name: string;
	family: "inet" | "inet6";
	address: string;
	kind: string;
};

export type Vpn = { name: string; state: "connected" | "configured" };
export type Proxy = { name: string; value: string };

export type NetworkReport = {
	interfaces: Interface[];
	dns: string[];
	vpns: Vpn[];
	proxies: Proxy[];
	firewall: { application: string; pf: string };
	connections: number;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

export function parseNetwork(stdout: string): NetworkReport {
	const r = expectObject(stdout, "network");
	const f = (r.firewall ?? {}) as Record<string, unknown>;
	return {
		interfaces: Array.isArray(r.interfaces)
			? r.interfaces.map((v) => {
					const i = (v ?? {}) as Record<string, unknown>;
					return {
						name: str(i.name),
						family: i.family === "inet6" ? "inet6" : "inet",
						address: str(i.address),
						kind: str(i.kind),
					};
				})
			: [],
		dns: Array.isArray(r.dns)
			? r.dns.filter((d): d is string => typeof d === "string")
			: [],
		vpns: Array.isArray(r.vpns)
			? r.vpns.map((v) => {
					const x = (v ?? {}) as Record<string, unknown>;
					return {
						name: str(x.name),
						state:
							x.state === "connected"
								? "connected"
								: "configured",
					};
				})
			: [],
		proxies: Array.isArray(r.proxies)
			? r.proxies.map((v) => {
					const p = (v ?? {}) as Record<string, unknown>;
					return { name: str(p.name), value: str(p.value) };
				})
			: [],
		firewall: { application: str(f.application), pf: str(f.pf) },
		connections: typeof r.connections === "number" ? r.connections : 0,
	};
}

/**
 * The address someone means when they ask what theirs is: routable, not
 * loopback and not link-local.
 */
export function primaryAddress(n: NetworkReport): Interface | null {
	return (
		n.interfaces.find(
			(i) =>
				i.family === "inet" &&
				i.kind !== "Loopback" &&
				i.kind !== "LinkLocal",
		) ?? null
	);
}

/** Loopback is real but never the answer to "what is my address". */
export function isNoise(i: Interface): boolean {
	return i.kind === "Loopback" || i.kind === "LinkLocal";
}
