import assert from "node:assert/strict";
import { test } from "node:test";
import { paneDirectoryLabel, shortenDirectory } from "../src/lib/directories";
import { buildGroups } from "../src/lib/model";

const home = "/Users/test";
const label = (directory?: string, project?: string) => paneDirectoryLabel(directory, project, home);

test("hides matching directories, including trailing slashes and home shorthand", () => {
  assert.equal(label("/work/project", "/work/project"), undefined);
  assert.equal(label("/work/project/", "/work/project"), undefined);
  assert.equal(label("/work/project", "/work/project/"), undefined);
  assert.equal(label(`${home}/project`, "~/project"), undefined);
  assert.equal(label("~/project", `${home}/project`), undefined);
  assert.equal(label(home, "~"), undefined);
});

test("shows project descendants as relative paths", () => {
  assert.equal(label("/work/project/src/api", "/work/project"), "src/api");
  assert.equal(label("~/project/src", `${home}/project`), "src");
  assert.equal(label("/work/project/../project/src", "/work/project"), "src");
  assert.equal(label("/work", "/"), "work");
});

test("retains distinct paths, including siblings, parents, and worktrees", () => {
  assert.equal(label("/work/project-other", "/work/project"), "/work/project-other");
  assert.equal(label("/work", "/work/project"), "/work");
  assert.equal(label(`${home}/worktrees/feature`, `${home}/project`), "~/worktrees/feature");
  assert.equal(label(`${home}/.local/share/chezmoi`, `${home}/.config/nvim`), "~/.local/share/chezmoi");
});

test("handles absent directories and avoids resolving relative paths against Raycast cwd", () => {
  assert.equal(label(undefined, "/work"), undefined);
  assert.equal(label("", "/work"), undefined);
  assert.equal(label(`${home}/project`), "~/project");
  assert.equal(label("src", "/work/project"), "src");
  assert.equal(label("/work/project", "project"), "/work/project");
});

test("home abbreviation respects path boundaries", () => {
  assert.equal(shortenDirectory(home, home), "~");
  assert.equal(shortenDirectory(`${home}/src`, home), "~/src");
  assert.equal(shortenDirectory(`${home}-other/src`, home), `${home}-other/src`);
  assert.equal(shortenDirectory(undefined, home), undefined);
});

test("display formatting preserves terminal titles, searchable paths, and copy values", () => {
  const directory = `${home}/project`;
  const title = `test@host:${directory}`;
  const [group] = buildGroups(
    [{ id: "s", project: "p", panes: [{ id: "a", title, processDir: directory }] }],
    [{ id: "p", name: "Project", dir: directory }],
  );
  const item = group.items[0];
  assert.equal(label(item.directory, group.subtitle), undefined);
  assert.equal(item.title, title);
  assert.equal(item.directory, directory);
  assert.ok(item.keywords.includes(directory));
  assert.ok(item.keywords.includes(title));
});
