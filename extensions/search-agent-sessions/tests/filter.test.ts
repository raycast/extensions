import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { makeFilter, narrows, parseIgnoreList } from "../src/lib/filter";
import type { FilterConfig, FilterState } from "../src/lib/filter";
import { IS_WINDOWS } from "../src/lib/paths";
import { parseQuery } from "../src/lib/query";
import { session } from "./fixtures";

const ROOT = "/root";

/** The platform, never left to the host's default; see `paths.test.ts`. */
const WIN = true;
const POSIX = false;

function config(over: Partial<FilterConfig> = {}): FilterConfig {
  return { searchRoot: ROOT, ignore: [], includeOutsideRoot: false, ...over };
}

function allows(
  cwd: string,
  raw = "",
  over: Partial<FilterConfig> = {},
  windows = POSIX,
): boolean {
  return makeFilter(parseQuery(raw), config(over), windows)(session({ cwd }));
}

test("parseIgnoreList splits, trims and drops empties", () => {
  assert.deepEqual(parseIgnoreList("node_modules,dist,.git"), [
    "node_modules",
    "dist",
    ".git",
  ]);
  assert.deepEqual(parseIgnoreList(" node_modules , dist ,, .git , "), [
    "node_modules",
    "dist",
    ".git",
  ]);
});

test("parseIgnoreList maps an empty string to no entries", () => {
  assert.deepEqual(parseIgnoreList(""), []);
  assert.deepEqual(parseIgnoreList("   "), []);
  assert.deepEqual(parseIgnoreList(",,,"), []);
});

test("a session with no cwd is dropped", () => {
  assert.equal(allows(""), false);
});

test("the agent filter drops other agents", () => {
  const allow = makeFilter(
    parseQuery("agent:codex"),
    config({ searchRoot: "" }),
    POSIX,
  );
  assert.equal(allow(session({ cwd: ROOT, agent: "codex" })), true);
  assert.equal(allow(session({ cwd: ROOT, agent: "claude" })), false);
});

test("the dropdown override applies when the query names no agent", () => {
  const allow = makeFilter(
    parseQuery("hello"),
    config({ searchRoot: "", agentOverride: "claude" }),
    POSIX,
  );
  assert.equal(allow(session({ cwd: ROOT, agent: "claude" })), true);
  assert.equal(allow(session({ cwd: ROOT, agent: "codex" })), false);
});

test("the query's agent: beats the dropdown override", () => {
  const allow = makeFilter(
    parseQuery("agent:codex"),
    config({ searchRoot: "", agentOverride: "claude" }),
    POSIX,
  );
  assert.equal(allow(session({ cwd: ROOT, agent: "codex" })), true);
  assert.equal(allow(session({ cwd: ROOT, agent: "claude" })), false);
});

test("no agent filter at all keeps both agents", () => {
  const allow = makeFilter(
    parseQuery("hello"),
    config({ searchRoot: "" }),
    POSIX,
  );
  assert.equal(allow(session({ cwd: ROOT, agent: "codex" })), true);
  assert.equal(allow(session({ cwd: ROOT, agent: "claude" })), true);
});

test("only sessions under the search root survive", () => {
  assert.equal(allows("/root/project"), true);
  assert.equal(allows("/root/a/b/c"), true);
  assert.equal(allows("/elsewhere/project"), false);
});

test("the search root matches whole path segments only", () => {
  // "/rootless" starts with "/root" as a string but is not inside it.
  assert.equal(allows("/rootless/project"), false);
});

test("a cwd equal to the search root survives", () => {
  assert.equal(allows(ROOT), true);
});

test("a search root typed with a trailing slash still matches its own cwd", () => {
  assert.equal(allows(ROOT, "", { searchRoot: `${ROOT}/` }), true);
  assert.equal(allows(`${ROOT}/project`, "", { searchRoot: `${ROOT}/` }), true);
});

test("surrounding whitespace in the search root is ignored", () => {
  assert.equal(
    allows(`${ROOT}/project`, "", { searchRoot: `  ${ROOT} ` }),
    true,
  );
});

