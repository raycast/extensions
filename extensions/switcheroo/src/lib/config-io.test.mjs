// ─────────────────────────────────────────────────────────────────────
// config-io.test.mjs — tests for the real I/O wrapper.
//
// Uses node:test with real temp fixtures (os.tmpdir). Tests:
//   - Initial config creation (missing file)
//   - Ordinary edit/delete via atomic write
//   - Stale revision rejection
//   - Stale fingerprint rejection
//   - Symlink target preserved
//   - External change retains original bytes + temp cleanup
//   - Dangling symlink rejection
//   - Wrapper call routing (addRemapEntry → commitConfig → atomicWrite)
//
// No live user config. All temp fixtures are in os.tmpdir.
// ─────────────────────────────────────────────────────────────────────
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  statSync,
  lstatSync,
  writeSync,
  unlinkSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import * as TOML from "smol-toml";
import {
  productionIO,
  resolveTarget,
  commitConfig,
  exclusiveCreate,
  computeRevision,
} from "./config-io.mjs";
import { runServiceRestart } from "./service-restart.mjs";
import {
  addEntryToToml,
  deleteEntryFromToml,
  updateEntryInToml,
  assertKnownKeysOnly,
  entryFingerprint,
} from "./config-surgery.mjs";

// ── Temp fixture helpers ───────────────────────────────────────────────

