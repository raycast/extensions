import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, relative as relativePath } from "node:path";
import { findExecutables } from "./which";

test(
  "pass-cli is looked for in the folders' order, among the files the user can run",
  { skip: process.platform === "win32" },
  async () => {
    const root = await mkdtemp(join(tmpdir(), "pass-cli-which-"));
    try {
      const [notRunnable, folder, first, second, relative] = [
        "not-runnable",
        "folder",
        "first",
        "second",
        "relative",
      ].map((name) => join(root, name));
      for (const dir of [notRunnable, folder, first, second, relative]) await mkdir(dir);
      await writeFile(join(notRunnable, "pass-cli"), "");
      await chmod(join(notRunnable, "pass-cli"), 0o644);
      await mkdir(join(folder, "pass-cli"));
      for (const dir of [first, second, relative]) {
        await writeFile(join(dir, "pass-cli"), "#!/bin/sh\n");
        await chmod(join(dir, "pass-cli"), 0o755);
      }

      // A folder relative to the working directory would depend on where Raycast runs the extension from.
      const searchPath = [notRunnable, folder, relativePath(process.cwd(), relative), "", second, first, second].join(
        delimiter,
      );
      assert.deepEqual(findExecutables("pass-cli", searchPath), [join(second, "pass-cli"), join(first, "pass-cli")]);
      assert.deepEqual(findExecutables("pass-cli", ""), []);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
