import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  collapseTilde,
  displayPath,
  enclosingRoot,
  expandTilde,
  isUnder,
  normalizeRoot,
  normalizeSeparators,
  spawnEnv,
  stripTrailingSep,
} from "../src/lib/paths";

/**
 * The platform is passed to every function whose result turns on it, never left
 * to the host's default: the suite has to make the same assertions on a Windows
 * developer's machine as on a macOS one, and a default would test whichever it
 * happened to run on.
 */
const WIN = true;
const POSIX = false;

/**
 * A path under the real home directory, spelled the POSIX way. The tilde tests
 * assert a POSIX result, and `join` would spell it with the host's separator.
 */
const underHome = (name: string) => `${homedir()}/${name}`;

test("a lone tilde expands to the home directory", () => {
  assert.equal(expandTilde("~"), homedir());
});

test("~/ expands to a path under the home directory", () => {
  assert.equal(expandTilde("~/code"), join(homedir(), "code"));
  assert.equal(expandTilde("~/code/raycast"), join(homedir(), "code/raycast"));
});

test("an absolute path is returned unchanged", () => {
  assert.equal(expandTilde("/usr/local/bin"), "/usr/local/bin");
});

test("a tilde that is not the first character is not expanded", () => {
  assert.equal(expandTilde("/tmp/~/notes"), "/tmp/~/notes");
  assert.equal(expandTilde("/tmp/back~up"), "/tmp/back~up");
  // `~user` is not a home-relative path this function understands.
  assert.equal(expandTilde("~other/code"), "~other/code");
});

test("an empty path stays empty", () => {
  assert.equal(expandTilde(""), "");
});

test("normalizeRoot expands a tilde and strips trailing separators", () => {
  assert.equal(normalizeRoot("~/code", POSIX), join(homedir(), "code"));
  assert.equal(normalizeRoot("  /root/  ", POSIX), "/root");
  assert.equal(normalizeRoot("/root///", POSIX), "/root");
  assert.equal(normalizeRoot("", POSIX), "");
});

test("a bare slash normalizes to nothing, disabling the root filter", () => {
  assert.equal(normalizeRoot("/", POSIX), "");
  assert.equal(normalizeRoot("//", POSIX), "");
});

test("stripTrailingSep removes every trailing separator and nothing else", () => {
  assert.equal(stripTrailingSep("/root/pixie/", POSIX), "/root/pixie");
  assert.equal(stripTrailingSep("/root/pixie///", POSIX), "/root/pixie");
  assert.equal(stripTrailingSep("/root/pixie", POSIX), "/root/pixie");
  assert.equal(stripTrailingSep("/", POSIX), "");
  assert.equal(stripTrailingSep("", POSIX), "");
});

test("isUnder matches a directory and its contents", () => {
  assert.equal(isUnder("/root", "/root", POSIX), true);
  assert.equal(isUnder("/root/pixie", "/root", POSIX), true);
  assert.equal(isUnder("/root/pixie/backend/src", "/root", POSIX), true);
});

test("isUnder compares whole segments, not string prefixes", () => {
  // The invariant every directory comparison in the extension depends on.
  assert.equal(isUnder("/rootless", "/root", POSIX), false);
  assert.equal(isUnder("/root-other", "/root", POSIX), false);
  assert.equal(isUnder("/roo", "/root", POSIX), false);
});

test("enclosingRoot finds the directory a path sits in", () => {
  const roots = ["/root/pixie", "/root/unsettled"];
  assert.equal(
    enclosingRoot("/root/pixie/backend/src", roots, POSIX),
    "/root/pixie",
  );
  // A root encloses itself, which is the case that already worked.
  assert.equal(enclosingRoot("/root/pixie", roots, POSIX), "/root/pixie");
});

test("enclosingRoot picks the deepest of several containing roots", () => {
  // Worktrees nest: a workspace checked out inside another repo is its own
  // root, and handing Orca the outer one would open the file in the wrong tab.
  const roots = ["/root/pixie", "/root/pixie/.worktrees/feature"];
  assert.equal(
    enclosingRoot("/root/pixie/.worktrees/feature/src", roots, POSIX),
    "/root/pixie/.worktrees/feature",
  );
});

test("enclosingRoot returns nothing when no root contains the path", () => {
  assert.equal(enclosingRoot("/elsewhere/src", ["/root/pixie"], POSIX), "");
  assert.equal(enclosingRoot("/root/pixie/src", [], POSIX), "");
  // The segment rule: a sibling sharing a prefix does not contain it.
  assert.equal(
    enclosingRoot("/root/pixie-old/src", ["/root/pixie"], POSIX),
    "",
  );
  // A session whose transcript never named a working directory.
  assert.equal(enclosingRoot("", ["/root/pixie"], POSIX), "");
});

test("displayPath drops the project prefix from a path inside it", () => {
  assert.equal(
    displayPath("/root/pixie/src/main.ts", "/root/pixie", POSIX),
    "src/main.ts",
  );
  assert.equal(
    displayPath("/root/pixie/README.md", "/root/pixie", POSIX),
    "README.md",
  );
});

test("displayPath keeps a path outside the project whole, home-relative", () => {
  assert.equal(displayPath("/etc/hosts", "/root/pixie", POSIX), "/etc/hosts");
  assert.equal(
    displayPath(underHome("notes.md"), "/root/pixie", POSIX),
    "~/notes.md",
  );
  // The segment rule again: a sibling directory sharing a prefix is not inside.
  assert.equal(
    displayPath("/root/pixie-old/src/main.ts", "/root/pixie", POSIX),
    "/root/pixie-old/src/main.ts",
  );
});

test("displayPath leaves the project directory itself whole", () => {
  // Relativising it would yield the empty string, naming nothing.
  assert.equal(displayPath("/root/pixie", "/root/pixie", POSIX), "/root/pixie");
});

