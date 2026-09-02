import { shellQuote } from "./terminal.ts";

/**
 * The shell command behind Enter and Cmd+Enter, one builder per command that
 * has something to put right.
 *
 * These are here, apart from the views, because this is the part that must be
 * correct: a wrong argument kills the wrong process or forgets the wrong
 * network. Every one is a pure function over the values the CLI reported, every
 * value goes through shellQuote, and every one has a test.
 *
 * Where a command needs administrator rights it is written with a plain attempt
 * first and sudo as the fallback, so nothing asks for a password it does not
 * need. Terminal is where these run, so sudo has somewhere to prompt.
 */

const q = shellQuote;

/** `kill 123 456` — asks the processes to quit. Not -9: that skips cleanup. */
export function killPids(pids: number[]): string {
	const valid = pids.filter((p) => Number.isInteger(p) && p > 1);
	if (valid.length === 0) throw new Error("No process to quit.");
	return `kill ${valid.join(" ")}`;
}

/** Empty the Trash through Finder, so it behaves like emptying it by hand. */
export function emptyTrash(): string {
	return `osascript -e 'tell application "Finder" to empty trash'`;
}

/** Delete Xcode's build cache. The directory itself stays. */
export function clearDerivedData(): string {
	return `rm -rf ~/Library/Developer/Xcode/DerivedData/* && echo 'DerivedData cleared'`;
}

/** Shut every booted simulator down. simctl takes "all" for exactly this. */
export function shutdownSimulators(): string {
	return "xcrun simctl shutdown all";
}

/**
 * Remove a dangling symlink. Tries without sudo first: a link in ~/.local/bin
 * belongs to the reader, and asking for a password to delete their own file is
 * how a tool teaches people to type it without reading.
 */
export function removeSymlink(links: string[]): string {
	if (links.length === 0) throw new Error("No symlink to remove.");
	const args = links.map(q).join(" ");
	return `rm -f ${args} 2>/dev/null || sudo rm -f ${args}`;
}

/** Forget a remembered Wi-Fi network. Needs admin rights, always. */
export function forgetNetworks(iface: string, ssids: string[]): string {
	if (ssids.length === 0) throw new Error("No network to forget.");
	return ssids
		.map(
			(s) =>
				`sudo networksetup -removepreferredwirelessnetwork ${q(iface)} ${q(s)}`,
		)
		.join(" && ");
}

/** Remove an item from Login Items, the same list System Settings shows. */
export function removeLoginItems(names: string[]): string {
	if (names.length === 0) throw new Error("No login item to remove.");
	return names
		.map(
			(n) =>
				`osascript -e 'tell application "System Events" to delete login item ${JSON.stringify(n)}'`,
		)
		.join("; ");
}

/**
 * Stop a launch agent for this login session.
 *
 * The CLI reports the agent's label, which is what bootout takes. If the label
 * is wrong the command says so in Terminal rather than failing silently, which
 * is the reason this runs where it can be read.
 */
export function bootoutAgents(labels: string[]): string {
	if (labels.length === 0) throw new Error("No agent to stop.");
	return labels
		.map((l) => `launchctl bootout gui/$(id -u)/${q(l)}`)
		.join("; ");
}

/**
 * Delete an expired certificate from the login keychain.
 *
 * Scoped to login.keychain-db on purpose: the System keychain holds roots that
 * other software depends on, and an expired one there is not the reader's to
 * clean up from a list.
 */
export function deleteCertificates(names: string[]): string {
	if (names.length === 0) throw new Error("No certificate to delete.");
	return names
		.map(
			(n) =>
				`security delete-certificate -c ${q(n)} ~/Library/Keychains/login.keychain-db`,
		)
		.join("; ");
}

/** Reclaim Docker's disk: stopped containers, dangling images, unused volumes. */
export function dockerPrune(): string {
	return "docker system prune --volumes -f";
}

/** Start a Time Machine backup now. */
export function startBackup(): string {
	return "tmutil startbackup --auto";
}

/** Show every place a name resolves from, in PATH order. */
export function whichAll(name: string): string {
	return `which -a ${q(name)}`;
}

/**
 * Push a repository whose commits exist only on this disk.
 *
 * `--` is not needed here and no branch is named on purpose: pushing the
 * current branch to its own upstream is what the row is about, and naming a
 * branch would be this extension deciding where the work belongs.
 */
export function gitPush(path: string): string {
	return `cd ${q(path)} && git push`;
}

/** Push several repositories, stopping at the first that refuses. */
export function gitPushAll(paths: string[]): string {
	if (paths.length === 0) throw new Error("No repository to push.");
	return paths.map((p) => `(${gitPush(p)})`).join(" && ");
}

/** Open a repository in Terminal with its state already printed. */
export function repoStatus(path: string): string {
	return `cd ${q(path)} && git status`;
}

/** One settings pane, opened at the section that owns the setting. */
export const SETTINGS = {
	battery: "x-apple.systempreferences:com.apple.preference.battery",
	storage: "x-apple.systempreferences:com.apple.settings.Storage",
	network: "x-apple.systempreferences:com.apple.Network-Settings.extension",
	timeMachine: "x-apple.systempreferences:com.apple.settings.TimeMachine",
	loginItems:
		"x-apple.systempreferences:com.apple.LoginItems-Settings.extension",
} as const;

export function openSettings(pane: string): string {
	return `open ${q(pane)}`;
}

/** Reveal a path in Finder. */
export function reveal(path: string): string {
	return `open -R ${q(path)}`;
}

/** Open an application by name. */
export function openApp(app: string): string {
	return `open -a ${q(app)}`;
}
