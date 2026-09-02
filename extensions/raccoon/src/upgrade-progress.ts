/**
 * `rcc upgrade` as one row per package manager.
 *
 * The command walks eight or so managers in turn — brew, pip, npm, pnpm, bun,
 * uv, go, cargo — and narrates each step through `__RCC_PROGRESS__` markers.
 * Rendered as one growing block of text that is thirty lines of wall: you
 * cannot see which manager is working, which are finished, or which are not
 * even installed without reading all of it.
 *
 * The markers already carry the answer. Every one reads `<manager>: <state>`,
 * so the run regroups into a list that says at a glance where it is.
 *
 * `markdown.ts` reads the last marker to draw one bar; this reads all of them.
 */

const PROGRESS = /^__RCC_PROGRESS__:(\d+):(\d+):(.*)$/;

/** `brew: updating...` — the manager, and what it was doing. */
const STEP = /^([a-z][a-z0-9+-]*):\s*(.*)$/i;

export type ManagerState =
	"checking" | "updating" | "done" | "absent" | "unknown";

export type Manager = {
	name: string;
	/** What rcc last said it was doing. */
	state: ManagerState;
	/** The words rcc used, kept as it wrote them. */
	detail: string;
	/** Everything the manager itself printed while it held the floor. */
	log: string;
};

function stateOf(detail: string): ManagerState {
	const text = detail.toLowerCase();
	if (text.includes("not installed") || text.includes("not found")) {
		return "absent";
	}
	if (text.includes("up to date") || text.includes("up-to-date"))
		return "done";
	if (text.includes("updating") || text.includes("upgrading")) {
		return "updating";
	}
	if (text.includes("checking")) return "checking";
	return "unknown";
}

/**
 * The managers this run touched, in the order it reached them.
 *
 * A line that is not a marker belongs to whichever manager was current when it
 * was printed — that is what makes `changed 134 packages in 3s` npm's, rather
 * than a stray line at the bottom of the screen. Anything before the first
 * manager (rcc's own "Initializing...") belongs to none and is dropped.
 */
export function managersFrom(output: string): Manager[] {
	const order: string[] = [];
	const byName = new Map<string, Manager>();
	let current: Manager | undefined;

	for (const line of output.split("\n")) {
		const marker = PROGRESS.exec(line);
		if (!marker) {
			// A manager's own output, and only while one is speaking.
			if (current && line.trim() !== "") {
				current.log = current.log ? `${current.log}\n${line}` : line;
			}
			continue;
		}

		const step = STEP.exec(marker[3]);
		if (!step) continue; // "Initializing..." names no manager.

		const [, name, detail] = step;
		let manager = byName.get(name);
		if (!manager) {
			manager = { name, state: "unknown", detail: "", log: "" };
			byName.set(name, manager);
			order.push(name);
		}
		// The last word on a manager wins: "checking", then "updating", then
		// "up to date" is one manager moving, not three states to keep.
		manager.state = stateOf(detail);
		manager.detail = detail;
		current = manager;
	}

	return order.map((name) => {
		const manager = byName.get(name) as Manager;
		// rcc announces an absent manager on a plain line ("pnpm: not
		// installed"), never in a marker — the marker had already said
		// "checking...". Absence is an answer, not a step it stopped on.
		if (/not installed|not found/i.test(manager.log)) {
			manager.state = "absent";
		}
		return manager;
	});
}

/** Whether the run still has managers it has not finished. */
export function stillWorking(managers: Manager[]): boolean {
	return managers.some(
		(m) => m.state === "checking" || m.state === "updating",
	);
}