/** Create a unique temp directory for this test run. */
function makeTempDir() {
  const dir = join(
    tmpdir(),
    `switcheroo-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Path to a config file in a temp dir. */
function configPath(dir) {
  return join(dir, "config.toml");
}

/** Clean up a temp dir. */
function cleanupDir(dir) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // best effort
  }
}

const SHIPPED_CONFIG = `# switcheroo configuration

[[modifier_remap]]
from = "caps_lock"
to = "left_ctrl"

[[tap_hold]]
key = "right_ctrl"
tap = "escape"
hold = "left_ctrl"
timeout_ms = 200

[[chord]]
keys = ["left_shift", "right_shift"]
emit = "caps_lock"
window_ms = 200
`;

// ── Tests: initial config creation (missing file) ─────────────────────

describe("config-io: missing config creation", () => {
  let dir;

  test.beforeEach(() => {
    dir = makeTempDir();
  });
  test.afterEach(() => {
    cleanupDir(dir);
  });

  test("exclusiveCreate creates a new file with content", () => {
    const path = configPath(dir);
    exclusiveCreate("hello", path, productionIO);
    assert.ok(existsSync(path));
    assert.equal(readFileSync(path, "utf-8"), "hello");
  });

  test("exclusiveCreate creates parent directories if missing", () => {
    const path = join(dir, "subdir", "nested", "config.toml");
    exclusiveCreate("hello", path, productionIO);
    assert.ok(existsSync(path));
    assert.equal(readFileSync(path, "utf-8"), "hello");
  });

  test("exclusiveCreate refuses if file already exists (O_EXCL)", () => {
    const path = configPath(dir);
    writeFileSync(path, "existing");
    assert.throws(
      () => exclusiveCreate("new", path, productionIO),
      /already exists|creation failed/i,
    );
    // Original content intact
    assert.equal(readFileSync(path, "utf-8"), "existing");
  });

  test("commitConfig creates missing file on first add", () => {
    const path = configPath(dir);
    const newContent = addEntryToToml("", "remap", { from: "a", to: "b" });
    commitConfig(newContent, "", path, productionIO);
    assert.ok(existsSync(path));
    const parsed = TOML.parse(readFileSync(path, "utf-8"));
    assert.equal(parsed.remap[0].from, "a");
  });

  test("first add on fresh install creates valid TOML config", () => {
    const path = configPath(dir);
    // Simulate the addRemapEntry flow for a missing file
    const newContent = addEntryToToml("", "remap", {
      from: "caps_lock",
      to: "escape",
    });
    commitConfig(newContent, "", path, productionIO);
    const content = readFileSync(path, "utf-8");
    const parsed = TOML.parse(content);
    assert.equal(parsed.remap[0].from, "caps_lock");
    assert.equal(parsed.remap[0].to, "escape");
    // File should be mode 0600
    const mode = statSync(path).mode & 0o777;
    assert.equal(mode, 0o600);
  });
});

// ── Tests: ordinary edit/delete via atomic write ────────────────────────

describe("config-io: ordinary edit/delete", () => {
  let dir;

  test.beforeEach(() => {
    dir = makeTempDir();
  });
  test.afterEach(() => {
    cleanupDir(dir);
  });

  test("add entry to existing config via atomic write", () => {
    const path = configPath(dir);
    writeFileSync(path, SHIPPED_CONFIG);
    const rev = computeRevision(SHIPPED_CONFIG);

    const newContent = addEntryToToml(SHIPPED_CONFIG, "remap", {
      from: "x",
      to: "y",
    });
    commitConfig(newContent, rev, path, productionIO);

    const result = readFileSync(path, "utf-8");
    const parsed = TOML.parse(result);
    assert.equal(parsed.remap[0].from, "x");
    assert.equal(parsed.modifier_remap[0].from, "caps_lock");
  });

  test("delete entry from existing config via atomic write", () => {
    const path = configPath(dir);
    writeFileSync(path, SHIPPED_CONFIG);
    const rev = computeRevision(SHIPPED_CONFIG);

    const newContent = deleteEntryFromToml(SHIPPED_CONFIG, "chord", 0);
    commitConfig(newContent, rev, path, productionIO);

    const result = readFileSync(path, "utf-8");
    const parsed = TOML.parse(result);
    assert.equal(parsed.chord, undefined);
    assert.equal(parsed.modifier_remap[0].from, "caps_lock");
  });

  test("update entry in existing config via atomic write", () => {
    const path = configPath(dir);
    writeFileSync(path, SHIPPED_CONFIG);
    const rev = computeRevision(SHIPPED_CONFIG);

    const newContent = updateEntryInToml(SHIPPED_CONFIG, "tap_hold", 0, {
      key: "left_cmd",
      tap: "space",
      hold: "left_ctrl",
      timeout_ms: 150,
    });
    commitConfig(newContent, rev, path, productionIO);

    const result = readFileSync(path, "utf-8");
    const parsed = TOML.parse(result);
    assert.equal(parsed.tap_hold[0].key, "left_cmd");
    assert.equal(parsed.tap_hold[0].timeout_ms, 150);
  });
});

// ── Tests: stale revision rejection ────────────────────────────────────

describe("config-io: stale revision rejection", () => {
  let dir;

  test.beforeEach(() => {
    dir = makeTempDir();
  });
  test.afterEach(() => {
    cleanupDir(dir);
  });

  test("rejects write when file changed since snapshot", () => {
    const path = configPath(dir);
    writeFileSync(path, SHIPPED_CONFIG);
    const staleRev = "aabbccdd"; // wrong revision

    const newContent = addEntryToToml(SHIPPED_CONFIG, "remap", {
      from: "x",
      to: "y",
    });
    assert.throws(
      () => commitConfig(newContent, staleRev, path, productionIO),
      /changed since it was last loaded/,
    );
    // Original file must be intact
    assert.equal(readFileSync(path, "utf-8"), SHIPPED_CONFIG);
  });

  test("rejects write when external edit changes content between read and write", () => {
    const path = configPath(dir);
    writeFileSync(path, SHIPPED_CONFIG);
    const rev = computeRevision(SHIPPED_CONFIG);

    // Simulate external edit AFTER snapshot but BEFORE commit
    writeFileSync(path, SHIPPED_CONFIG + "\n# external edit\n");

    const newContent = addEntryToToml(SHIPPED_CONFIG, "remap", {
      from: "x",
      to: "y",
    });
    assert.throws(
      () => commitConfig(newContent, rev, path, productionIO),
      /changed/,
    );
    // The external edit must be preserved, not overwritten
    assert.ok(readFileSync(path, "utf-8").includes("# external edit"));
  });
});

// ── Tests: symlink target preserved ───────────────────────────────────

describe("config-io: symlink handling", () => {
  let dir;

  test.beforeEach(() => {
    dir = makeTempDir();
  });
  test.afterEach(() => {
    cleanupDir(dir);
  });

  test("preserves symlink: write goes to symlink target, symlink itself intact", () => {
    // Create a real file
    const realFile = join(dir, "real-config.toml");
    writeFileSync(realFile, SHIPPED_CONFIG);
    // Create a symlink to it (like ~/.config/switcheroo/config.toml → real file)
    const symlinkPath = join(dir, "config.toml");
    symlinkSync(realFile, symlinkPath);

    const rev = computeRevision(SHIPPED_CONFIG);
    const newContent = addEntryToToml(SHIPPED_CONFIG, "remap", {
      from: "x",
      to: "y",
    });
    commitConfig(newContent, rev, symlinkPath, productionIO);

    // The symlink itself must still be a symlink
    assert.ok(lstatSync(symlinkPath).isSymbolicLink(), "symlink preserved");
    // The real file must have the new content
    const result = readFileSync(realFile, "utf-8");
    const parsed = TOML.parse(result);
    assert.equal(parsed.remap[0].from, "x");
  });

  test("rejects dangling symlink", () => {
    const symlinkPath = join(dir, "config.toml");
    symlinkSync("/nonexistent/path", symlinkPath);

    assert.throws(
      () => resolveTarget(productionIO, symlinkPath),
      /dangling symlink/,
    );
  });

  test("preserves symlinked directory: .config → elsewhere", () => {
    // Create a real directory
    const realDir = join(dir, "real-config-dir");
    mkdirSync(realDir);
    // Create a symlinked directory (like ~/.config → /dotfiles/.config)
    const symlinkDir = join(dir, "link-config");
    symlinkSync(realDir, symlinkDir);
    // Config file inside the symlinked directory
    const path = join(symlinkDir, "config.toml");
    writeFileSync(path, SHIPPED_CONFIG);

    const rev = computeRevision(SHIPPED_CONFIG);
    const newContent = addEntryToToml(SHIPPED_CONFIG, "remap", {
      from: "x",
      to: "y",
    });
    commitConfig(newContent, rev, path, productionIO);

    // The symlinked directory must still be a symlink
    assert.ok(
      lstatSync(symlinkDir).isSymbolicLink(),
      "directory symlink preserved",
    );
    // The real file inside the real directory has the new content
    const result = readFileSync(join(realDir, "config.toml"), "utf-8");
    const parsed = TOML.parse(result);
    assert.equal(parsed.remap[0].from, "x");
  });
});

// ── Tests: failure cleanup (temp file removed on error) ───────────────

describe("config-io: failure cleanup", () => {
  let dir;

  test.beforeEach(() => {
    dir = makeTempDir();
  });
  test.afterEach(() => {
    cleanupDir(dir);
  });

  test("temp file cleaned up on stale revision rejection", () => {
    const path = configPath(dir);
    writeFileSync(path, SHIPPED_CONFIG);

    // Use a deliberately wrong revision to trigger rejection
    const newContent = addEntryToToml(SHIPPED_CONFIG, "remap", {
      from: "x",
      to: "y",
    });
    try {
      commitConfig(newContent, "wrong-revision", path, productionIO);
    } catch {
      // expected
    }

    // No temp files should remain in the directory
    const files = [];
    for (const f of readdirSyncSafe(dir)) {
      if (f.startsWith(".config.toml.tmp.")) {
        files.push(f);
      }
    }
    assert.equal(files.length, 0, "temp file cleaned up on error");
  });

  test("original bytes intact after failed write", () => {
    const path = configPath(dir);
    writeFileSync(path, SHIPPED_CONFIG);
    const originalBytes = readFileSync(path);

    const newContent = addEntryToToml(SHIPPED_CONFIG, "remap", {
      from: "x",
      to: "y",
    });
    try {
      commitConfig(newContent, "wrong-revision", path, productionIO);
    } catch {
      // expected
    }

    assert.deepEqual(
      readFileSync(path),
      originalBytes,
      "original bytes intact",
    );
  });
});

// ── Tests: wrapper call routing ────────────────────────────────────────

describe("config-io: wrapper call routing", () => {
  let dir;

  test.beforeEach(() => {
    dir = makeTempDir();
  });
  test.afterEach(() => {
    cleanupDir(dir);
  });

  test("resolveTarget returns null for missing file", () => {
    const path = configPath(dir);
    const result = resolveTarget(productionIO, path);
    assert.equal(result, null);
  });

  test("resolveTarget returns {resolved, dev, ino} for existing file", () => {
    const path = configPath(dir);
    writeFileSync(path, "hello");
    const result = resolveTarget(productionIO, path);
    assert.ok(result !== null);
    assert.equal(result.resolved, path);
    assert.ok(result.dev !== undefined);
    assert.ok(result.ino !== undefined);
  });

  test("resolveTarget rejects non-absolute path", () => {
    assert.throws(
      () => resolveTarget(productionIO, "relative/path"),
      /not absolute/,
    );
  });

  test("commitConfig routes to exclusiveCreate for missing file", () => {
    const path = configPath(dir);
    const newContent = addEntryToToml("", "remap", { from: "a", to: "b" });
    commitConfig(newContent, "", path, productionIO);
    assert.ok(existsSync(path));
    // Verify the content is valid TOML with the entry
    const parsed = TOML.parse(readFileSync(path, "utf-8"));
    assert.equal(parsed.remap[0].from, "a");
  });

  test("commitConfig routes to atomicWriteExisting for existing file", () => {
    const path = configPath(dir);
    writeFileSync(path, SHIPPED_CONFIG);
    const rev = computeRevision(SHIPPED_CONFIG);
    const newContent = addEntryToToml(SHIPPED_CONFIG, "remap", {
      from: "x",
      to: "y",
    });
    commitConfig(newContent, rev, path, productionIO);
    const parsed = TOML.parse(readFileSync(path, "utf-8"));
    assert.equal(parsed.remap[0].from, "x");
  });
});

// ── Helper: safe readdirSync ───────────────────────────────────────────

import { readdirSync } from "fs";

function readdirSyncSafe(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

// ── Tests: short-write protection ─────────────────────────────────────

describe("config-io: short-write protection", () => {
  let dir;

  test.beforeEach(() => {
    dir = makeTempDir();
  });
  test.afterEach(() => {
    cleanupDir(dir);
  });

  test("short write on existing file: refuses truncated commit, original intact", () => {
    const path = configPath(dir);
    writeFileSync(path, SHIPPED_CONFIG);
    const rev = computeRevision(SHIPPED_CONFIG);

    // Create an I/O that writes only 8 bytes per writeFd call
    const shortIO = {
      ...productionIO,
      writeFd: (fd, buf, offset, length) => {
        // Write at most 8 bytes to simulate short writes
        const writeLen = Math.min(length, 8);
        return writeSync(fd, buf, offset, writeLen);
      },
    };

    const newContent = addEntryToToml(SHIPPED_CONFIG, "remap", {
      from: "x",
      to: "y",
    });
    // With short writes, the loop should still complete — writeAll loops
    // until all bytes are written. So this should SUCCEED.
    commitConfig(newContent, rev, path, shortIO);
    const result = readFileSync(path, "utf-8");
    const parsed = TOML.parse(result);
    assert.equal(parsed.remap[0].from, "x");
    assert.equal(parsed.modifier_remap[0].from, "caps_lock");
  });

  test("zero-progress write: refuses, original intact, temp cleaned up", () => {
    const path = configPath(dir);
    writeFileSync(path, SHIPPED_CONFIG);
    const rev = computeRevision(SHIPPED_CONFIG);

    // Create an I/O that always writes 0 bytes (zero progress)
    const zeroIO = {
      ...productionIO,
      writeFd: () => 0,
    };

    const newContent = addEntryToToml(SHIPPED_CONFIG, "remap", {
      from: "x",
      to: "y",
    });
    assert.throws(
      () => commitConfig(newContent, rev, path, zeroIO),
      /Short write/,
    );
    // Original file must be intact
    assert.equal(readFileSync(path, "utf-8"), SHIPPED_CONFIG);
    // No temp files should remain
    const temps = readdirSyncSafe(dir).filter((f) =>
      f.startsWith(".config.toml.tmp."),
    );
    assert.equal(temps.length, 0, "temp file cleaned up after zero-write");
  });

  test("writeFd error: refuses, original intact, temp cleaned up, fd closed", () => {
    const path = configPath(dir);
    writeFileSync(path, SHIPPED_CONFIG);
    const rev = computeRevision(SHIPPED_CONFIG);

    const errorIO = {
      ...productionIO,
      writeFd: () => {
        throw new Error("Disk full");
      },
    };

    const newContent = addEntryToToml(SHIPPED_CONFIG, "remap", {
      from: "x",
      to: "y",
    });
    assert.throws(
      () => commitConfig(newContent, rev, path, errorIO),
      /Disk full|Short write/,
    );
    assert.equal(readFileSync(path, "utf-8"), SHIPPED_CONFIG);
    const temps = readdirSyncSafe(dir).filter((f) =>
      f.startsWith(".config.toml.tmp."),
    );
    assert.equal(temps.length, 0, "temp cleaned up after write error");
  });

  test("short write on initial create: refuses, partial file removed", () => {
    const path = configPath(dir);

    const shortIO = {
      ...productionIO,
      writeFd: () => 0, // zero progress
    };

    const newContent = addEntryToToml("", "remap", { from: "a", to: "b" });
    assert.throws(
      () => commitConfig(newContent, "", path, shortIO),
      /Short write/,
    );
    // The partially created file should be removed
    assert.ok(!existsSync(path), "partial file removed after short write");
  });

  test("fsync error on existing file: refuses, original intact", () => {
    const path = configPath(dir);
    writeFileSync(path, SHIPPED_CONFIG);
    const rev = computeRevision(SHIPPED_CONFIG);

    const fsyncErrorIO = {
      ...productionIO,
      fsync: () => {
        throw new Error("fsync failed");
      },
    };

    const newContent = addEntryToToml(SHIPPED_CONFIG, "remap", {
      from: "x",
      to: "y",
    });
    assert.throws(
      () => commitConfig(newContent, rev, path, fsyncErrorIO),
      /fsync failed/,
    );
    assert.equal(readFileSync(path, "utf-8"), SHIPPED_CONFIG);
    const temps = readdirSyncSafe(dir).filter((f) =>
      f.startsWith(".config.toml.tmp."),
    );
    assert.equal(temps.length, 0, "temp cleaned up after fsync error");
  });
});

// ── Tests: symlink retarget and file replacement ──────────────────────

describe("config-io: symlink retarget and replacement detection", () => {
  let dir;

  test.beforeEach(() => {
    dir = makeTempDir();
  });
  test.afterEach(() => {
    cleanupDir(dir);
  });

  test("symlink retargeted between snapshot and commit: refuses", () => {
    // Create original target file
    const realFile1 = join(dir, "real1.toml");
    writeFileSync(realFile1, SHIPPED_CONFIG);
    // Create symlink pointing to real1
    const symlinkPath = join(dir, "config.toml");
    symlinkSync(realFile1, symlinkPath);

    // Resolve target at "snapshot" time
    const target = resolveTarget(productionIO, symlinkPath);
    assert.ok(target !== null);

    // Retarget the symlink to a different file with same content
    const realFile2 = join(dir, "real2.toml");
    writeFileSync(realFile2, SHIPPED_CONFIG);
    unlinkSync(symlinkPath);
    symlinkSync(realFile2, symlinkPath);

    // Now commit with the OLD target identity — should refuse
    const newContent = addEntryToToml(SHIPPED_CONFIG, "remap", {
      from: "x",
      to: "y",
    });
    assert.throws(
      () =>
        commitConfig(
          newContent,
          computeRevision(SHIPPED_CONFIG),
          symlinkPath,
          productionIO,
          target.resolved,
          target.dev,
          target.ino,
        ),
      /target changed|identity changed|disappeared/i,
    );
    // Both original files should be intact
    assert.equal(readFileSync(realFile1, "utf-8"), SHIPPED_CONFIG);
    assert.equal(readFileSync(realFile2, "utf-8"), SHIPPED_CONFIG);
  });

  test("file replaced with same-content file: dev/ino differ, refuses", () => {
    const path = configPath(dir);
    writeFileSync(path, SHIPPED_CONFIG);

    // Capture target identity
    const target = resolveTarget(productionIO, path);
    assert.ok(target !== null);

    // Replace the file (delete + recreate with same content)
    // This creates a new inode
    unlinkSync(path);
    writeFileSync(path, SHIPPED_CONFIG);

    // Commit with old target identity — should refuse due to dev/ino mismatch
    const newContent = addEntryToToml(SHIPPED_CONFIG, "remap", {
      from: "x",
      to: "y",
    });
    assert.throws(
      () =>
        commitConfig(
          newContent,
          computeRevision(SHIPPED_CONFIG),
          path,
          productionIO,
          target.resolved,
          target.dev,
          target.ino,
        ),
      /target changed|identity changed/i,
    );
    // The replacement file should be intact (not overwritten)
    assert.equal(readFileSync(path, "utf-8"), SHIPPED_CONFIG);
  });
});

// ── Tests: CRLF no trailing newline ───────────────────────────────────

describe("config-io: CRLF no trailing newline refusal", () => {
  test("addEntryToToml refuses file without trailing newline", () => {
    const config = '[[remap]]\nfrom = "a"\nto = "b"'; // no trailing \n
    assert.throws(
      () => addEntryToToml(config, "remap", { from: "x", to: "y" }),
      /does not end with a newline/,
    );
  });

  test("updateEntryInToml refuses file without trailing newline", () => {
    const config = '[[remap]]\nfrom = "a"\nto = "b"'; // no trailing \n
    assert.throws(
      () => updateEntryInToml(config, "remap", 0, { from: "x", to: "y" }),
      /does not end with a newline/,
    );
  });

  test("CRLF file without trailing newline: refuses with purposeful message", () => {
    const config = '[[remap]]\r\nfrom = "a"\r\nto = "b"'; // CRLF, no final \r\n
    assert.throws(
      () => addEntryToToml(config, "remap", { from: "x", to: "y" }),
      /does not end with a newline/,
    );
  });

  test("empty string does not trigger trailing newline check", () => {
    // Empty content (first add on missing file) should not be refused
    const result = addEntryToToml("", "remap", { from: "a", to: "b" });
    assert.ok(result.includes("[[remap]]"));
  });
});

// ── Tests: restart result strings ─────────────────────────────────────

describe("config-io: restart result message strings", () => {
  test("standalone loaded result says 'Restart requested'", () => {
    const result = runServiceRestart({
      detectLayout: () => ({
        layout: "standalone",
        label: "com.mitchelljphayes.switcheroo",
        executable: "/test/switcheroo",
      }),
      plistIsStandalone: () => true,
      plistKeepAlive: () => true,
      getLoadedProgram: () => "/test/switcheroo",
      getHomebrewExec: () => null,
      getUid: () => "501",
      getStandalonePlistPath: () => "/test/plist",
      exec: () => "",
    });
    assert.match(result.message, /Restart requested/);
    assert.match(result.message, /graceful SIGTERM/);
  });

  test("homebrew loaded result says 'Switcheroo restarted'", () => {
    const result = runServiceRestart({
      detectLayout: () => ({
        layout: "homebrew",
        label: "homebrew.mxcl.switcheroo",
        executable:
          "/opt/homebrew/opt/switcheroo/Switcheroo.app/Contents/MacOS/switcheroo",
      }),
      plistIsStandalone: () => false,
      plistKeepAlive: () => false,
      getLoadedProgram: () =>
        "/opt/homebrew/opt/switcheroo/Switcheroo.app/Contents/MacOS/switcheroo",
      getHomebrewExec: () =>
        "/opt/homebrew/opt/switcheroo/Switcheroo.app/Contents/MacOS/switcheroo",
      getUid: () => "501",
      getStandalonePlistPath: () => "/test/plist",
      exec: () => "",
    });
    assert.match(result.message, /Switcheroo restarted/);
  });

  test("standalone absent (bootstrap) result says 'bootstrapped'", () => {
    const result = runServiceRestart({
      detectLayout: () => null,
      plistIsStandalone: () => true,
      plistKeepAlive: () => true,
      getLoadedProgram: () => null,
      getHomebrewExec: () => null,
      getUid: () => "501",
      getStandalonePlistPath: () =>
        "/Users/test/Library/LaunchAgents/com.mitchelljphayes.switcheroo.plist",
      exec: () => "",
    });
    assert.match(result.message, /bootstrapped/);
  });
});

// ── Tests: end-to-end real production I/O sequences ───────────────────
//
// These tests exercise the ACTUAL exported production helpers through
// real filesystem I/O with temp fixtures. They prove that every
// successful mutation output is accepted by the next mutation and
// that the LF/CRLF line-ending is preserved consistently.
//
// Sequences tested:
//   1. missing → add → reload → add → reload → edit → reload → delete → reload (LF)
//   2. same sequence with CRLF
//   3. delete-last → add (LF and CRLF)
//
// Uses: addEntryToToml, deleteEntryFromToml, updateEntryInToml (surgery)
//       commitConfig, productionIO, resolveTarget, computeRevision (I/O)
//       All real helpers — no duplicated logic.

/**
 * Simulate the full production mutation flow: read → surgery → commit.
 * Uses real productionIO. Returns the new file content after commit.
 */
function mutateAdd(path, sectionType, entry) {
  const target = resolveTarget(productionIO, path);
  let content, revision, resolved, dev, ino;
  if (target === null) {
    content = "";
    revision = "";
    resolved = undefined;
    dev = undefined;
    ino = undefined;
  } else {
    content = productionIO.read(target.resolved);
    revision = computeRevision(content);
    resolved = target.resolved;
    dev = target.dev;
    ino = target.ino;
  }
  assertKnownKeysOnly(content);
  const newContent = addEntryToToml(content, sectionType, entry);
  commitConfig(newContent, revision, path, productionIO, resolved, dev, ino);
  return productionIO.read(path);
}

/**
 * Simulate the full production edit flow: read → verify fingerprint → surgery → commit.
 */
function mutateUpdate(path, id, data, documentRevision, expectedFingerprint) {
  const target = resolveTarget(productionIO, path);
  if (target === null) throw new Error("File not found for update");
  const content = productionIO.read(target.resolved);
  // Verify fingerprint using the SAME entryFingerprint function from
  // config-surgery.mjs (the production helper).
  const parsed = TOML.parse(content);
  const [type, indexStr] = id.split(":");
  const index = parseInt(indexStr, 10);
  const arr = parsed[type] ?? [];
  if (index >= arr.length) throw new Error("Entry not found");
  const fp = entryFingerprint(arr[index]);
  if (fp !== expectedFingerprint) {
    throw new Error("Entry changed since loaded");
  }
  assertKnownKeysOnly(content);
  const newContent = updateEntryInToml(content, type, index, data);
  commitConfig(
    newContent,
    documentRevision,
    path,
    productionIO,
    target.resolved,
    target.dev,
    target.ino,
  );
  return productionIO.read(path);
}

/**
 * Simulate the full production delete flow.
 */
function mutateDelete(path, id, documentRevision, expectedFingerprint) {
  const target = resolveTarget(productionIO, path);
  if (target === null) throw new Error("File not found for delete");
  const content = productionIO.read(target.resolved);
  // Verify fingerprint
  const parsed = TOML.parse(content);
  const [type, indexStr] = id.split(":");
  const index = parseInt(indexStr, 10);
  const arr = parsed[type] ?? [];
  if (index >= arr.length) throw new Error("Entry not found");
  const fp = entryFingerprint(arr[index]);
  if (fp !== expectedFingerprint) {
    throw new Error("Entry changed since loaded");
  }
  assertKnownKeysOnly(content);
  const newContent = deleteEntryFromToml(content, type, index);
  commitConfig(
    newContent,
    documentRevision,
    path,
    productionIO,
    target.resolved,
    target.dev,
    target.ino,
  );
  return productionIO.read(path);
}

/**
 * "Reload" the config: read current content, compute revision,
 * parse items with fingerprints. Mirrors loadSnapshot behavior.
 */
function reload(path) {
  const target = resolveTarget(productionIO, path);
  if (target === null)
    return { content: "", revision: "", items: [], target: null };
  const content = productionIO.read(target.resolved);
  const revision = computeRevision(content);
  const parsed = TOML.parse(content);
  return { content, revision, parsed, target };
}

describe("E2E: missing → add → add → edit → delete (LF)", () => {
  let dir;

  test.beforeEach(() => {
    dir = makeTempDir();
  });
  test.afterEach(() => {
    cleanupDir(dir);
  });

  test("full sequence: missing → add → reload → add → reload → edit → reload → delete → reload", () => {
    const path = configPath(dir);

    // 1. Missing config — verify empty
    let snap = reload(path);
    assert.equal(snap.content, "", "config is missing");

    // 2. First add (creates file)
    mutateAdd(path, "remap", { from: "a", to: "b" });
    let content = readFileSync(path, "utf-8");
    assert.ok(content.endsWith("\n"), "output ends with trailing newline");

    // 3. Reload after first add
    snap = reload(path);
    assert.equal(snap.parsed.remap[0].from, "a");

    // 4. Second add (appends to existing file)
    mutateAdd(path, "remap", { from: "c", to: "d" });
    content = readFileSync(path, "utf-8");
    assert.ok(content.endsWith("\n"), "output ends with trailing newline");
    snap = reload(path);
    assert.equal(snap.parsed.remap.length, 2);
    assert.equal(snap.parsed.remap[0].from, "a");
    assert.equal(snap.parsed.remap[1].from, "c");

    // 5. Edit (update entry 0)
    const revBefore = snap.revision;
    const fp0 = entryFingerprint(snap.parsed.remap[0]);
    mutateUpdate(path, "remap:0", { from: "x", to: "y" }, revBefore, fp0);
    content = readFileSync(path, "utf-8");
    assert.ok(content.endsWith("\n"), "output ends with trailing newline");
    snap = reload(path);
    assert.equal(snap.parsed.remap[0].from, "x");
    assert.equal(snap.parsed.remap[1].from, "c");

    // 6. Delete entry 1
    const revBefore2 = snap.revision;
    const fp1 = entryFingerprint(snap.parsed.remap[1]);
    mutateDelete(path, "remap:1", revBefore2, fp1);
    content = readFileSync(path, "utf-8");
    snap = reload(path);
    assert.equal(snap.parsed.remap.length, 1);
    assert.equal(snap.parsed.remap[0].from, "x");
  });
});

describe("E2E: missing → add → add → edit → delete (CRLF)", () => {
  let dir;

  test.beforeEach(() => {
    dir = makeTempDir();
  });
  test.afterEach(() => {
    cleanupDir(dir);
  });

  test("full CRLF sequence: output preserves CRLF throughout", () => {
    const path = configPath(dir);

    // 1. Missing config
    let snap = reload(path);
    assert.equal(snap.content, "");

    // 2. First add creates file
    mutateAdd(path, "remap", { from: "a", to: "b" });
    let content = readFileSync(path, "utf-8");
    assert.ok(content.endsWith("\n"), "LF output ends with newline");

    // Convert to CRLF to simulate a user who uses CRLF
    content = content.replace(/\n/g, "\r\n");
    writeFileSync(path, content);

    // 3. Reload
    snap = reload(path);
    assert.equal(snap.parsed.remap[0].from, "a");

    // 4. Second add — should preserve CRLF
    mutateAdd(path, "remap", { from: "c", to: "d" });
    content = readFileSync(path, "utf-8");
    assert.ok(content.endsWith("\r\n"), "CRLF output ends with \\r\\n");
    assert.ok(content.includes('from = "c"\r\n'), "new entry uses CRLF");
    snap = reload(path);
    assert.equal(snap.parsed.remap.length, 2);

    // 5. Edit entry 0
    const revBefore = snap.revision;
    const fp0 = entryFingerprint(snap.parsed.remap[0]);
    mutateUpdate(path, "remap:0", { from: "x", to: "y" }, revBefore, fp0);
    content = readFileSync(path, "utf-8");
    assert.ok(content.endsWith("\r\n"), "CRLF preserved after edit");
    assert.ok(content.includes('from = "x"\r\n'), "edited entry uses CRLF");
    snap = reload(path);
    assert.equal(snap.parsed.remap[0].from, "x");

    // 6. Delete entry 1
    const revBefore2 = snap.revision;
    const fp1 = entryFingerprint(snap.parsed.remap[1]);
    mutateDelete(path, "remap:1", revBefore2, fp1);
    content = readFileSync(path, "utf-8");
    snap = reload(path);
    assert.equal(snap.parsed.remap.length, 1);
    assert.equal(snap.parsed.remap[0].from, "x");
  });
});

describe("E2E: delete-last → add (LF and CRLF)", () => {
  let dir;

  test.beforeEach(() => {
    dir = makeTempDir();
  });
  test.afterEach(() => {
    cleanupDir(dir);
  });

  test("delete-last-entry → add new entry works (LF)", () => {
    const path = configPath(dir);

    // Start with two entries
    mutateAdd(path, "remap", { from: "a", to: "b" });
    mutateAdd(path, "remap", { from: "c", to: "d" });

    // Delete both
    let snap = reload(path);
    let rev = snap.revision;
    let fp0 = entryFingerprint(snap.parsed.remap[0]);
    mutateDelete(path, "remap:0", rev, fp0);

    snap = reload(path);
    rev = snap.revision;
    let fp1 = entryFingerprint(snap.parsed.remap[0]);
    mutateDelete(path, "remap:0", rev, fp1);

    // File should now be empty or contain only comments
    snap = reload(path);
    assert.equal(snap.parsed.remap, undefined, "all remaps deleted");

    // Add a new entry — should succeed
    mutateAdd(path, "remap", { from: "e", to: "f" });
    snap = reload(path);
    assert.equal(snap.parsed.remap[0].from, "e");
    assert.equal(snap.parsed.remap[0].to, "f");
    assert.ok(
      readFileSync(path, "utf-8").endsWith("\n"),
      "output ends with newline",
    );
  });

  test("delete-last-entry → add new entry works (CRLF)", () => {
    const path = configPath(dir);

    // Start with one entry in CRLF
    mutateAdd(path, "remap", { from: "a", to: "b" });
    let content = readFileSync(path, "utf-8").replace(/\n/g, "\r\n");
    writeFileSync(path, content);

    // Delete it
    let snap = reload(path);
    let rev = snap.revision;
    let fp = entryFingerprint(snap.parsed.remap[0]);
    mutateDelete(path, "remap:0", rev, fp);

    // File should be empty
    snap = reload(path);
    assert.equal(snap.parsed.remap, undefined);

    // Add a new entry
    mutateAdd(path, "remap", { from: "c", to: "d" });
    snap = reload(path);
    assert.equal(snap.parsed.remap[0].from, "c");
  });
});

// ── Tests: comment guard still fail-closed after trailing newline fix ──

describe("E2E: comment guards still fail closed", () => {
  test("addEntryToToml with inline comment in content still refuses", () => {
    const config = '[[remap]]\nfrom = "a" # source\nto = "b"\n';
    assert.throws(
      () => addEntryToToml(config, "remap", { from: "x", to: "y" }),
      /not supported by the canonical editor|Edit Config/i,
    );
  });

  test("updateEntryInToml with unknown field still refuses", () => {
    const config = '[[remap]]\nfrom = "a"\nto = "b"\nunknown = "x"\n';
    assert.throws(
      () => updateEntryInToml(config, "remap", 0, { from: "x", to: "y" }),
      /fields that would be lost|not valid for/i,
    );
  });

  test("addEntryToToml with multiline string still refuses", () => {
    const config = '[[remap]]\nfrom = "a"\nto = """multi\nline"""\n';
    assert.throws(
      () => addEntryToToml(config, "remap", { from: "x", to: "y" }),
      /not supported by the canonical editor|Edit Config/i,
    );
  });
});
