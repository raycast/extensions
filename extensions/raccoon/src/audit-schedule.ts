import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type Frequency = "daily" | "weekly" | "monthly";

/** The plist `rcc audit --schedule` writes, and the label launchd knows it by. */
export const SCHEDULE_PLIST = join(
	homedir(),
	"Library",
	"LaunchAgents",
	"com.raccoon.audit.plist",
);
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
		if ((error as NodeJS.ErrnoException).code === "ENOENT")
			return undefined;
		throw error;
	}
	try {
		await execFileAsync("/bin/launchctl", [
			"print",
			`gui/${process.getuid?.() ?? 501}/${SCHEDULE_LABEL}`,
		]);
	} catch {
		// The file is there but launchd does not run it: not scheduled.
		return undefined;
	}
	return frequencyOf(plist);
}
