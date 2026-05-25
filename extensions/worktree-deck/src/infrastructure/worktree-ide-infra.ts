import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { worktreeIdeAppService, type WorktreeIdeApp } from "../domain/worktree-ide-app.service";

/**
 * execFile を Promise 化した実行関数
 */
const execFileAsync = promisify(execFile);

/**
 * IDE 起動で利用する execFile 互換関数
 */
type ExecFileImpl = typeof execFileAsync;

/**
 * IDE アプリケーションに対応する macOS アプリ名
 */
const IDE_APP_MACOS_NAMES = {
  zed: "Zed",
  vscode: "Visual Studio Code",
  cursor: "Cursor",
} as const satisfies Record<WorktreeIdeApp, string>;

/**
 * IDE アプリケーションに対応する macOS アプリ名を返す
 */
export function resolveIdeAppMacOSName(ideApp: WorktreeIdeApp): string {
  return IDE_APP_MACOS_NAMES[ideApp];
}

/**
 * 指定パスを IDE アプリケーションで開く
 */
export async function openPathInIdeApp(
  path: string,
  ideApp: WorktreeIdeApp,
  execFileImpl: ExecFileImpl = execFileAsync,
): Promise<void> {
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    throw new Error("Path is required.");
  }
  const resolvedIdeApp = worktreeIdeAppService.resolvePreferred(ideApp);
  await ensureIdeAppInstalled(resolvedIdeApp, execFileImpl);
  const appName = resolveIdeAppMacOSName(resolvedIdeApp);
  await execFileImpl("open", ["-a", appName, trimmedPath]);
}

/**
 * IDE アプリケーションが macOS に登録されているか返す
 */
export async function checkIdeAppInstalled(
  ideApp: WorktreeIdeApp,
  execFileImpl: ExecFileImpl = execFileAsync,
): Promise<boolean> {
  const appName = resolveIdeAppMacOSName(worktreeIdeAppService.resolvePreferred(ideApp));
  try {
    await execFileImpl("osascript", ["-e", `id of app "${appName}"`]);
    return true;
  } catch {
    return false;
  }
}

/**
 * IDE アプリケーションが未インストールならエラーにする
 */
export async function ensureIdeAppInstalled(
  ideApp: WorktreeIdeApp,
  execFileImpl: ExecFileImpl = execFileAsync,
): Promise<void> {
  const installed = await checkIdeAppInstalled(ideApp, execFileImpl);
  if (!installed) {
    const label = worktreeIdeAppService.formatIdeAppLabel(ideApp);
    throw new Error(`${label} is not installed. Install ${label} and try again.`);
  }
}