test("a tilde search root is expanded before comparison", () => {
  // Root and cwd are both built with `join`, so the pair agrees on whichever
  // separator the host spells a home-relative path with — hence the platform.
  const cwd = join(homedir(), "code", "thing");
  assert.equal(allows(cwd, "", { searchRoot: "~/code" }, IS_WINDOWS), true);
  assert.equal(
    allows("/elsewhere", "", { searchRoot: "~/code" }, IS_WINDOWS),
    false,
  );
});

test("an empty search root disables the root check", () => {
  assert.equal(allows("/anywhere/at/all", "", { searchRoot: "" }), true);
  assert.equal(allows("/anywhere/at/all", "", { searchRoot: "   " }), true);
});

test("includeOutsideRoot bypasses the root check", () => {
  assert.equal(
    allows("/elsewhere/project", "", { includeOutsideRoot: true }),
    true,
  );
});

test("the ignore list matches path segments, not substrings", () => {
  const ignore = ["dist", "node_modules"];
  assert.equal(allows("/root/dist/app", "", { ignore }), false);
  assert.equal(allows("/root/a/node_modules/b", "", { ignore }), false);
  // Regression: "distributed" contains "dist" but is not the ignored segment.
  assert.equal(allows("/root/distributed/app", "", { ignore }), true);
  assert.equal(allows("/root/redistribute", "", { ignore }), true);
  assert.equal(allows("/root/my-dist", "", { ignore }), true);
});

test("an empty ignore list hides nothing", () => {
  assert.equal(allows("/root/dist/app", "", { ignore: [] }), true);
});

test("the ignore list still applies outside the root", () => {
  assert.equal(
    allows("/elsewhere/dist/app", "", {
      ignore: ["dist"],
      includeOutsideRoot: true,
    }),
    false,
  );
});

test("the project scope keeps a repo and everything under it", () => {
  const projectPath = "/root/pixie";
  assert.equal(allows("/root/pixie", "", { projectPath }), true);
  assert.equal(allows("/root/pixie/backend/src", "", { projectPath }), true);
});

test("the project scope excludes sibling repos sharing its prefix", () => {
  // The dropdown matches a path prefix, so `pixie` does not swallow these the
  // way the substring filter `dir:pixie` would.
  const projectPath = "/root/pixie";
  assert.equal(allows("/root/pixie-8ball", "", { projectPath }), false);
  assert.equal(allows("/root/pixiedust", "", { projectPath }), false);
});

test("the project scope composes with the query's agent: token", () => {
  const allow = makeFilter(
    parseQuery("agent:codex"),
    config({ projectPath: "/root/pixie" }),
    POSIX,
  );
  assert.equal(
    allow(session({ cwd: "/root/pixie/api", agent: "codex" })),
    true,
  );
  assert.equal(
    allow(session({ cwd: "/root/pixie/api", agent: "claude" })),
    false,
  );
  assert.equal(allow(session({ cwd: "/root/other", agent: "codex" })), false);
});

const WIN_ROOT = "C:\\Users\\Aki\\code";

test("a Windows session is scoped by the root whatever its case", () => {
  assert.equal(
    allows("c:\\users\\aki\\code\\pixie", "", { searchRoot: WIN_ROOT }, WIN),
    true,
  );
  assert.equal(
    allows("D:\\scratch\\pixie", "", { searchRoot: WIN_ROOT }, WIN),
    false,
  );
});

test("the ignore list finds the segments of a Windows cwd", () => {
  // Regression: walking a backslash-spelled cwd for the host's separator found
  // no boundary at all, so the whole preference silently matched nothing.
  const over = { searchRoot: WIN_ROOT, ignore: ["dist", "node_modules"] };
  assert.equal(allows("C:\\Users\\Aki\\code\\p\\dist", "", over, WIN), false);
  assert.equal(
    allows("C:\\Users\\Aki\\code\\p\\node_modules\\b", "", over, WIN),
    false,
  );
  // The segment rule survives it: "distributed" is not the ignored segment.
  assert.equal(
    allows("C:\\Users\\Aki\\code\\p\\distributed", "", over, WIN),
    true,
  );
});

