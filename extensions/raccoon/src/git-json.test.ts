import assert from "node:assert/strict";
import { test } from "node:test";
import { parseGit, repoLevel, sortRepos, summarise, type GitRepo } from "./git-json.ts";
import { shortPath } from "./paths.ts";

const repo = (over: Partial<GitRepo> = {}): GitRepo => ({
	name: "r",
	path: "/Users/me/r",
	uncommitted: 0,
	unpushed: 0,
	stashed: 0,
	detached_head: false,
	no_upstream: 0,
	...over,
});

test("parses the report rcc git --json prints", () => {
	const parsed = parseGit(
		'{"repos_total":41,"repos_with_issues":1,"repos":[{"name":"Raccoon","path":"/Users/me/Raccoon","uncommitted":4,"unpushed":2,"stashed":0,"detached_head":false,"no_upstream":1}]}',
	);
	assert.equal(parsed.repos_total, 41);
	assert.equal(parsed.repos[0].name, "Raccoon");
	assert.equal(parsed.repos[0].unpushed, 2);
	assert.equal(parsed.repos[0].detached_head, false);
});

test("a machine with no repositories parses as an empty list, not a failure", () => {
	const parsed = parseGit('{"repos_total":0,"repos_with_issues":0,"repos":[]}');
	assert.deepEqual(parsed.repos, []);
	assert.equal(parsed.repos_total, 0);
});

test("an unpushed commit outranks any number of uncommitted changes", () => {
	// 452 uncommitted files is what a working day looks like; two commits that
	// exist on one disk is what a lost Mac looks like.
	const sorted = sortRepos([repo({ name: "busy", uncommitted: 452 }), repo({ name: "risky", unpushed: 2 })]);
	assert.deepEqual(
		sorted.map((r) => r.name),
		["risky", "busy"],
	);
});

test("a detached HEAD is called out even when nothing else is wrong", () => {
	assert.equal(repoLevel(repo({ detached_head: true })), "detached");
	assert.equal(summarise(repo({ detached_head: true })), "detached HEAD");
});

test("a repo whose only problem is an untracked branch is the lowest level", () => {
	assert.equal(repoLevel(repo({ no_upstream: 3 })), "loose");
	assert.equal(summarise(repo({ no_upstream: 3 })), "3 branches with no upstream");
	assert.equal(summarise(repo({ no_upstream: 1 })), "1 branch with no upstream");
});

test("the summary lists every count that is not zero", () => {
	assert.equal(summarise(repo({ unpushed: 2, uncommitted: 4, stashed: 1 })), "2 unpushed, 4 uncommitted, 1 stashed");
});

test("paths are shown relative to home", () => {
	assert.equal(shortPath("/Users/me/Desktop/x", "/Users/me"), "~/Desktop/x");
	assert.equal(shortPath("/Users/me", "/Users/me"), "~");
	assert.equal(shortPath("/opt/src/x", "/Users/me"), "/opt/src/x");
	// /Users/meredith must not be rewritten as ~redith.
	assert.equal(shortPath("/Users/meredith/x", "/Users/me"), "/Users/meredith/x");
});

test("a detached HEAD in a tool's hidden checkout is how the tool works", () => {
	const nvm = {
		name: ".nvm",
		path: "/Users/x/.nvm",
		uncommitted: 0,
		unpushed: 0,
		stashed: 0,
		detached_head: true,
		no_upstream: 1,
	};
	assert.equal(repoLevel(nvm), "loose");
	assert.equal(summarise(nvm), "1 branch with no upstream");
	assert.equal(repoLevel({ ...nvm, name: "app" }), "detached");
	assert.equal(repoLevel({ ...nvm, unpushed: 2 }), "unpushed");
});

test("a tool's hidden checkout with nothing else outstanding is not reported", () => {
	const repo = (name: string, extra = {}) => ({
		name,
		path: `/Users/x/${name}`,
		uncommitted: 0,
		unpushed: 0,
		stashed: 0,
		detached_head: true,
		// What rcc really sends: git lists the detached HEAD as a branch with no upstream.
		no_upstream: 1,
		...extra,
	});
	const parsed = parseGit(
		JSON.stringify({
			repos_total: 6,
			repos_with_issues: 5,
			repos: [
				repo(".nvm"),
				repo(".oh-my-zsh", { no_upstream: 0 }),
				repo(".dirty", { uncommitted: 3 }),
				repo(".branches", { no_upstream: 2 }),
				repo("app"),
			],
		}),
	);
	assert.deepEqual(
		parsed.repos.map((r) => r.name),
		[".dirty", ".branches", "app"],
	);
	assert.equal(parsed.repos_with_issues, 3);
	assert.equal(parsed.repos_total, 6);
});
