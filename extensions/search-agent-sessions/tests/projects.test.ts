import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { IS_WINDOWS } from "../src/lib/paths";
import {
  PROJECT_LIMIT,
  projectOptions,
  projectRoot,
  projectsEqual,
} from "../src/lib/projects";
import { session } from "./fixtures";

const ROOT = "/root";

/** The platform, never left to the host's default; see `paths.test.ts`. */
const WIN = true;
const POSIX = false;

function options(
  cwds: Array<string | { cwd: string; mtimeMs?: number }>,
  over: Partial<Parameters<typeof projectOptions>[1]> = {},
  windows = POSIX,
) {
  return projectOptions(
    cwds.map((c) => session(typeof c === "string" ? { cwd: c } : c)),
    { searchRoot: ROOT, ignore: [], includeOutsideRoot: false, ...over },
    windows,
  );
}

test("projectRoot is the first level under the search root", () => {
  assert.equal(projectRoot("/root/pixie", ROOT, POSIX), "/root/pixie");
  assert.equal(
    projectRoot("/root/pixie/backend/src", ROOT, POSIX),
    "/root/pixie",
  );
  assert.equal(
    projectRoot("/root/pixie/.claude/worktrees/djinn", ROOT, POSIX),
    "/root/pixie",
  );
});

test("projectRoot keeps sibling repos with a shared prefix apart", () => {
  // Three unrelated repos, which is why the dropdown matches a path prefix
  // rather than the substring `dir:pixie` does.
  assert.equal(
    projectRoot("/root/pixie-8ball", ROOT, POSIX),
    "/root/pixie-8ball",
  );
  assert.equal(
    projectRoot("/root/pixie-workers", ROOT, POSIX),
    "/root/pixie-workers",
  );
  assert.notEqual(
    projectRoot("/root/pixie-8ball", ROOT, POSIX),
    projectRoot("/root/pixie", ROOT, POSIX),
  );
});

test("a cwd outside the root, or no root at all, stands for itself", () => {
  assert.equal(
    projectRoot("/elsewhere/thing/deep", ROOT, POSIX),
    "/elsewhere/thing/deep",
  );
  assert.equal(projectRoot("/root", ROOT, POSIX), "/root");
  assert.equal(
    projectRoot("/root/pixie/backend", "", POSIX),
    "/root/pixie/backend",
  );
});

test("a trailing separator does not make a cwd its own project", () => {
  assert.equal(projectRoot("/root/pixie/", ROOT, POSIX), "/root/pixie");
  assert.equal(projectRoot("/root/pixie/backend/", ROOT, POSIX), "/root/pixie");
  assert.equal(
    projectRoot("/elsewhere/thing/", ROOT, POSIX),
    "/elsewhere/thing",
  );
  // Stripping must not empty a root-level cwd.
  assert.equal(projectRoot("/", "", POSIX), "/");
});

const WIN_ROOT = "C:\\Users\\Aki\\code";

test("a Windows cwd folds into its repo like any other", () => {
  // Regression: with the cwd and the root spelled alike, the first separator
  // past the root is what ends the project's segment. Segmenting on the host's
  // instead left every worktree and subdirectory its own entry, and the cap
  // then evicted the repos they belonged to.
  assert.equal(
    projectRoot("C:\\Users\\Aki\\code\\pixie\\backend\\src", WIN_ROOT, WIN),
    "C:\\Users\\Aki\\code\\pixie",
  );
  assert.equal(
    projectRoot("C:\\Users\\Aki\\code\\pixie\\", WIN_ROOT, WIN),
    "C:\\Users\\Aki\\code\\pixie",
  );
  // The head is taken from the root, so two sessions that capitalised the same
  // directory differently still name one project rather than two.
  assert.equal(
    projectRoot("c:\\users\\aki\\code\\pixie\\api", WIN_ROOT, WIN),
    "C:\\Users\\Aki\\code\\pixie",
  );
});

test("a Windows project's keywords are its segments, not the whole path", () => {
  const [pixie] = options(
    ["C:\\Users\\Aki\\code\\pixie\\backend"],
    { searchRoot: WIN_ROOT, ignore: [] },
    WIN,
  );
  assert.deepEqual(pixie.keywords, ["pixie"]);
  const [outside] = options(
    ["D:\\scratch\\thing"],
    { searchRoot: WIN_ROOT, ignore: [], includeOutsideRoot: true },
    WIN,
  );
  assert.deepEqual(outside.keywords, ["D:", "scratch", "thing"]);
});

test("sessions under one repo collapse to a single option", () => {
  const list = options([
    "/root/pixie",
    "/root/pixie/backend/src",
    "/root/pixie/.claude/worktrees/djinn",
  ]);
  assert.deepEqual(
    list.map((p) => [p.path, p.title]),
    [["/root/pixie", "pixie"]],
  );
});

test("the search root is normalized before projects are grouped", () => {
  // Production passes the raw preference, which is `~/code` by default; without
  // normalization no cwd matches the root and every directory becomes an entry.
  // Root and cwds are both built with `join`, so the pair agrees on whichever
  // separator the host spells a home-relative path with.
  const tilde = projectOptions(
    [
      session({ cwd: join(homedir(), "code", "pixie") }),
      session({ cwd: join(homedir(), "code", "pixie", "backend") }),
    ],
    { searchRoot: "~/code", ignore: [], includeOutsideRoot: false },
    IS_WINDOWS,
  );
  assert.deepEqual(
    tilde.map((p) => p.path),
    [join(homedir(), "code", "pixie")],
  );

  const messy = options(["/root/pixie/backend"], {
    searchRoot: "  /root/  ",
    ignore: [],
  });
  assert.deepEqual(
    messy.map((p) => p.path),
    ["/root/pixie"],
  );
});

