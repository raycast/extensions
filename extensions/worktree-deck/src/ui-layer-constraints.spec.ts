import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ディレクトリ配下の TypeScript/TSX ファイルを再帰で列挙する
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
    if (!entry.isFile()) {
      continue;
    }
    if ((fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) && !fullPath.endsWith(".spec.ts")) {
      filePaths.push(fullPath);
    }
  }
  return filePaths;
}

/**
 * UI 層の対象ファイルを収集する
 */
async function collectUiFiles(): Promise<string[]> {
  const baseDir = __dirname;
  const rootFiles = (await readdir(baseDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => join(baseDir, entry.name))
    .filter((filePath) => filePath.endsWith(".tsx") && !filePath.endsWith(".spec.ts"));
  const componentFiles = await listTypeScriptFiles(join(baseDir, "components"));
  return [...rootFiles, ...componentFiles];
}

describe("ui layer constraints", () => {
  it("UI 層は lib 層を直接参照しない", async () => {
    const files = await collectUiFiles();
    const offenders: string[] = [];
    for (const filePath of files) {
      const source = await readFile(filePath, "utf8");
      if (source.includes("../lib/") || source.includes("./lib/")) {
        offenders.push(filePath);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("UI 層は infrastructure を直接参照しない", async () => {
    const files = await collectUiFiles();
    const offenders: string[] = [];
    for (const filePath of files) {
      const source = await readFile(filePath, "utf8");
      if (source.includes("../infrastructure/") || source.includes("./infrastructure/")) {
        offenders.push(filePath);
      }
    }
    expect(offenders).toEqual([]);
  });
});
