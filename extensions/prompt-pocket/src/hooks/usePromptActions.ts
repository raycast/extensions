import { useCallback } from "react";
import { Clipboard, confirmAlert, Alert } from "@raycast/api";
import { Prompt } from "../types/prompt";
import { fillPromptBody, fillPromptForPaste } from "../lib/placeholder";
import { moveCursorLeft } from "../lib/cursorControl";
import { showSuccessToast, showErrorToast } from "../lib/toastUtils";
import { updateLastUsed } from "../lib/promptStorage";

/**
 * プロンプトアクション用のカスタムフック
 * コピー、ペースト、削除などの操作を提供
 */
export function usePromptActions() {
  /**
   * プロンプト本文をクリップボードにコピー（Raw）
   */
  const copyToClipboard = useCallback(async (prompt: Prompt) => {
    try {
      console.log("[copyToClipboard] Starting");
      await Clipboard.copy(prompt.body);
      console.log("[copyToClipboard] Updating last used");
      await updateLastUsed(prompt.id);
      console.log("[copyToClipboard] Showing success toast");
      await showSuccessToast("Copied to Clipboard", `"${prompt.title}" copied`);
    } catch (error) {
      console.error("[copyToClipboard] Error:", error);
      await showErrorToast("Failed to Copy", error);
    }
  }, []);

  /**
   * プロンプト本文をアクティブなアプリにペースト（Raw）
   */
  const pasteToActiveApp = useCallback(async (prompt: Prompt) => {
    try {
      console.log("[pasteToActiveApp] Starting");
      await Clipboard.paste(prompt.body);
      console.log("[pasteToActiveApp] Updating last used");
      await updateLastUsed(prompt.id);
      console.log("[pasteToActiveApp] Showing success toast");
      await showSuccessToast(
        "Pasted to Active App",
        `"${prompt.title}" pasted`,
      );
    } catch (error) {
      console.error("[pasteToActiveApp] Error:", error);
      await showErrorToast("Failed to Paste", error);
    }
  }, []);

  /**
   * プレースホルダを処理してクリップボードにコピー
   */
  const copyFilledPrompt = useCallback(async (prompt: Prompt) => {
    try {
      console.log("[copyFilledPrompt] Starting");
      const filledText = await fillPromptBody(prompt.body);
      await Clipboard.copy(filledText);
      console.log("[copyFilledPrompt] Updating last used");
      await updateLastUsed(prompt.id);
      console.log("[copyFilledPrompt] Showing success toast");
      await showSuccessToast(
        "Copied Filled Prompt",
        `"${prompt.title}" copied to clipboard`,
      );
    } catch (error) {
      console.error("[copyFilledPrompt] Error:", error);
      await showErrorToast("Failed to Copy Filled Prompt", error);
    }
  }, []);

  /**
   * プレースホルダを処理してアクティブなアプリにペースト
   * {cursor} がある場合は、カーソルを自動的にその位置に移動
   */
  const pasteFilledPrompt = useCallback(async (prompt: Prompt) => {
    try {
      console.log("[pasteFilledPrompt] Starting");
      const { text, cursorOffset } = await fillPromptForPaste(prompt.body);
      await Clipboard.paste(text);
      console.log("[pasteFilledPrompt] Updating last used");
      await updateLastUsed(prompt.id);
      console.log("[pasteFilledPrompt] Last used updated");

      if (cursorOffset !== null && cursorOffset > 0) {
        const result = await moveCursorLeft(cursorOffset);

        if (result.success) {
          await showSuccessToast(
            "Pasted with Cursor",
            "Cursor positioned at {cursor} location",
          );
        } else {
          // カーソル移動失敗は警告のみ（ペースト自体は成功）
          await showSuccessToast(
            "Pasted Successfully",
            "Note: Cursor could not be moved automatically",
          );
        }
      } else {
        await showSuccessToast(
          "Pasted Filled Prompt",
          `"${prompt.title}" pasted successfully`,
        );
      }
    } catch (error) {
      console.error("[pasteFilledPrompt] Error:", error);
      await showErrorToast("Failed to Paste Filled Prompt", error);
    }
  }, []);

  /**
   * 確認ダイアログ付きで削除
   */
  const deleteWithConfirmation = useCallback(
    async (
      prompt: Prompt,
      onSuccess: () => Promise<void>,
    ): Promise<boolean> => {
      const confirmed = await confirmAlert({
        title: "Delete Prompt",
        message: `Are you sure you want to delete "${prompt.title}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) {
        return false;
      }

      try {
        await onSuccess();
        await showSuccessToast(
          "Prompt Deleted",
          `"${prompt.title}" has been deleted`,
        );
        return true;
      } catch (error) {
        await showErrorToast("Failed to Delete Prompt", error);
        return false;
      }
    },
    [],
  );

  return {
    copyToClipboard,
    pasteToActiveApp,
    copyFilledPrompt,
    pasteFilledPrompt,
    deleteWithConfirmation,
  };
}
