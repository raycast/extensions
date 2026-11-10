// The extension's reading of the machine and of a project, apart from Raycast: which projects it knows (Raycast
// Extension REQ1, REQ10), how a row is found as typed (REQ3), and the links it opens and copies (REQ4, REQ13).
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { blueprintEntry, docEntries, markedSnippet, matches, taskEntry } from "../src/lib/index";
import { markdownLink, openLink } from "../src/lib/links";
import { distinctNames, knownProjects, projectName, projectsFolder, recentProjects, shownFolder, withFolders } from "../src/lib/projects";

function project(folder: string, product?: string): string {
  mkdirSync(path.join(folder, ".eidos", "plugins", "eidosmd"), { recursive: true });
  writeFileSync(path.join(folder, ".eidos", "Framework.yaml"), "eidos_version: 5.10.0\n");
  if (product) writeFileSync(path.join(folder, ".eidos", "plugins", "eidosmd", "settings.yaml"), `# a comment\nproduct: ${product}\n`);
  return folder;
}

test("the projects are the app's recent ones, newest first, then the projects folder's and the named folders', each once", () => {
  const home = mkdtempSync(path.join(tmpdir(), "eidos-raycast-"));
  const data = path.join(home, "data");
  mkdirSync(data);
  const acme = project(path.join(home, "dev", "acme", "Blueprints"), "Acme");
  mkdirSync(path.join(home, "dev", "acme", ".git"));
  const north = project(path.join(home, "Documents", "Eidos", "Clients", "Northwind"));
  const side = project(path.join(home, "side", "idea"));
  project(path.join(home, "side", "node_modules", "ignored"));
  const projectsRoot = path.join(home, "Documents", "Eidos");
  writeFileSync(path.join(data, "preferences.yaml"), `# projects_folder: where\nprojects_folder: ${projectsRoot}\n`);
  writeFileSync(
    path.join(data, "state.json"),
    JSON.stringify({
      recent: [
        { root: acme, opened: "2026-11-09T19:00:00.000Z" },
        { root: path.join(home, "gone"), opened: "2026-11-08T19:00:00.000Z" },
        { root: north, opened: "2026-11-07T19:00:00.000Z" },
      ],
      windows: [],
      pathOffer: null,
      zoom: 0,
    }),
  );
  const found = knownProjects({ dataDir: data, extraFolders: [path.join(home, "side")] });
  assert.deepEqual(
    found.map((entry) => [entry.name, entry.root, entry.opened !== null]),
    [
      ["Acme", acme, true],
      ["Northwind", north, true],
      ["idea", side, false],
    ],
    "a moved project is left out, one listed twice is listed once, and node_modules is never searched",
  );
  assert.deepEqual(
    knownProjects({ dataDir: data, extraFolders: [path.join(home, "side")], includeRecent: false }).map((entry) => entry.name),
    ["idea", "Northwind"],
    "without the recent list, only the folders' projects, by name",
  );
});

test("the recent list is read from its `recent` entries alone, and a missing or broken file gives none", () => {
  const data = mkdtempSync(path.join(tmpdir(), "eidos-raycast-"));
  assert.deepEqual(recentProjects(data), []);
  writeFileSync(path.join(data, "state.json"), "{ not json");
  assert.deepEqual(recentProjects(data), []);
  writeFileSync(path.join(data, "state.json"), JSON.stringify({ recent: [{ root: "/a", opened: "x" }, { root: 3 }, null] }));
  assert.deepEqual(recentProjects(data), [{ root: "/a", opened: "x" }]);
});

test("the projects folder is Documents/Eidos until the app's preferences name another", () => {
  const data = mkdtempSync(path.join(tmpdir(), "eidos-raycast-"));
  assert.equal(projectsFolder(data, "/home/ana"), path.join("/home/ana", "Documents", "Eidos"));
  writeFileSync(path.join(data, "preferences.yaml"), "projects_folder: null\n");
  assert.equal(projectsFolder(data, "/home/ana"), path.join("/home/ana", "Documents", "Eidos"));
  writeFileSync(path.join(data, "preferences.yaml"), "projects_folder: '~/Work/Eidos'\n");
  assert.equal(projectsFolder(data, "/home/ana"), path.join("/home/ana", "Work", "Eidos"));
});

