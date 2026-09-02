import { expectObject } from "./json-out.ts";

/**
 * `rcc startup --json`.
 *
 * The question is what this Mac starts on its own, so the two lists a person
 * can act on come first and the counts they cannot are a footer.
 */
export type StartupReport = {
	user_agents: string[];
	login_items: string[];
	counts: {
		system_agents: number;
		daemons: number;
		running_services: number;
	};
	uptime: string;
	load: string;
};

const num = (v: unknown) => (typeof v === "number" ? v : 0);
const strs = (v: unknown) =>
	Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export function parseStartup(stdout: string): StartupReport {
	const r = expectObject(stdout, "startup");
	const c = (r.counts ?? {}) as Record<string, unknown>;
	return {
		user_agents: strs(r.user_agents),
		login_items: strs(r.login_items),
		counts: {
			system_agents: num(c.system_agents),
			daemons: num(c.daemons),
			running_services: num(c.running_services),
		},
		uptime: typeof r.uptime === "string" ? r.uptime : "",
		load: typeof r.load === "string" ? r.load : "",
	};
}

/**
 * The one-minute load average, which is the number that says whether the
 * machine is busy now rather than how it felt fifteen minutes ago.
 */
export function loadNow(load: string): number | null {
	const first = load.trim().split(/\s+/)[0];
	// Number("") is 0, not NaN, so an empty load would have read as an idle
	// machine and been coloured green. Unknown is not a measurement.
	if (first === "") return null;
	const value = Number(first);
	return Number.isFinite(value) ? value : null;
}
