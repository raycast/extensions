import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 指定ディレクトリ配下の TypeScript ファイルを再帰的に集める
 */
async function findTypeScriptFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) {
        return findTypeScriptFiles(path);
      }
      if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        return [path];
      }
      return [];
    }),
  );
  return files.flat();
}

/**
 * UI から依存組み立て関数の直接利用を禁止する
 */
async function expectNoCompositionCreationInUi(filePath: string): Promise<void> {
  const source = await readFile(filePath, "utf8");
  const forbiddenPatterns = [
    /from\s+["'][^"']*(?:interface-adapters|infrastructure)\//,
    /\bcreate[A-Z]\w*(?:Dependencies|Infra)\s*\(/,
    /\b[A-Z][A-Z0-9_]*_DEPENDENCIES\b/,
    /\bworktreeUiInfra\b/,
  ];
  const matchedPattern = forbiddenPatterns.find((pattern) => pattern.test(source));
  expect(matchedPattern).toBeUndefined();
}

/**
 * UI ファイル候補か判定する
 */
function isUiSourceFile(filePath: string): boolean {
  if (filePath.endsWith(".spec.ts") || filePath.endsWith(".spec.tsx")) {
    return false;
  }
  return (
    filePath.endsWith("/worktree-deck.tsx") ||
    filePath.endsWith("/worktree-status-menu-bar.tsx") ||
    filePath.includes("/components/")
  );
}

describe("composition root constraints", () => {
  it("UI 層は Composition Root を直接組み立てない", async () => {
    const uiFiles = (await findTypeScriptFiles(__dirname)).filter(isUiSourceFile);
    expect(uiFiles.length).toBeGreaterThan(0);
    await Promise.all(uiFiles.map((filePath) => expectNoCompositionCreationInUi(filePath)));
  });

  it("Composition Root は UI 向けの infrastructure bag を公開しない", async () => {
    const source = await readFile(`${__dirname}/composition-root.ts`, "utf8");

    expect(source.includes("worktreeUiInfra")).toBe(false);
  });
});
