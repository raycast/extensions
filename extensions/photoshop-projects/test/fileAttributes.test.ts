import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { renamePhotoshopFile, updateFileDate } from "../src/utils/fileAttributes";

describe("fileAttributes utilities", () => {
  let tempDir: string;
  let testPsdFile: string;

  before(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "psd-test-"));
    testPsdFile = path.join(tempDir, "sample.psd");
    await fs.promises.writeFile(testPsdFile, "dummy psd content");
  });

  after(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  describe("renamePhotoshopFile", () => {
    it("rejects non-existent file", async () => {
      await assert.rejects(
        async () => {
          await renamePhotoshopFile(path.join(tempDir, "missing.psd"), "newname");
        },
        { message: "Source file does not exist" },
      );
    });

    it("rejects empty new names", async () => {
      await assert.rejects(
        async () => {
          await renamePhotoshopFile(testPsdFile, "   ");
        },
        { message: "Document name cannot be empty" },
      );
    });

    it("rejects invalid path characters including slashes, backslashes, colons, null bytes", async () => {
      await assert.rejects(
        async () => {
          await renamePhotoshopFile(testPsdFile, "invalid/name");
        },
        { message: "Document name cannot contain slashes, backslashes, colons, or null bytes" },
      );

      await assert.rejects(
        async () => {
          await renamePhotoshopFile(testPsdFile, "invalid\\name");
        },
        { message: "Document name cannot contain slashes, backslashes, colons, or null bytes" },
      );

      await assert.rejects(
        async () => {
          await renamePhotoshopFile(testPsdFile, "invalid:name");
        },
        { message: "Document name cannot contain slashes, backslashes, colons, or null bytes" },
      );

      await assert.rejects(
        async () => {
          await renamePhotoshopFile(testPsdFile, "invalid\0name");
        },
        { message: "Document name cannot contain slashes, backslashes, colons, or null bytes" },
      );
    });

    it("rejects path traversal attempts", async () => {
      await assert.rejects(
        async () => {
          await renamePhotoshopFile(testPsdFile, "..");
        },
        { message: "Document name cannot contain relative path segments" },
      );

      await assert.rejects(
        async () => {
          await renamePhotoshopFile(testPsdFile, "../escaped");
        },
        { message: "Document name cannot contain slashes, backslashes, colons, or null bytes" },
      );
    });

    it("successfully renames a file and appends extension if omitted", async () => {
      const newPath = await renamePhotoshopFile(testPsdFile, "renamed-project");
      assert.equal(path.basename(newPath), "renamed-project.psd");
      assert.equal(fs.existsSync(newPath), true);
      assert.equal(fs.existsSync(testPsdFile), false);
      testPsdFile = newPath;
    });

    it("preserves explicit extension when renaming", async () => {
      const newPath = await renamePhotoshopFile(testPsdFile, "final-version.psd");
      assert.equal(path.basename(newPath), "final-version.psd");
      assert.equal(fs.existsSync(newPath), true);
      testPsdFile = newPath;
    });

    it("rejects renaming if target file already exists", async () => {
      const existingConflict = path.join(tempDir, "existing-conflict.psd");
      await fs.promises.writeFile(existingConflict, "other psd content");

      await assert.rejects(
        async () => {
          await renamePhotoshopFile(testPsdFile, "existing-conflict.psd");
        },
        { message: 'A file named "existing-conflict.psd" already exists in this folder' },
      );
    });

    it("supports case-only renaming on APFS disks without false collision error", async () => {
      const originalPath = testPsdFile;
      const lowerCased = path.basename(originalPath).toLowerCase();
      const upperCased = lowerCased.toUpperCase();
      const renamed = await renamePhotoshopFile(originalPath, upperCased);

      assert.equal(path.basename(renamed), upperCased);
      assert.equal(fs.existsSync(renamed), true);
      testPsdFile = renamed;
    });
  });

  describe("updateFileDate", () => {
    it("rejects non-existent file", async () => {
      await assert.rejects(
        async () => {
          await updateFileDate(path.join(tempDir, "missing.psd"), new Date());
        },
        { message: "Target file does not exist" },
      );
    });

    it("rejects invalid date", async () => {
      await assert.rejects(
        async () => {
          await updateFileDate(testPsdFile, new Date("invalid-date"));
        },
        { message: "Invalid target date provided" },
      );
    });

    it("updates modification date on existing file", async () => {
      const pastDate = new Date("2024-01-15T12:00:00Z");
      await updateFileDate(testPsdFile, pastDate, false);
      const stat = await fs.promises.stat(testPsdFile);
      assert.equal(Math.floor(stat.mtimeMs / 1000), Math.floor(pastDate.getTime() / 1000));
    });

    it("updates both modification and creation dates via SetFile when available", async () => {
      const pastDate = new Date("2024-02-20T10:30:00Z");
      await updateFileDate(testPsdFile, pastDate, true);
      const stat = await fs.promises.stat(testPsdFile);
      assert.equal(Math.floor(stat.mtimeMs / 1000), Math.floor(pastDate.getTime() / 1000));
    });
  });
});
