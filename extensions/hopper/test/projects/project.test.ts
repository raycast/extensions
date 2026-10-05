import { test } from "node:test";
import assert from "node:assert/strict";
import { projectLabel, projectOf } from "../../src/lib/projects/project.ts";

test("a repository is a project; a worktree belongs to its main checkout, named by branch", () => {
  assert.equal(projectOf(undefined), undefined);
  const main = projectOf({ root: "/p/hopper", mainRoot: "/p/hopper", branch: "main" });
  assert.deepEqual(main, { name: "hopper", root: "/p/hopper" });
  const worktree = projectOf({ root: "/p/hopper-agents", mainRoot: "/p/hopper", branch: "agents/levels" });
  assert.deepEqual(worktree, { name: "hopper", root: "/p/hopper", worktree: "agents/levels" });
  assert.equal(projectLabel(worktree!), "hopper · agents/levels");
  assert.equal(projectOf({ root: "/p/x-wt", mainRoot: "/p/x" })?.worktree, "x-wt");
});
