import { access, readdir, readFile } from "node:fs/promises";
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
 * 指定ファイルが lib 層を参照していないことを検証する
 */
async function expectNoLibImport(filePath: string): Promise<void> {
  const source = await readFile(filePath, "utf8");
  expect(source.includes("../lib/")).toBe(false);
}

/**
 * 指定ファイルが存在しないことを検証する
 */
async function expectFileNotExists(filePath: string): Promise<void> {
  await expect(access(filePath)).rejects.toThrow();
}

/**
 * re-export 撤去済み lib ファイルの import が無いことを検証する
 */
async function expectNoRemovedLibReExportImport(root: string): Promise<void> {
  const files = await findTypeScriptFiles(root);
  const offenders: string[] = [];
  const importPattern = /from\s+["'](?:[^"']*\/lib\/|\.\/)(?:worktree|worktree-create)["']/;
  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    if (importPattern.test(source)) {
      offenders.push(filePath);
    }
  }
  expect(offenders).toEqual([]);
}

describe("lib layer constraints", () => {
  it("repository-mapping-store は lib 層を参照しない", async () => {
    await expectNoLibImport(`${__dirname}/../infrastructure/repository-mapping-store.ts`);
  });

  it("worktree-commit-state-store は lib 層を参照しない", async () => {
    await expectNoLibImport(`${__dirname}/../infrastructure/worktree-commit-state-store.ts`);
  });

  it("worktree-ui-infra は削除されている", async () => {
    await expectFileNotExists(`${__dirname}/../infrastructure/worktree-ui-infra.ts`);
  });

  it("lib の薄いラッパーファイルは削除されている", async () => {
    await expectFileNotExists(`${__dirname}/worktree-base-branch.ts`);
    await expectFileNotExists(`${__dirname}/worktree-create.ts`);
    await expectFileNotExists(`${__dirname}/worktree.ts`);
    await expectFileNotExists(`${__dirname}/worktree-pr.ts`);
    await expectFileNotExists(`${__dirname}/worktree-pull.ts`);
  });

  it("削除済み lib re-export を import しない", async () => {
    await expectNoRemovedLibReExportImport(join(__dirname, ".."));
  });
});