test("a project is named by its product, else its repository, else its folder", () => {
  const home = mkdtempSync(path.join(tmpdir(), "eidos-raycast-"));
  assert.equal(projectName(project(path.join(home, "a"), '"Ledger"')), "Ledger");
  mkdirSync(path.join(home, "repo", ".git"), { recursive: true });
  assert.equal(projectName(project(path.join(home, "repo", "Blueprints"))), "repo");
  assert.equal(projectName(project(path.join(home, "plain"))), "plain");
});

test("a row is found by every typed word, in any case, in its id, title, summary, or a property", () => {
  const entry = blueprintEntry({
    id: "B-A54",
    title: "Raycast Extension",
    summary: "Opens projects from Raycast.",
    collection: "specs",
    folder: "integrations",
    path: "specs/integrations/raycast-extension.md",
    properties: { maturity: "Infant", tags: ["launcher", "mac"] },
  });
  assert.equal(entry.route, "/b/specs/integrations/raycast-extension.md");
  assert.equal(entry.place, "specs/integrations");
  assert.ok(matches(entry, "b-a54"));
  assert.ok(matches(entry, "EXTENSION raycast"));
  assert.ok(matches(entry, "infant launcher"));
  assert.ok(!matches(entry, "raycast windows"), "every word, not any");
});

test("a top-level doc opens at its own page, and a task at the route the CLI gives it", () => {
  const docs = docEntries({ top_level: [{ title: "Orientation", path: "../orientation.md" }, { title: "Odd", path: "elsewhere.md" }] });
  assert.deepEqual(
    docs.map((doc) => [doc.title, doc.file, doc.route]),
    [["Orientation", "orientation.md", "/doc/orientation.md"]],
  );
  const task = taskEntry({
    name: "t-a00-a-task",
    id: "T-A00",
    file: "backlog/t-a00-a-task.md",
    href: "/p/backlog/tasks/t-a00-a-task",
    title: "A task",
    status: "Done",
    open: false,
    assignee: ["brenton"],
    properties: {},
    checklists: { acceptance: [{ done: true, text: "it works" }] },
  });
  assert.equal(task.route, "/p/backlog/tasks/t-a00-a-task");
  assert.equal(task.task?.open, false);
  assert.ok(matches(task, "@brenton".slice(1)));
});

test("the links name the project and the page, and a copied link is relative to the project", () => {
  assert.equal(openLink("/Users/ana/My Product"), "eidosmd://open?project=%2FUsers%2Fana%2FMy%20Product");
  assert.equal(openLink("C:\\p", "/b/specs/login.md"), "eidosmd://open?project=C%3A%5Cp&to=%2Fb%2Fspecs%2Flogin.md");
  assert.equal(markdownLink("Login [beta]", "specs/log in.md"), "[Login \\[beta\\]](specs/log%20in.md)");
  assert.equal(markedSnippet("…the [Passke]ys…"), "…the **Passke**ys…");
  assert.equal(markedSnippet("… The Format _[What] a [course] is made of_, video…"), "… The Format **What** a **course** is made of, video…");
  assert.equal(markedSnippet("…## [How] They Compete…"), "…**How** They Compete…");
  assert.equal(markedSnippet("set the [snake]_case flag"), "set the **snake**_case flag");
});

test("a project folder is added once, by its whole path, and shown with ~ for the home folder", () => {
  assert.deepEqual(withFolders(["/a"], ["/b", "/a", "/b/"]), ["/a", "/b"]);
  assert.equal(shownFolder("/home/ana/dev", "/home/ana"), "~/dev");
  assert.equal(shownFolder("/home/ana", "/home/ana"), "~");
  assert.equal(shownFolder("/home/anabel/dev", "/home/ana"), "/home/anabel/dev");
});

test("projects that share a name are told apart by where each sits in its repository, as the app's tabs are", () => {
  const home = mkdtempSync(path.join(tmpdir(), "eidos-raycast-"));
  mkdirSync(path.join(home, "examples", ".git"), { recursive: true });
  const academy = project(path.join(home, "examples", "academy"));
  const world = project(path.join(home, "examples", "world"));
  const solo = project(path.join(home, "solo"), "Solo");
  assert.deepEqual(
    distinctNames([
      { root: academy, name: projectName(academy), opened: null },
      { root: world, name: projectName(world), opened: null },
      { root: solo, name: projectName(solo), opened: null },
    ]).map((entry) => entry.name),
    ["examples · academy", "examples · world", "Solo"],
  );
});
