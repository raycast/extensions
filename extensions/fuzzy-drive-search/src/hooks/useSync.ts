import { showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";

const binaryPath =
  "/Users/suenagakatsuyuki/Documents/claude-desktop/fuzzy-drive-search/target/release/fuzzy-drive-search";

const executeCommandAsync = async (command: string, options: { timeout?: number } = {}) => {
  return new Promise<string>((resolve, reject) => {
    setTimeout(() => {
      try {
        const result = execSync(`${binaryPath} ${command}`, {
          encoding: "utf8",
          timeout: options.timeout || 10_000,
        });
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, 0);
  });
};

export function useSync() {
  const syncFiles = async (onComplete?: () => void) => {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "同期中...",
        message: "Google Driveのファイル一覧を更新しています",
      });

      await executeCommandAsync("sync", { timeout: 30_000 });

      showToast({
        style: Toast.Style.Success,
        title: "同期完了",
        message: "ファイル一覧を更新しました",
      });

      // 同期完了後のコールバック実行
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "同期エラー",
        message: error instanceof Error ? error.message : "同期に失敗しました",
      });
    }
  };

  return {
    syncFiles,
  };
}
