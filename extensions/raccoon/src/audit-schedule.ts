import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type Frequency = "daily" | "weekly" | "monthly";

/** The plist `rcc audit --schedule` writes, and the label launchd knows it by. */
export const SCHEDULE_PLIST = join(homedir(), "Library", "LaunchAgents", "com.raccoon.audit.plist");
const SCHEDULE_LABEL = "com.raccoon.audit";

/**
 * The frequency a schedule plist encodes: a Weekday key is weekly, a Day key
 * is monthly, and an interval with neither is daily — the same three shapes
 * rcc writes, read the same way its `schedule status` reads them.
 */
export function frequencyOf(plist: string): Frequency {
	if (/<key>Weekday<\/key>/.test(plist)) return "weekly";
	if (/<key>Day<\/key>/.test(plist)) return "monthly";
	return "daily";
}

/**
 * What is scheduled, read from the plist and from launchd directly.
 *
 * Not `rcc audit schedule status`: an rcc up to 1.0.0 asks for administrator
 * rights before it looks, so opening the screen put a password dialog on the
 * screen. Reading a file and asking launchd about one label needs nothing.
 */
export async function readSchedule(): Promise<Frequency | undefined> {
	let plist: string;
	try {
		plist = await readFile(SCHEDULE_PLIST, "utf8");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
		throw error;
	}
	try {
		await execFileAsync("/bin/launchctl", ["print", `gui/${process.getuid?.() ?? 501}/${SCHEDULE_LABEL}`]);
	} catch {
		// The file is there but launchd does not run it: not scheduled.
		return undefined;
	}
	return frequencyOf(plist);
}

/** The frequency as an action names it: Raycast titles actions in Title Case. */
export const HOW_OFTEN: Record<Frequency, string> = {
	daily: "Daily",
	weekly: "Weekly",
	monthly: "Monthly",
};

/** When each frequency actually runs, in the words the screen uses. */
export const WHEN: Record<Frequency, string> = {
	daily: "Every day at 9:00",
	weekly: "Sundays at 9:00",
	monthly: "The 1st of each month at 9:00",
};

/**
 * What the screen says about the schedule it has.
 *
 * Three states, not two: readSchedule answers undefined for "no plist, or one
 * launchd does not run", and rejects for everything else - a permissions
 * problem, a file it could not open. Both used to render as "Not scheduled",
 * which states as fact the one thing that was not established.
 */
export function scheduleSection(active: Frequency | undefined, failed: boolean): { title: string; subtitle: string } {
	if (active) return { title: `Running ${active}`, subtitle: WHEN[active] };
	if (failed) return { title: "Could not be read", subtitle: "Whether an audit runs on its own is unknown" };
	return { title: "Not scheduled", subtitle: "No audit runs on its own" };
}