test("displayPath falls back to home-relative without a project", () => {
  // A session whose transcript never named a cwd has none.
  assert.equal(displayPath(underHome("a.ts"), "", POSIX), "~/a.ts");
  assert.equal(displayPath("/etc/hosts", "", POSIX), "/etc/hosts");
});

test("collapseTilde names the home directory itself", () => {
  assert.equal(collapseTilde(homedir(), POSIX), "~");
  assert.equal(collapseTilde("/etc/hosts", POSIX), "/etc/hosts");
});

test("normalizeSeparators settles a Windows path on one spelling", () => {
  // Windows accepts both, and the API that produced a path decides which one
  // you get: a cwd copied out of a transcript may disagree with the root the
  // user typed. Everything downstream segments and compares on the one form.
  assert.equal(
    normalizeSeparators("C:/Users/Aki/code", WIN),
    "C:\\Users\\Aki\\code",
  );
  assert.equal(
    normalizeSeparators("C:\\Users\\Aki\\code", WIN),
    "C:\\Users\\Aki\\code",
  );
});

test("a backslash stays an ordinary character in a macOS path", () => {
  // Nothing to settle: macOS has one separator, and rewriting the other would
  // rename a legal file.
  assert.equal(
    normalizeSeparators("/root/back\\slash", POSIX),
    "/root/back\\slash",
  );
});

test("normalizeRoot settles the spelling of a Windows root", () => {
  assert.equal(
    normalizeRoot("C:/Users/Aki/code/", WIN),
    "C:\\Users\\Aki\\code",
  );
  assert.equal(
    normalizeRoot("  C:\\Users\\Aki\\code\\\\  ", WIN),
    "C:\\Users\\Aki\\code",
  );
});

test("a Windows path is compared the way its filesystem compares it", () => {
  // Case is all that is left for `isUnder` to absorb: a session records its cwd
  // however the agent capitalised it, and the search root is whatever the user
  // typed, so a disagreement would silently empty the list rather than fail.
  assert.equal(
    isUnder("C:\\Users\\Aki\\code", "c:\\users\\aki\\code", WIN),
    true,
  );
  assert.equal(
    isUnder("C:\\Users\\Aki\\code\\pixie", "C:\\Users\\Aki\\code", WIN),
    true,
  );
});

test("a separator disagreement is settled before the comparison, not inside it", () => {
  // The layering the rest of the extension rests on: once both sides have been
  // through their entry boundary they are spelled alike, which is what lets
  // `projectRoot` and the ignore list segment a cwd on a single separator.
  const cwd = normalizeSeparators("C:/Users/Aki/code/pixie", WIN);
  const root = normalizeRoot("C:\\Users\\Aki\\code\\", WIN);
  assert.equal(isUnder(cwd, root, WIN), true);
});

test("whole-segment matching survives the Windows spelling rules", () => {
  assert.equal(isUnder("C:\\codeless", "C:\\code", WIN), false);
  assert.equal(isUnder("C:\\code-other", "C:\\code", WIN), false);
});

test("case still matters on macOS, where a path may differ only by it", () => {
  assert.equal(isUnder("/root/Pixie", "/root/pixie", POSIX), false);
});

test("a home-relative root may be typed with either separator", () => {
  // The separator a Windows user reaches for is the one their shell uses.
  assert.equal(expandTilde("~\\code"), join(homedir(), "code"));
  assert.equal(expandTilde("~/code"), join(homedir(), "code"));
});

test("a Windows root loses its trailing separator, whichever one it is", () => {
  assert.equal(stripTrailingSep("C:\\code\\", WIN), "C:\\code");
  assert.equal(stripTrailingSep("C:\\code/", WIN), "C:\\code");
  assert.equal(stripTrailingSep("C:/code//", WIN), "C:/code");
  // A macOS path keeps a backslash, which names a file there rather than a
  // directory boundary.
  assert.equal(stripTrailingSep("/root/code\\", POSIX), "/root/code\\");
});

test("the widened PATH reaches a Windows child under exactly one spelling", () => {
  // Windows spells the variable `Path`; leaving that alongside our `PATH` gives
  // the child two, and libuv sorts its environment case-insensitively, so which
  // one it resolves `claude` against is arbitrary.
  const env = spawnEnv(
    { Path: "C:\\Windows", USERPROFILE: "C:\\Users\\Aki" },
    ["C:\\Users\\Aki\\scoop\\shims"],
    WIN,
  );
  assert.deepEqual(
    Object.keys(env).filter((k) => k.toLowerCase() === "path"),
    ["PATH"],
  );
  assert.equal(env.PATH, "C:\\Windows;C:\\Users\\Aki\\scoop\\shims");
  assert.equal(env.USERPROFILE, "C:\\Users\\Aki");
});

test("every case variant of PATH is dropped, the exact spelling winning", () => {
  const env = spawnEnv(
    { path: "C:\\a", Path: "C:\\b", PATH: "C:\\c" },
    ["C:\\shims"],
    WIN,
  );
  assert.deepEqual(
    Object.keys(env).filter((k) => k.toLowerCase() === "path"),
    ["PATH"],
  );
  assert.equal(env.PATH, "C:\\c;C:\\shims");
});

test("a Windows environment naming no PATH at all still gets ours", () => {
  assert.equal(spawnEnv({}, ["C:\\shims"], WIN).PATH, "C:\\shims");
});

test("macOS keeps the PATH it inherited, with ours appended", () => {
  // The inherited entries stay in front so a working one always wins.
  const env = spawnEnv({ PATH: "/usr/bin" }, ["/opt/homebrew/bin"], POSIX);
  assert.equal(env.PATH, "/usr/bin:/opt/homebrew/bin");
});
