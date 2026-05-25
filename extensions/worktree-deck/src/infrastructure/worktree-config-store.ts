import { expandHomePath, normalizePathValue } from "../domain/path-utils";

/**
 * GIT_WORKTREE_PATH の値を実行環境の絶対パスへ正規化する
 */
function normalizeWorktreeBasePath(value: string, homeDir: string | null): string {
  return normalizePathValue(expandHomePath(value, homeDir));
}

export async function loadBasePath(args: {
  env: NodeJS.ProcessEnv;
  cwd: string;
  homeDir: string | null;
  assetsPath: string;
  packageDir: string;
  packageName: string;
}): Promise<string> {
  const fromEnv = args.env.GIT_WORKTREE_PATH?.trim();
  if (fromEnv) {
    return normalizeWorktreeBasePath(fromEnv, args.homeDir);
  }

  throw new Error("GIT_WORKTREE_PATH is not set. Set it in Raycast Preferences.");
}
