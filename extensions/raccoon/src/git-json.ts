import { expectObject } from "./json-out.ts";

export type GitRepo = {
	name: string;
	path: string;
	uncommitted: number;
	unpushed: number;
	stashed: number;
	detached_head: boolean;
	no_upstream: number;
};

export type GitReport = {
	repos_total: number;
	repos_with_issues: number;
	repos: GitRepo[];
};

/**
 * How badly a repository needs attention.
 *
 * The ordering is about where the work exists, not how much of it there is.
 * A commit that was never pushed lives on one disk: lose the Mac, lose the
 * work. Uncommitted changes are worse still by that measure, but they are also
 * the normal state of a repository somebody is working in, so they rank below
 * the two that are quiet and easy to forget: an unpushed commit and a detached
 * HEAD both look clean in every editor's status bar.
 */
export type RepoLevel = "unpushed" | "detached" | "uncommitted" | "loose";

export function repoLevel(repo: GitRepo): RepoLevel {
	if (repo.unpushed > 0) return "unpushed";
	if (repo.detached_head) return "detached";
	if (repo.uncommitted > 0) return "uncommitted";
	return "loose";
}

const RANK: Record<RepoLevel, number> = {
	unpushed: 0,
	detached: 1,
	uncommitted: 2,
	loose: 3,
};

/** Most at risk first, then most work at stake, then by name. */
export function sortRepos(repos: GitRepo[]): GitRepo[] {
	return [...repos].sort((a, b) => {
		const byLevel = RANK[repoLevel(a)] - RANK[repoLevel(b)];
		if (byLevel !== 0) return byLevel;
		const byUnpushed = b.unpushed - a.unpushed;
		if (byUnpushed !== 0) return byUnpushed;
		const byUncommitted = b.uncommitted - a.uncommitted;
		if (byUncommitted !== 0) return byUncommitted;
		return a.name.localeCompare(b.name);
	});
}

/** "2 unpushed, 23 uncommitted" — every count that is not zero, in order. */
export function summarise(repo: GitRepo): string {
	const parts: string[] = [];
	if (repo.unpushed > 0) parts.push(`${repo.unpushed} unpushed`);
	if (repo.detached_head) parts.push("detached HEAD");
	if (repo.uncommitted > 0) parts.push(`${repo.uncommitted} uncommitted`);
	if (repo.stashed > 0) parts.push(`${repo.stashed} stashed`);
	if (repo.no_upstream > 0)
		parts.push(
			`${repo.no_upstream} ${repo.no_upstream === 1 ? "branch" : "branches"} with no upstream`,
		);
	return parts.join(", ");
}

/** ~/Desktop/x rather than /Users/someone/Desktop/x. */
export function shortPath(path: string, home: string): string {
	return path === home
		? "~"
		: path.startsWith(`${home}/`)
			? `~${path.slice(home.length)}`
			: path;
}

function number(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function parseGit(stdout: string): GitReport {
	const raw = expectObject(stdout, "git");
	return {
		repos_total: number(raw.repos_total),
		repos_with_issues: number(raw.repos_with_issues),
		repos: Array.isArray(raw.repos)
			? raw.repos.map((entry) => {
					const r = (entry ?? {}) as Record<string, unknown>;
					return {
						name: typeof r.name === "string" ? r.name : "",
						path: typeof r.path === "string" ? r.path : "",
						uncommitted: number(r.uncommitted),
						unpushed: number(r.unpushed),
						stashed: number(r.stashed),
						detached_head: r.detached_head === true,
						no_upstream: number(r.no_upstream),
					};
				})
			: [],
	};
}
