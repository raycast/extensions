import assert from "node:assert/strict";
import { test } from "node:test";
import { chooseBackend, rgError } from "../src/lib/search";

const MAC = false;
const WIN = true;

const enoent = () => {
  const err: NodeJS.ErrnoException = new Error("spawn rg ENOENT");
  err.code = "ENOENT";
  return err;
};

test("a missing ripgrep is named, and says how to get it", () => {
  // The platform is passed rather than inherited so both arms are reachable
  // from either host, and so the assertion cannot silently invert on the
  // machine of whoever runs the suite next.
  const onMac = rgError(enoent(), MAC);
  assert.match(onMac.message, /ripgrep is not installed/);
  assert.match(onMac.message, /brew install ripgrep/);
});

test("the install command names the package manager of the platform", () => {
  // A macOS user told to run winget, or a Windows user told to run brew, is
  // told to install nothing at all: neither command exists on the other side.
  const onWindows = rgError(enoent(), WIN);
  assert.match(onWindows.message, /ripgrep is not installed/);
  assert.match(onWindows.message, /winget install BurntSushi\.ripgrep\.MSVC/);
  assert.doesNotMatch(onWindows.message, /brew/);
});

test("every other spawn failure reaches the user as it was thrown", () => {
  // Identity, not a rewrite. A permissions or resource failure says something
  // specific, and burying it under advice about a package manager would send
  // the user off to fix the one thing that is not wrong.
  const err: NodeJS.ErrnoException = new Error("spawn rg EACCES");
  err.code = "EACCES";
  assert.equal(rgError(err, MAC), err);
  assert.equal(rgError(err, WIN), err);
});

test("an installed ripgrep is preferred over one found on PATH", () => {
  // The managed copy is a known version at a known path; a PATH hit is
  // whatever the machine happens to have, including a shim that resolves
  // somewhere else entirely.
  const backend = chooseBackend({ managed: "/support/bin/rg", onPath: "rg" });
  assert.equal(backend.bin, "/support/bin/rg");
  assert.equal(backend.kind, "ripgrep");
});

test("a ripgrep on PATH is used when none has been installed", () => {
  // The common case for anyone who already had it: nothing is downloaded and
  // the fast path is taken anyway.
  const backend = chooseBackend({
    managed: null,
    onPath: "/opt/homebrew/bin/rg",
  });
  assert.equal(backend.bin, "/opt/homebrew/bin/rg");
  assert.equal(backend.kind, "ripgrep");
});

test("without ripgrep the search still runs, on system grep", () => {
  // The reason the extension has no hard dependency to declare: a machine with
  // neither ripgrep installed nor a network to fetch one still searches, just
  // more slowly.
  const backend = chooseBackend({ managed: null, onPath: null });
  assert.equal(backend.kind, "grep");
  assert.equal(backend.bin, "/usr/bin/grep");
});

test("grep is asked for the same treatment ripgrep is given", () => {
  // Both passes depend on these: -F so a query of "a.b" is not a pattern, -i
  // to match the case-folded sweep the ranking assumes, and a binary-blind
  // read so one stray NUL in the corpus cannot abandon the rest of it.
  const { base } = chooseBackend({ managed: null, onPath: null });
  for (const flag of ["-F", "-i", "-a"]) assert.ok(base.includes(flag));
});

test("neither backend is allowed to colour what it prints", () => {
  // Escape sequences in a corpus line would survive into the snippet and the
  // offsets the marking is computed from.
  for (const args of [
    chooseBackend({ managed: "/support/bin/rg", onPath: null }),
    chooseBackend({ managed: null, onPath: null }),
  ])
    assert.ok(args.base.includes("--color=never"));
});
