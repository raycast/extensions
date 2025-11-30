import { Clipboard } from "@raycast/api";
import { ErrorCode, toPromptManagerError } from "../types/errors";

/**
 * プレースホルダ処理のオプション
 */
export interface FillPromptOptions {
  /** クリップボードテキスト（指定しない場合は自動取得） */
  clipboardText?: string;
}

/**
 * プロンプトテンプレート内のプレースホルダを処理する
 *
 * サポートされるプレースホルダ:
 * - {clipboard}: 現在のクリップボードのテキストに置き換える
 * - {cursor}: カーソル位置のマーカー（削除される）
 *
 * @param template - プレースホルダを含むテンプレート文字列
 * @param options - 処理オプション
 * @returns 処理後のテキスト
 * @throws PromptManagerError クリップボードアクセスに失敗した場合
 *
 * @example
 * ```typescript
 * // クリップボードに "Hello" が入っている場合
 * const result = await fillPromptBody("Please review: {clipboard}\n\n{cursor}");
 * // => "Please review: Hello\n\n"
 * ```
 */
export async function fillPromptBody(
  template: string,
  options?: FillPromptOptions,
): Promise<string> {
  try {
    let result = template;

    // {clipboard} プレースホルダの処理
    if (result.includes("{clipboard}")) {
      const clipboardText = await getClipboardText(options?.clipboardText);
      result = result.replace(/{clipboard}/g, clipboardText);
    }

    // {cursor} プレースホルダの処理
    // {cursor} は削除する（ペーストでは分割処理するため、コピーでは不要）
    if (result.includes("{cursor}")) {
      result = result.replace(/{cursor}/g, "");
    }

    return result;
  } catch (error) {
    throw toPromptManagerError(error, ErrorCode.CLIPBOARD_FAILED);
  }
}

/**
 * プレースホルダを処理し、{cursor} の位置情報を含めて返す
 * ペースト用に特化した処理で、カーソル位置に自動的に移動できるようにする
 *
 * @param template - プレースホルダを含むテンプレート文字列
 * @param options - 処理オプション
 * @returns { text: 処理済みテキスト, cursorOffset: {cursor}より後の文字数（カーソル移動用） }
 * @throws PromptManagerError クリップボードアクセスに失敗した場合
 */
export async function fillPromptForPaste(
  template: string,
  options?: FillPromptOptions,
): Promise<{ text: string; cursorOffset: number | null }> {
  try {
    let result = template;

    // {clipboard} プレースホルダの処理
    if (result.includes("{clipboard}")) {
      const clipboardText = await getClipboardText(options?.clipboardText);
      result = result.replace(/{clipboard}/g, clipboardText);
    }

    // {cursor} プレースホルダの処理
    if (result.includes("{cursor}")) {
      const cursorIndex = result.indexOf("{cursor}");

      // {cursor} を削除
      const textWithoutCursor = result.replace("{cursor}", "");

      // {cursor} より後の文字数を計算（カーソルを左に移動する数）
      const afterCursorLength = textWithoutCursor.length - cursorIndex;

      return {
        text: textWithoutCursor,
        cursorOffset: afterCursorLength,
      };
    }

    // {cursor} がない場合
    return {
      text: result,
      cursorOffset: null,
    };
  } catch (error) {
    throw toPromptManagerError(error, ErrorCode.CLIPBOARD_FAILED);
  }
}

/**
 * クリップボードからテキストを取得する
 *
 * クリップボードが空またはテキストでない場合の挙動:
 * - クリップボードが空の場合: 空文字列を返す
 * - テキスト以外（画像など）の場合: 空文字列を返す
 * - エラーが発生した場合: エラーをスロー（呼び出し側でハンドリング）
 *
 * @param providedText オプションで提供されるテキスト（テスト用）
 * @returns クリップボードのテキスト内容
 * @throws Error クリップボードアクセスに失敗した場合
 */
async function getClipboardText(providedText?: string): Promise<string> {
  // 明示的にテキストが提供されている場合はそれを使用
  if (providedText !== undefined) {
    return providedText;
  }

  try {
    // Clipboard API からテキストを読み取る
    const text = await Clipboard.readText();

    // null または undefined の場合は空文字列
    if (text == null) {
      return "";
    }

    return text;
  } catch (error) {
    // エラーが発生した場合はスロー
    // （例: クリップボードへのアクセス権限がない等）
    console.error("Failed to read clipboard:", error);
    throw error;
  }
}

/**
 * テンプレート内にプレースホルダが含まれているかチェック
 */
export function hasPlaceholders(template: string): boolean {
  return template.includes("{clipboard}") || template.includes("{cursor}");
}

/**
 * テンプレート内の各プレースホルダの出現回数を取得
 */
export function countPlaceholders(template: string): {
  clipboard: number;
  cursor: number;
} {
  const clipboardMatches = template.match(/{clipboard}/g);
  const cursorMatches = template.match(/{cursor}/g);

  return {
    clipboard: clipboardMatches ? clipboardMatches.length : 0,
    cursor: cursorMatches ? cursorMatches.length : 0,
  };
}

/**
 * サポートされているプレースホルダの一覧
 */
export const SUPPORTED_PLACEHOLDERS = [
  {
    name: "clipboard",
    syntax: "{clipboard}",
    description: "現在のクリップボードのテキストに置き換えられます",
  },
  {
    name: "cursor",
    syntax: "{cursor}",
    description:
      "カーソル位置のマーカー。ペースト後、その位置にカーソルが配置されます",
  },
] as const;

// ========================================
// 使用例
// ========================================

/**
 * サンプルテンプレート例:
 *
 * 1. コードレビュー用テンプレート
 * ```
 * Please review the following code:
 *
 * {clipboard}
 *
 * Focus on:
 * - Code quality
 * - Performance
 * - Security
 *
 * {cursor}
 * ```
 *
 * 2. メール下書き用テンプレート
 * ```
 * Hi there,
 *
 * I wanted to share this with you:
 *
 * {clipboard}
 *
 * Let me know what you think!
 *
 * {cursor}
 *
 * Best regards
 * ```
 *
 * 3. 翻訳依頼用テンプレート
 * ```
 * Please translate the following text to Japanese:
 *
 * ---
 * {clipboard}
 * ---
 *
 * Translation:
 * {cursor}
 * ```
 *
 * 使い方:
 * 1. 対象のテキストをコピー
 * 2. プロンプトを選択して "Paste Filled Prompt" を実行
 * 3. 全文がペーストされ、{cursor} の位置にカーソルが自動的に移動する（1操作で完結）
 * 4. そのまま入力を開始
 */
