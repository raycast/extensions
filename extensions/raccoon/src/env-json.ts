import { expectObject } from "./json-out.ts";

/**
 * `rcc env --json`.
 *
 * Three things go wrong with a PATH, in this order of surprise: a symlink that
 * resolves to nothing, so a command is on the PATH and still fails; an entry
 * that does not exist; and the same directory listed twice.
 */
export type PathEntry = { path: string; exists: boolean };
export type BrokenLink = { name: string; link: string; target: string };
export type Tool = { name: string; found: boolean; version: string | null };

export type EnvReport = {
	path: PathEntry[];
	broken_symlinks: BrokenLink[];
	duplicates: string[];
	tools: Tool[];
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** macOS adds these through /etc/paths.d/10-cryptex, and they are often absent. */
const isCryptexEntry = (path: string) => path.startsWith("/var/run/com.apple.security.cryptexd/");

/** On the sealed system volume: nobody can remove these, root included. */
const isSealedLink = (link: string) =>
	["/System/", "/bin/", "/sbin/", "/usr/"].some((root) => link.startsWith(root)) && !link.startsWith("/usr/local/");

export function parseEnv(stdout: string): EnvReport {
	const r = expectObject(stdout, "env");
	return {
		path: Array.isArray(r.path)
			? r.path
					.map((v) => {
						const p = (v ?? {}) as Record<string, unknown>;
						return { path: str(p.path), exists: p.exists === true };
					})
					// Dropped here so that no count or action can offer them as problems.
					.filter((p) => p.exists || !isCryptexEntry(p.path))
			: [],
		broken_symlinks: Array.isArray(r.broken_symlinks)
			? r.broken_symlinks
					.map((v) => {
						const b = (v ?? {}) as Record<string, unknown>;
						return {
							name: str(b.name),
							link: str(b.link),
							target: str(b.target),
						};
					})
					.filter((b) => !isSealedLink(b.link))
			: [],
		duplicates: Array.isArray(r.duplicates) ? r.duplicates.filter((d): d is string => typeof d === "string") : [],
		tools: Array.isArray(r.tools)
			? r.tools.map((v) => {
					const t = (v ?? {}) as Record<string, unknown>;
					return {
						name: str(t.name),
						found: t.found === true,
						version: typeof t.version === "string" ? t.version : null,
					};
				})
			: [],
	};
}

/** How many things are actually wrong, which is what the title should say. */
export function problems(e: EnvReport): number {
	return e.broken_symlinks.length + e.path.filter((p) => !p.exists).length + e.duplicates.length;
}

/**
 * A version string trimmed to its first useful part. `curl --version` prints
 * four libraries and a paragraph, which pushes everything else off the row.
 */
export function shortVersion(version: string): string {
	const cut = version.split(/\s+\(|\s+libcurl/)[0];
	return cut.length > 60 ? `${cut.slice(0, 57)}...` : cut;
}
