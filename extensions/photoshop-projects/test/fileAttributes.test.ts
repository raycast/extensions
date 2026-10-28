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

    it("rejects renaming if target file already exists and preserves contents", async () => {
      const existingConflict = path.join(tempDir, "existing-conflict.psd");
      await fs.promises.writeFile(existingConflict, "conflict destination content");

      const sourceContentBefore = await fs.promises.readFile(testPsdFile, "utf8");

      await assert.rejects(
        async () => {
          await renamePhotoshopFile(testPsdFile, "existing-conflict.psd");
        },
        { message: 'A file named "existing-conflict.psd" already exists in this folder' },
      );

      // Verify both source and destination contents are completely preserved
      const destContentAfter = await fs.promises.readFile(existingConflict, "utf8");
      const sourceContentAfter = await fs.promises.readFile(testPsdFile, "utf8");
      assert.equal(destContentAfter, "conflict destination content");
      assert.equal(sourceContentAfter, sourceContentBefore);
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

    it("rejects renaming if another distinct file exists matching target name on case-sensitive filesystem", async () => {
      // Simulate filesystem where destination stat returns different inode/device
      const statOrig = fs.promises.stat;
      try {
        const dummyTarget = path.join(tempDir, "distinct-case.psd");
        (fs.promises as { stat: typeof fs.promises.stat }).stat = (async (p: fs.PathLike) => {
          if (p.toString().includes("distinct-case.psd")) {
            return {
              dev: 1,
              ino: 999999, // Different inode simulates distinct file
            } as fs.Stats;
          }
          return statOrig(p);
        }) as typeof fs.promises.stat;

        await assert.rejects(
          async () => {
            await renamePhotoshopFile(testPsdFile, "distinct-case.psd");
          },
          { message: 'A file named "distinct-case.psd" already exists in this folder' },
        );
      } finally {
        (fs.promises as { stat: typeof fs.promises.stat }).stat = statOrig;
      }
    });

    it("recovers and cleans up if intermediate rename fails", async () => {
      const linkOrig = fs.promises.link;
      const renameOrig = fs.promises.rename;
      try {
        (fs.promises as { link: typeof fs.promises.link }).link = async () => {
          throw new Error("Simulated link failure");
        };
        let step = 0;
        (fs.promises as { rename: typeof fs.promises.rename }).rename = async (oldP: fs.PathLike, newP: fs.PathLike) => {
          step++;
          // Step 1: rename(filePath, tempPath) succeeds
          // Step 2: rename(tempPath, targetPath) fails
          // Step 3: recovery rename(tempPath, filePath) succeeds
          if (step === 2) {
            throw new Error("Simulated intermediate failure");
          }
          return renameOrig(oldP, newP);
        };

        const currentName = path.basename(testPsdFile);
        const targetCaseName = currentName === currentName.toLowerCase() ? currentName.toUpperCase() : currentName.toLowerCase();

        await assert.rejects(
          async () => {
            await renamePhotoshopFile(testPsdFile, targetCaseName);
          },
          /Simulated intermediate failure/,
        );

        // Verify original file was restored
        assert.equal(fs.existsSync(testPsdFile), true);
      } finally {
        (fs.promises as { link: typeof fs.promises.link }).link = linkOrig;
        (fs.promises as { rename: typeof fs.promises.rename }).rename = renameOrig;
      }
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
