import { exec } from "child_process";
import { promisify } from "util";
import { ErrorCode, PromptManagerError } from "../types/errors";

const execAsync = promisify(exec);

/**
 * カーソル移動の結果
 */
export type CursorMoveResult =
  | { success: true }
  | { success: false; error: Error };

/**
 * AppleScript を使ってカーソルを左に移動
 *
 * @param count 移動する文字数
 * @returns 移動の成功/失敗
 */
export async function moveCursorLeft(count: number): Promise<CursorMoveResult> {
  if (count <= 0) {
    return { success: true };
  }

  // macOS 以外では実行しない
  if (process.platform !== "darwin") {
    return {
      success: false,
      error: new PromptManagerError(
        "Cursor movement is only supported on macOS",
        ErrorCode.CURSOR_MOVE_FAILED,
      ),
    };
  }

  const script = `
    tell application "System Events"
      repeat ${count} times
        key code 123
      end repeat
    end tell
  `;

  try {
    // シングルクォートをエスケープ
    const escaped = script.replace(/'/g, "'\"'\"'");
    await execAsync(`osascript -e '${escaped}'`);
    return { success: true };
  } catch (error) {
    console.error("Failed to move cursor:", error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * カーソル移動機能が利用可能かチェック
 */
export function isCursorControlAvailable(): boolean {
  return process.platform === "darwin";
}
