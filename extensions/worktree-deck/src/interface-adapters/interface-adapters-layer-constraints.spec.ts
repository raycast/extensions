import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ディレクトリ配下の TypeScript ファイルを再帰で列挙する
 */
async function listTypeScriptFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const filePaths: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await listTypeScriptFiles(fullPath);
      filePaths.push(...nested);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(".ts") && !fullPath.endsWith(".spec.ts")) {
      filePaths.push(fullPath);
    }
  }
  return filePaths;
}

describe("interface-adapters layer constraints", () => {
  it("interface-adapters 層は lib 層を参照しない", async () => {
    const interfaceAdaptersDir = __dirname;
    const files = await listTypeScriptFiles(interfaceAdaptersDir);
    const offenders: string[] = [];
    for (const filePath of files) {
      const source = await readFile(filePath, "utf8");
      if (source.includes("../lib/") || source.includes("./lib/")) {
        offenders.push(filePath);
      }
    }
    expect(offenders).toEqual([]);
  });
});
