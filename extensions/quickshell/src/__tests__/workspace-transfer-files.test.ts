import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_EXPORT_FILE_NAME,
  readWorkspaceImportFile,
  writeWorkspaceExportFile,
} from "../lib/workspace-transfer-files";

describe("workspace-transfer-files", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes and reads UTF-8 JSON round-trip", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qs-transfer-"));
    dirs.push(dir);
    const filePath = path.join(dir, DEFAULT_EXPORT_FILE_NAME);
    const json = '{"version":1,"workspaces":[]}';

    writeWorkspaceExportFile(filePath, json);

    expect(readFileSync(filePath, "utf8")).toBe(json);
    expect(readWorkspaceImportFile(filePath)).toBe(json);
  });
});