test("a session run at the search root itself is not offered as a project", () => {
  const list = options([ROOT, `${ROOT}/`, "/root/pixie"]);
  assert.deepEqual(
    list.map((p) => p.path),
    ["/root/pixie"],
  );
});

test("options are ordered by the most recent session in each repo", () => {
  const list = options([
    { cwd: "/root/old", mtimeMs: 10 },
    { cwd: "/root/new/deep", mtimeMs: 5 },
    { cwd: "/root/new", mtimeMs: 900 },
    { cwd: "/root/mid", mtimeMs: 100 },
  ]);
  assert.deepEqual(
    list.map((p) => p.title),
    ["new", "mid", "old"],
  );
  assert.equal(list[0].mtimeMs, 900);
});

test("keywords drop the segments every entry shares", () => {
  // With the root's own segments included, typing "root" would match them all.
  const [pixie] = options(["/root/pixie/backend"]);
  assert.deepEqual(pixie.keywords, ["pixie"]);
  const [outside] = options(["/elsewhere/thing"], {
    searchRoot: ROOT,
    ignore: [],
    includeOutsideRoot: true,
  });
  assert.deepEqual(outside.keywords, ["elsewhere", "thing"]);
});

test("options honour the root and ignore filters", () => {
  const list = options(["/root/pixie", "/elsewhere/other", "/root/dist/app"], {
    searchRoot: ROOT,
    ignore: ["dist"],
  });
  assert.deepEqual(
    list.map((p) => p.title),
    ["pixie"],
  );
});

test("includeOutsideRoot lists repos beyond the root", () => {
  const list = options(["/root/pixie", "/elsewhere/other"], {
    searchRoot: ROOT,
    ignore: [],
    includeOutsideRoot: true,
  });
  assert.deepEqual(list.map((p) => p.title).sort(), ["other", "pixie"]);
});

test("nested directories outside the root stay distinct entries", () => {
  const list = options(
    ["/outside/pixie", "/outside/pixie/three", "/outside/other"],
    { searchRoot: ROOT, ignore: [], includeOutsideRoot: true },
  );
  assert.deepEqual(list.map((p) => p.path).sort(), [
    "/outside/other",
    "/outside/pixie",
    "/outside/pixie/three",
  ]);
});

test("an ancestor entry outside the root never absorbs in-root projects", () => {
  // Regression: a single session run in the home directory made it an ancestor
  // of every real repo.
  const list = options(["/", "/root/pixie", "/root/raycast"], {
    searchRoot: ROOT,
    ignore: [],
    includeOutsideRoot: true,
  });
  assert.deepEqual(
    list
      .map((p) => p.title)
      .slice(0, 2)
      .sort(),
    ["pixie", "raycast"],
  );
});

test("projects under the search root outrank outlying directories", () => {
  const list = options(
    [
      { cwd: "/elsewhere/fresh", mtimeMs: 900 },
      { cwd: "/root/stale", mtimeMs: 1 },
      { cwd: "/elsewhere/fresher", mtimeMs: 950 },
    ],
    { searchRoot: ROOT, ignore: [], includeOutsideRoot: true },
  );
  assert.deepEqual(
    list.map((p) => p.title),
    ["stale", "fresher", "fresh"],
  );
});

test("the cap keeps in-root projects over more recent outlying ones", () => {
  const outside = Array.from({ length: PROJECT_LIMIT }, (_, i) => ({
    cwd: `/elsewhere/o${i}`,
    mtimeMs: 1000 + i,
  }));
  const list = options([{ cwd: "/root/keep", mtimeMs: 1 }, ...outside], {
    searchRoot: ROOT,
    ignore: [],
    includeOutsideRoot: true,
  });
  assert.equal(list.length, PROJECT_LIMIT);
  assert.equal(list[0].title, "keep");
});

test("a session with no cwd contributes no option", () => {
  assert.deepEqual(options([""]), []);
});

test("projectsEqual holds across recomputes that changed nothing", () => {
  // Stops a flush during indexing from re-rendering the whole command.
  const cwds = ["/root/pixie", "/root/raycast"];
  assert.equal(projectsEqual(options(cwds), options(cwds)), true);
});

test("projectsEqual sees a new project, a lost one, and a reorder", () => {
  const base = options([
    { cwd: "/root/pixie", mtimeMs: 10 },
    { cwd: "/root/raycast", mtimeMs: 5 },
  ]);
  assert.equal(projectsEqual(base, options(["/root/pixie"])), false);
  assert.equal(
    projectsEqual(
      base,
      options([
        { cwd: "/root/pixie", mtimeMs: 10 },
        { cwd: "/root/raycast", mtimeMs: 5 },
        { cwd: "/root/orca", mtimeMs: 1 },
      ]),
    ),
    false,
  );
  // Same set, different order: the dropdown would render differently.
  assert.equal(
    projectsEqual(
      base,
      options([
        { cwd: "/root/pixie", mtimeMs: 5 },
        { cwd: "/root/raycast", mtimeMs: 10 },
      ]),
    ),
    false,
  );
});

test("the option list is capped at the most recently used repos", () => {
  const many = Array.from({ length: PROJECT_LIMIT + 5 }, (_, i) => ({
    cwd: `/root/p${i}`,
    mtimeMs: i,
  }));
  const list = options(many);
  assert.equal(list.length, PROJECT_LIMIT);
  assert.equal(list[0].title, `p${many.length - 1}`);
});
