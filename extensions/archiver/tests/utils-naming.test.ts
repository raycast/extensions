import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("unique naming logic", () => {
  test("generates unique file names with iterative counter", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "archiver-test-compress-"));
    try {
      const baseName = "Archive";
      const ext = ".zip";

      function getNextName() {
        let name = `${baseName}${ext}`;
        let counter = 2;
        while (fs.existsSync(path.join(tmpDir, name))) {
          name = `${baseName} ${counter}${ext}`;
          counter++;
        }
        return name;
      }

      const name1 = getNextName();
      expect(name1).toBe("Archive.zip");
      fs.writeFileSync(path.join(tmpDir, name1), "content");

      const name2 = getNextName();
      expect(name2).toBe("Archive 2.zip");
      fs.writeFileSync(path.join(tmpDir, name2), "content");

      const name3 = getNextName();
      expect(name3).toBe("Archive 3.zip");
      fs.writeFileSync(path.join(tmpDir, name3), "content");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("generates unique extract folder names with iterative counter", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "archiver-test-extract-"));
    try {
      const baseFolder = "Archive";

      function getNextFolder() {
        let targetLoc = path.join(tmpDir, baseFolder);
        let counter = 2;
        while (fs.existsSync(targetLoc)) {
          targetLoc = path.join(tmpDir, `${baseFolder} ${counter}`);
          counter++;
        }
        return targetLoc;
      }

      const folder1 = getNextFolder();
      expect(folder1).toBe(path.join(tmpDir, "Archive"));
      fs.mkdirSync(folder1);

      const folder2 = getNextFolder();
      expect(folder2).toBe(path.join(tmpDir, "Archive 2"));
      fs.mkdirSync(folder2);

      const folder3 = getNextFolder();
      expect(folder3).toBe(path.join(tmpDir, "Archive 3"));
      fs.mkdirSync(folder3);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
