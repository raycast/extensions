import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * One argument, safe inside a /bin/sh command line. Check names carry spaces
 * and dots (".ssh Permissions"), and they arrive from the CLI's own JSON, so
 * they are quoted rather than trusted.
 */
export function shellQuote(argument: string): string {
	return `'${argument.replace(/'/g, `'\\''`)}'`;
}

/** One string literal, safe inside an AppleScript source. */
export function appleScriptQuote(text: string): string {
	return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * The command a fix runs in Terminal.
 *
 * `sudo` is not prepended: rcc asks for the rights it needs at the point it
 * needs them, and a blanket sudo would run the checks as root as well.
 */
export function fixCommand(rcc: string, checkNames: string[]): string {
	if (checkNames.length === 0) throw new Error("No check to fix.");
	// One comma-separated list rather than one run per check: an audit takes
	// about eight seconds, and fixing what is on screen would otherwise mean
	// running it once per row. No check name contains a comma.
	return [
		shellQuote(rcc),
		"audit",
		"--fix",
		"--force",
		"--fix-only",
		shellQuote(checkNames.join(",")),
	].join(" ");
}

/**
 * Whether this rcc understands --fix-only.
 *
 * Not a nicety: rcc 0.16.0 and earlier ignore an unknown flag rather than
 * refusing it, so `--fix --force --fix-only "Stealth Mode"` applies every fix
 * on the machine. Measured: seven fixes offered instead of one. A caller that
 * cannot narrow the fix must not run it at all.
 */
export async function supportsFixOnly(rcc: string): Promise<boolean> {
	try {
		const { stdout } = await run(rcc, ["audit", "--help"], {
			timeout: 15_000,
		});
		return stdout.includes("--fix-only");
	} catch {
		return false;
	}
}

/**
 * Run a command in Terminal.app.
 *
 * A terminal rather than a pane inside Raycast because a fix needs
 * administrator rights, and there is no tty behind a Raycast view for sudo to
 * prompt on: Touch ID and the password prompt only exist here.
 */
export async function runInTerminal(command: string): Promise<void> {
	const script = [
		'tell application "Terminal"',
		`  do script ${appleScriptQuote(command)}`,
		"  activate",
		"end tell",
	].join("\n");
	await run("/usr/bin/osascript", ["-e", script], { timeout: 15_000 });
}
