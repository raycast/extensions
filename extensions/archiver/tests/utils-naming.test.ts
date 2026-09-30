import { describe, expect, mock, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let mockPreferences: Record<string, unknown> = {
  useOriginalNameWhenSingle: false,
  useParentFolderNameWhenMultiple: false,
  locationSaveCompressed: "",
  locationSaveExtracted: "",
};

mock.module("@raycast/api", () => ({
  environment: { assetsPath: "/tmp", supportPath: "/tmp" },
  getPreferenceValues: () => mockPreferences,
  Color: { Orange: "orange", Red: "red", Yellow: "yellow", Green: "green" },
  Alert: {},
  confirmAlert: () => Promise.resolve(false),
  Icon: {},
}));

describe("unique naming logic", () => {
  test("generates unique file names with iterative counter via getCompressSaveLocationAndName", async () => {
    const { getCompressSaveLocationAndName } = await import("../src/common/utils");
    const { CompressFormat } = await import("../src/common/const");
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "archiver-test-compress-"));
    try {
      const filePath = path.join(tmpDir, "file.txt");

      const res1 = await getCompressSaveLocationAndName(true, filePath, CompressFormat.ZIP);
      expect(res1.name).toBe("Archive.zip");
      expect(res1.location).toBe(tmpDir + "/");
      fs.writeFileSync(path.join(res1.location, res1.name), "content");

      const res2 = await getCompressSaveLocationAndName(true, filePath, CompressFormat.ZIP);
      expect(res2.name).toBe("Archive 2.zip");
      fs.writeFileSync(path.join(res2.location, res2.name), "content");

      const res3 = await getCompressSaveLocationAndName(true, filePath, CompressFormat.ZIP);
      expect(res3.name).toBe("Archive 3.zip");
      fs.writeFileSync(path.join(res3.location, res3.name), "content");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("generates unique extract folder names with iterative counter via getExtractSaveLocation", async () => {
    const { getExtractSaveLocation } = await import("../src/common/utils");
    const { ExtractFormat } = await import("../src/common/const");
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "archiver-test-extract-"));
    try {
      const zipPath = path.join(tmpDir, "Archive.zip");

      const folder1 = await getExtractSaveLocation(zipPath, ExtractFormat.ZIP);
      expect(folder1).toBe(path.join(tmpDir, "Archive"));

      const folder2 = await getExtractSaveLocation(zipPath, ExtractFormat.ZIP);
      expect(folder2).toBe(path.join(tmpDir, "Archive 2"));

      const folder3 = await getExtractSaveLocation(zipPath, ExtractFormat.ZIP);
      expect(folder3).toBe(path.join(tmpDir, "Archive 3"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
