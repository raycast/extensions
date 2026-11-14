import { expectObject } from "./json-out.ts";

export type SshKey = {
	name: string;
	type: string;
	passphrase: boolean;
	public_key: boolean;
	perms: string;
	perms_ok: boolean;
};

export type SshReport = {
	ssh_dir_present: boolean;
	ssh_dir_perms: string;
	keys: SshKey[];
};

/**
 * What is wrong with a key, worst first.
 *
 * A private key with no passphrase is a credential in plain text: anything that
 * reads the file can use it, which is what a backup, a synced folder or a stray
 * `tar` does. Loose permissions are the same failure one step removed, and ssh
 * itself refuses to use such a key. A missing .pub is not a risk at all, only a
 * key nothing can be derived from without the private half.
 */
export type KeyLevel = "unprotected" | "loose-perms" | "orphan" | "ok";

export function keyLevel(key: SshKey): KeyLevel {
	if (!key.passphrase) return "unprotected";
	if (!key.perms_ok) return "loose-perms";
	if (!key.public_key) return "orphan";
	return "ok";
}

const RANK: Record<KeyLevel, number> = {
	unprotected: 0,
	"loose-perms": 1,
	orphan: 2,
	ok: 3,
};

export function sortKeys(keys: SshKey[]): SshKey[] {
	return [...keys].sort((a, b) => {
		const byLevel = RANK[keyLevel(a)] - RANK[keyLevel(b)];
		return byLevel !== 0 ? byLevel : a.name.localeCompare(b.name);
	});
}

/** The one-line reason a key is listed where it is. */
export function reason(key: SshKey): string {
	switch (keyLevel(key)) {
		case "unprotected":
			return "no passphrase: usable by anything that reads the file";
		case "loose-perms":
			return `mode ${key.perms}, ssh requires 600`;
		case "orphan":
			return "no .pub alongside it";
		case "ok":
			return "passphrase set, mode 600";
	}
}

/** How many keys are not in good order. */
export function problemCount(report: SshReport): number {
	return report.keys.filter((key) => keyLevel(key) !== "ok").length;
}

export function parseSsh(stdout: string): SshReport {
	const raw = expectObject(stdout, "ssh");
	return {
		ssh_dir_present: raw.ssh_dir_present === true,
		ssh_dir_perms: typeof raw.ssh_dir_perms === "string" ? raw.ssh_dir_perms : "000",
		keys: Array.isArray(raw.keys)
			? raw.keys.map((entry) => {
					const k = (entry ?? {}) as Record<string, unknown>;
					return {
						name: typeof k.name === "string" ? k.name : "",
						type: typeof k.type === "string" ? k.type : "?",
						passphrase: k.passphrase === true,
						public_key: k.public_key === true,
						perms: typeof k.perms === "string" ? k.perms : "000",
						perms_ok: k.perms_ok === true,
					};
				})
			: [],
	};
}

/**
 * The verdict for the whole screen.
 *
 * Three things can be wrong and only one of them is a key: there may be no
 * ~/.ssh at all, and the directory's own mode matters as much as any key's -
 * 700 is what keeps another account out of all of them. The screen already
 * paints a mode that is not 700 red; the title used to say "all in good order"
 * next to it, and a verdict that contradicts the row under it is worse than no
 * verdict.
 */
export function sshTitle(report: SshReport): string {
	if (!report.ssh_dir_present) return "SSH keys: no ~/.ssh";
	const problems = problemCount(report);
	if (problems > 0) return `SSH keys: ${problems} ${problems === 1 ? "needs" : "need"} attention`;
	if (report.ssh_dir_perms !== "700") return `SSH keys: ~/.ssh is ${report.ssh_dir_perms}, not 700`;
	return "SSH keys: all in good order";
}
