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

export function useInitialization() {
  const initialize = async () => {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "初期化中...",
        message: "Google Drive認証を開始します",
      });

      await executeCommandAsync("init", { timeout: 60_000 });

      showToast({
        style: Toast.Style.Success,
        title: "初期化完了",
        message: "Google Drive認証が完了しました",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "初期化エラー",
        message: error instanceof Error ? error.message : "初期化に失敗しました",
      });
    }
  };

  return {
    initialize,
  };
}
