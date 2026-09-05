import { expectObject } from "./json-out.ts";

/**
 * `rcc startup --json`.
 *
 * The question is what this Mac starts on its own, so the lists a person can
 * act on come first and the counts they cannot are a footer.
 */
export type UserAgent = {
	/** launchd's label, what `launchctl bootout` takes. Empty from an rcc older than 0.19. */
	label: string;
	/** The name a person recognises: "mailbrief" for com.eugenio.mailbrief.plist. */
	name: string;
	file: string;
	/** Whether launchd loaded this plist, rather than none or another with the same label. */
	loaded: boolean;
	loaded_from: string;
};

/** A service launchd runs that no plist in ~/Library or /Library explains. */
export type BackgroundItem = {
	label: string;
	pid: number | null;
};

export type StartupReport = {
	user_agents: UserAgent[];
	background_items: BackgroundItem[];
	login_items: string[];
	/** Login items whose target no longer exists: listed, and nothing opens. */
	login_items_missing: string[];
	/** Why login items could not be read, or empty. Not the same as none. */
	login_items_error: string;
	counts: {
		system_agents: number;
		/** null from an rcc that did not say. */
		system_agents_loaded: number | null;
		daemons: number;
		/** Services with a process right now. Older rcc counted every loaded one here. */
		running_services: number;
		loaded_services: number | null;
	};
	uptime: string;
	load: string;
};

const num = (v: unknown) => (typeof v === "number" ? v : 0);
const numOrNull = (v: unknown) => (typeof v === "number" ? v : null);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const strs = (v: unknown) =>
	Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** An rcc before 0.19 listed agents by short name only; there is no label to stop them by. */
function agent(v: unknown): UserAgent | null {
	if (typeof v === "string") {
		return { label: "", name: v, file: "", loaded: true, loaded_from: "" };
	}
	if (typeof v !== "object" || v === null) return null;
	const a = v as Record<string, unknown>;
	return {
		label: str(a.label),
		name: str(a.name) || str(a.label),
		file: str(a.file),
		loaded: a.loaded === true,
		loaded_from: str(a.loaded_from),
	};
}

export function parseStartup(stdout: string): StartupReport {
	const r = expectObject(stdout, "startup");
	const c = (r.counts ?? {}) as Record<string, unknown>;
	return {
		user_agents: Array.isArray(r.user_agents)
			? r.user_agents.map(agent).filter((a): a is UserAgent => a !== null)
			: [],
		background_items: Array.isArray(r.background_items)
			? r.background_items.flatMap((v) => {
					const b = (v ?? {}) as Record<string, unknown>;
					return typeof b.label === "string"
						? [{ label: b.label, pid: numOrNull(b.pid) }]
						: [];
				})
			: [],
		login_items: strs(r.login_items),
		login_items_missing: strs(r.login_items_missing),
		login_items_error: str(r.login_items_error),
		counts: {
			system_agents: num(c.system_agents),
			system_agents_loaded: numOrNull(c.system_agents_loaded),
			daemons: num(c.daemons),
			running_services: num(c.running_services),
			loaded_services: numOrNull(c.loaded_services),
		},
		uptime: str(r.uptime),
		load: str(r.load),
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