test("every dir: filter must match the cwd", () => {
  assert.equal(allows("/root/pixie/src", "dir:pixie dir:src"), true);
  assert.equal(allows("/root/pixie/lib", "dir:pixie dir:src"), false);
  assert.equal(allows("/root/other/src", "dir:pixie dir:src"), false);
});

test("dir: matching is case-insensitive against the cwd", () => {
  assert.equal(allows("/root/Pixie/Src", "dir:PIXIE"), true);
});

test("dir: matches anywhere in the cwd, not just a segment", () => {
  // dir: is documented as a substring filter, unlike the ignore list.
  assert.equal(allows("/root/pixie-engine", "dir:pixie"), true);
});

function state(over: Partial<FilterState> = {}): FilterState {
  return { words: "hello", dirs: [], includeOutsideRoot: false, ...over };
}

test("an unchanged filter counts as narrowed, so nothing is re-swept", () => {
  assert.equal(narrows(state(), state()), true);
});

test("any change to the query words forces a fresh sweep", () => {
  // Hits are scored against one word set; reusing them across sets is wrong.
  assert.equal(
    narrows(state({ words: "hello" }), state({ words: "hell" })),
    false,
  );
  assert.equal(
    narrows(state({ words: "hello" }), state({ words: "hello there" })),
    false,
  );
});

test("selecting an agent narrows; clearing or swapping one does not", () => {
  assert.equal(narrows(state(), state({ agent: "claude" })), true);
  assert.equal(narrows(state({ agent: "claude" }), state()), false);
  assert.equal(
    narrows(state({ agent: "claude" }), state({ agent: "codex" })),
    false,
  );
});

test("selecting a project, or one inside it, narrows", () => {
  const pixie = "/root/pixie";
  assert.equal(narrows(state(), state({ projectPath: pixie }), POSIX), true);
  assert.equal(
    narrows(
      state({ projectPath: pixie }),
      state({ projectPath: pixie }),
      POSIX,
    ),
    true,
  );
  assert.equal(
    narrows(
      state({ projectPath: pixie }),
      state({ projectPath: "/root/pixie/backend" }),
      POSIX,
    ),
    true,
  );
});

test("leaving a project, or jumping to an unrelated one, widens", () => {
  const pixie = "/root/pixie";
  assert.equal(narrows(state({ projectPath: pixie }), state(), POSIX), false);
  assert.equal(
    narrows(
      state({ projectPath: pixie }),
      state({ projectPath: "/root/orca" }),
      POSIX,
    ),
    false,
  );
  // A sibling sharing the name prefix is not inside it.
  assert.equal(
    narrows(
      state({ projectPath: pixie }),
      state({ projectPath: "/root/pixie-8ball" }),
      POSIX,
    ),
    false,
  );
});

test("reaching outside the search root widens; pulling back in narrows", () => {
  assert.equal(narrows(state(), state({ includeOutsideRoot: true })), false);
  assert.equal(narrows(state({ includeOutsideRoot: true }), state()), true);
});

test("adding a dir: narrows, dropping one widens", () => {
  assert.equal(
    narrows(state({ dirs: ["a"] }), state({ dirs: ["a", "b"] })),
    true,
  );
  assert.equal(
    narrows(state({ dirs: ["a", "b"] }), state({ dirs: ["a"] })),
    false,
  );
  assert.equal(narrows(state({ dirs: ["a"] }), state({ dirs: ["b"] })), false);
});

test("one widened dimension outweighs every narrowed one", () => {
  assert.equal(
    narrows(
      state({ agent: "claude", dirs: ["a"] }),
      state({ agent: "claude", dirs: ["a", "b"], includeOutsideRoot: true }),
    ),
    false,
  );
});
