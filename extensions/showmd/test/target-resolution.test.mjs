import { test } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import {
  validatePath,
  pickPathViaDialog,
  resolveOpenTarget,
} from "../src/lib/target-resolution.ts";

function fakeDeps(overrides = {}) {
  return {
    platform: "darwin",
    stat: async () => null,
    readDir: async () => [],
    execFileImpl: async () => ({ stdout: "" }),
    ...overrides,
  };
}

test("validatePath folder: missing path fails", async () => {
  const result = await validatePath("folder", "/repo/missing", fakeDeps());
  assert.equal(result.ok, false);
  assert.match(result.error, /does not exist/);
});

test("validatePath folder: a file is rejected as not a folder", async () => {
  const result = await validatePath(
    "folder",
    "/repo/readme.md",
    fakeDeps({ stat: async () => ({ isFile: true, isDirectory: false }) }),
  );
  assert.equal(result.ok, false);
  assert.match(result.error, /is not a folder/);
});

test("validatePath folder: a folder with no markdown anywhere within the depth cap fails with a clear message", async () => {
  const result = await validatePath(
    "folder",
    "/repo",
    fakeDeps({
      stat: async () => ({ isFile: false, isDirectory: true }),
      readDir: async () => [{ name: "index.js", isDirectory: false }],
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.error, "No markdown files found in /repo");
});

test("validatePath folder: markdown found at the root is enough", async () => {
  const result = await validatePath(
    "folder",
    "/repo",
    fakeDeps({
      stat: async () => ({ isFile: false, isDirectory: true }),
      readDir: async () => [{ name: "readme.md", isDirectory: false }],
    }),
  );
  assert.deepEqual(result, { ok: true, path: "/repo" });
});

test("validatePath folder: markdown found several subdirectories deep, breadth-first with early exit", async () => {
  const calls = [];
  const tree = {
    "/repo": [{ name: "src", isDirectory: true }],
    "/repo/src": [{ name: "lib", isDirectory: true }],
    "/repo/src/lib": [{ name: "notes.md", isDirectory: false }],
    "/repo/src/lib/deeper": [{ name: "unreachable.md", isDirectory: false }],
  };
  const result = await validatePath(
    "folder",
    "/repo",
    fakeDeps({
      stat: async () => ({ isFile: false, isDirectory: true }),
      readDir: async (dir) => {
        calls.push(dir);
        return tree[dir] || [];
      },
    }),
  );
  assert.equal(result.ok, true);
  assert.ok(
    !calls.includes("/repo/src/lib/deeper"),
    "must stop once a hit is found",
  );
});

test("validatePath folder: a depth cap keeps the scan from going too deep", async () => {
  const readDir = async (dir) => {
    const depth = dir.split(path.sep).filter(Boolean).length - 1;
    if (depth >= 5) return [{ name: "buried.md", isDirectory: false }];
    return [{ name: "next", isDirectory: true }];
  };
  const result = await validatePath(
    "folder",
    "/repo",
    fakeDeps({
      stat: async () => ({ isFile: false, isDirectory: true }),
      readDir,
    }),
  );
  assert.equal(result.ok, false);
});

test("pickPathViaDialog folder: darwin runs osascript and returns the chosen path", async () => {
  let seen;
  const picked = await pickPathViaDialog(
    "folder",
    fakeDeps({
      execFileImpl: async (command, args) => {
        seen = { command, args };
        return { stdout: "/repo\n" };
      },
    }),
  );
  assert.equal(picked, "/repo");
  assert.equal(seen.command, "osascript");
});

test("pickPathViaDialog folder: win32 runs powershell", async () => {
  let seen;
  const picked = await pickPathViaDialog(
    "folder",
    fakeDeps({
      platform: "win32",
      execFileImpl: async (command, args) => {
        seen = { command, args };
        return { stdout: "C:\\repo\n" };
      },
    }),
  );
  assert.equal(picked, "C:\\repo");
  assert.equal(seen.command, "powershell");
});

test("pickPathViaDialog folder: a cancel (sentinel output) is null, not an error", async () => {
  const picked = await pickPathViaDialog(
    "folder",
    fakeDeps({ execFileImpl: async () => ({ stdout: "__CANCELED__\n" }) }),
  );
  assert.equal(picked, null);
});

test("pickPathViaDialog folder: a non-zero exit (rejected exec) is also treated as a cancel", async () => {
  const picked = await pickPathViaDialog(
    "folder",
    fakeDeps({
      execFileImpl: async () => {
        throw new Error("User canceled");
      },
    }),
  );
  assert.equal(picked, null);
});

test("pickPathViaDialog folder: empty stdout is a cancel", async () => {
  const picked = await pickPathViaDialog(
    "folder",
    fakeDeps({ execFileImpl: async () => ({ stdout: "" }) }),
  );
  assert.equal(picked, null);
});

test("pickPathViaDialog folder: unsupported platforms return null without shelling out", async () => {
  let called = false;
  const picked = await pickPathViaDialog(
    "folder",
    fakeDeps({
      platform: "linux",
      execFileImpl: async () => {
        called = true;
        return { stdout: "/repo" };
      },
    }),
  );
  assert.equal(picked, null);
  assert.equal(called, false);
});

test("resolveOpenTarget folder: canceling the dialog is a silent no-op, not an error", async () => {
  const result = await resolveOpenTarget(
    "folder",
    fakeDeps({ execFileImpl: async () => ({ stdout: "__CANCELED__" }) }),
  );
  assert.deepEqual(result, { ok: false, canceled: true });
});

test("resolveOpenTarget folder: a picked folder with no markdown surfaces the clear validation error", async () => {
  const result = await resolveOpenTarget(
    "folder",
    fakeDeps({
      execFileImpl: async () => ({ stdout: "/repo\n" }),
      stat: async () => ({ isFile: false, isDirectory: true }),
      readDir: async () => [{ name: "index.js", isDirectory: false }],
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.canceled, false);
  assert.equal(result.error, "No markdown files found in /repo");
});

test("resolveOpenTarget folder: a valid picked folder resolves", async () => {
  const result = await resolveOpenTarget(
    "folder",
    fakeDeps({
      execFileImpl: async () => ({ stdout: "/repo\n" }),
      stat: async () => ({ isFile: false, isDirectory: true }),
      readDir: async () => [{ name: "readme.md", isDirectory: false }],
    }),
  );
  assert.deepEqual(result, { ok: true, path: "/repo" });
});

test("validatePath file: missing path fails", async () => {
  const result = await validatePath("file", "/repo/missing.md", fakeDeps());
  assert.equal(result.ok, false);
  assert.match(result.error, /does not exist/);
});

test("validatePath file: a folder is rejected as not a file", async () => {
  const result = await validatePath(
    "file",
    "/repo",
    fakeDeps({ stat: async () => ({ isFile: false, isDirectory: true }) }),
  );
  assert.equal(result.ok, false);
  assert.match(result.error, /is not a file/);
});

test("validatePath file: a non-markdown file is rejected", async () => {
  const result = await validatePath(
    "file",
    "/repo/notes.txt",
    fakeDeps({ stat: async () => ({ isFile: true, isDirectory: false }) }),
  );
  assert.equal(result.ok, false);
  assert.match(result.error, /is not a markdown file/);
});

test("validatePath file: a .md file resolves", async () => {
  const result = await validatePath(
    "file",
    "/repo/readme.md",
    fakeDeps({ stat: async () => ({ isFile: true, isDirectory: false }) }),
  );
  assert.deepEqual(result, { ok: true, path: "/repo/readme.md" });
});

test("validatePath file: a .markdown file resolves", async () => {
  const result = await validatePath(
    "file",
    "/repo/readme.markdown",
    fakeDeps({ stat: async () => ({ isFile: true, isDirectory: false }) }),
  );
  assert.deepEqual(result, { ok: true, path: "/repo/readme.markdown" });
});

test("pickPathViaDialog file: darwin runs osascript and returns the chosen path", async () => {
  let seen;
  const picked = await pickPathViaDialog(
    "file",
    fakeDeps({
      execFileImpl: async (command, args) => {
        seen = { command, args };
        return { stdout: "/repo/readme.md\n" };
      },
    }),
  );
  assert.equal(picked, "/repo/readme.md");
  assert.equal(seen.command, "osascript");
});

test("pickPathViaDialog file: win32 runs powershell", async () => {
  let seen;
  const picked = await pickPathViaDialog(
    "file",
    fakeDeps({
      platform: "win32",
      execFileImpl: async (command, args) => {
        seen = { command, args };
        return { stdout: "C:\\repo\\readme.md\n" };
      },
    }),
  );
  assert.equal(picked, "C:\\repo\\readme.md");
  assert.equal(seen.command, "powershell");
});

test("pickPathViaDialog file: a cancel (sentinel output) is null, not an error", async () => {
  const picked = await pickPathViaDialog(
    "file",
    fakeDeps({ execFileImpl: async () => ({ stdout: "__CANCELED__\n" }) }),
  );
  assert.equal(picked, null);
});

test("pickPathViaDialog file: unsupported platforms return null without shelling out", async () => {
  let called = false;
  const picked = await pickPathViaDialog(
    "file",
    fakeDeps({
      platform: "linux",
      execFileImpl: async () => {
        called = true;
        return { stdout: "/repo/readme.md" };
      },
    }),
  );
  assert.equal(picked, null);
  assert.equal(called, false);
});

test("resolveOpenTarget file: canceling the dialog is a silent no-op, not an error", async () => {
  const result = await resolveOpenTarget(
    "file",
    fakeDeps({ execFileImpl: async () => ({ stdout: "__CANCELED__" }) }),
  );
  assert.deepEqual(result, { ok: false, canceled: true });
});

test("resolveOpenTarget file: a picked non-markdown file surfaces the clear validation error", async () => {
  const result = await resolveOpenTarget(
    "file",
    fakeDeps({
      execFileImpl: async () => ({ stdout: "/repo/notes.txt\n" }),
      stat: async () => ({ isFile: true, isDirectory: false }),
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.canceled, false);
  assert.match(result.error, /is not a markdown file/);
});

test("resolveOpenTarget file: a valid picked file resolves", async () => {
  const result = await resolveOpenTarget(
    "file",
    fakeDeps({
      execFileImpl: async () => ({ stdout: "/repo/readme.md\n" }),
      stat: async () => ({ isFile: true, isDirectory: false }),
    }),
  );
  assert.deepEqual(result, { ok: true, path: "/repo/readme.md" });
});
