import { execFile } from "node:child_process";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const SUDOERS_PATH = "/etc/sudoers.d/raccoon";

/** Minutes a single authentication stays valid; -1 never expires. */
export type SudoSession = "60" | "-1";

export const SESSION_LABELS: Record<SudoSession, string> = {
	"60": "expires after 60 minutes",
	"-1": "until restart",
};

/**
 * sudoers usernames are unquoted tokens. Only ever interpolate a name that
 * cannot introduce another directive.
 */
const SAFE_USERNAME = /^[a-z_][a-z0-9_-]*$/;

export function isValidUsername(name: string): boolean {
	return SAFE_USERNAME.test(name);
}

/**
 * Without this drop-in, sudo scopes its time stamp to the process tree whenever
 * there is no controlling terminal - and Raycast spawns a fresh process per
 * command, so every privileged run authenticates again. `timestamp_type=global`
 * keys the record to the user instead, so one Touch ID covers them all.
 */
export function buildDropIn(username: string, session: SudoSession): string {
	if (!isValidUsername(username)) throw new Error(`Refusing to write sudoers for username: ${username}`);
	return [
		"# Installed by the Raccoon Raycast extension.",
		"#",
		"# Without this, sudo ties its time stamp to the process tree when there is no",
		"# terminal, so every Raccoon command asks for Touch ID again. This makes one",
		`# authentication cover them all (${SESSION_LABELS[session]}).`,
		"#",
		`# Remove with: sudo rm ${SUDOERS_PATH}`,
		`Defaults:${username} timestamp_type=global`,
		`Defaults:${username} timestamp_timeout=${session}`,
		"",
	].join("\n");
}

export function currentUsername(): string {
	return userInfo().username;
}

/** The drop-in is 0440 root:wheel, so existence is all a normal user can read. */
export async function isInstalled(): Promise<boolean> {
	try {
		await access(SUDOERS_PATH);
		return true;
	} catch {
		return false;
	}
}

/**
 * How a command is run. Injectable for one reason: what matters here is not
 * that a process started but WHICH one, with which arguments, in which order -
 * `visudo -c` before anything is asked of root, and the drop-in installed 0440
 * root:wheel rather than with whatever bits the staged file happened to have.
 * A test can hold that to account without ever running sudo.
 */
export type Run = (file: string, args: string[]) => Promise<unknown>;

const execute: Run = (file, args) => execFileAsync(file, args);

/**
 * Write the drop-in, but only after `visudo -c` accepts it. A malformed file in
 * /etc/sudoers.d breaks sudo for the whole machine, so it is validated as the
 * unprivileged user first and only the final install step runs as root.
 */
export async function install(session: SudoSession, run: Run = execute): Promise<void> {
	const dir = await mkdtemp(join(tmpdir(), "raccoon-sudoers-"));
	const staged = join(dir, "raccoon");
	try {
		await writeFile(staged, buildDropIn(currentUsername(), session), {
			mode: 0o440,
		});
		await run("/usr/sbin/visudo", ["-c", "-f", staged]);
		await run("/usr/bin/sudo", [
			"/usr/bin/install",
			"-m",
			"0440",
			"-o",
			"root",
			"-g",
			"wheel",
			staged,
			SUDOERS_PATH,
		]);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

export async function uninstall(run: Run = execute): Promise<void> {
	await run("/usr/bin/sudo", ["/bin/rm", "-f", SUDOERS_PATH]);
}
