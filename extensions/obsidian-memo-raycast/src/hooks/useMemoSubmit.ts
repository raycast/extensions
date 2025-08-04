import { useState } from "react";
import { showToast, Toast, popToRoot } from "@raycast/api";
import * as path from "path";
import { TEXTS } from "../constants/texts";
import { formatDatePattern, getCurrentTime } from "../utils/dateUtils";
import {
  fileExists,
  readFile,
  writeFile,
  appendToSection,
  expandTildePath,
} from "../utils/fileUtils";
import { loadSettings, ObsidianMemoSettings } from "../utils/settings";

interface UseMemoSubmitResult {
  isLoading: boolean;
  submitMemo: (memo: string) => Promise<void>;
}

export const useMemoSubmit = (): UseMemoSubmitResult => {
  const [isLoading, setIsLoading] = useState(false);

  const submitMemo = async (memo: string): Promise<void> => {
    if (!memo.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: TEXTS.toast.error.title,
        message: TEXTS.toast.error.emptyMemo,
      });
      return;
    }

    setIsLoading(true);

    try {
      const settings = await loadSettings();

      // ボルトパスが設定されているかチェック
      if (!settings.obsidianVaultPath.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "設定エラー",
          message:
            "Obsidian Vault Path が設定されていません。設定画面から設定してください。",
        });
        return;
      }

      // パスをチルダ展開
      const expandedVaultPath = expandTildePath(settings.obsidianVaultPath);

      // 日付ファイルパスを生成
      const dailyNotePath = formatDatePattern(settings.dailyNotesPath);
      const fullDailyNotePath = path.join(expandedVaultPath, dailyNotePath);

      // ファイルが存在しない場合、設定に応じてテンプレートから作成
      if (!(await fileExists(fullDailyNotePath))) {
        if (settings.autoCreateTemplate) {
          await createDailyNoteFromTemplate(settings, fullDailyNotePath);
        } else {
          // テンプレートなしでシンプルなファイルを作成
          const today = formatDatePattern("{{DATE:YYYY-MM-DD(ddd)}}");
          await writeFile(
            fullDailyNotePath,
            `# ${today}\n\n${settings.journalSection}\n\n`,
          );
        }
      }

      // エントリーフォーマットを処理
      const currentTime = getCurrentTime();

      const formattedEntry = settings.entryFormat
        .replace(/\{\{time\}\}/g, currentTime)
        .replace(/\{\{content\}\}/g, memo);

      // Journal セクションに追加
      await appendToSection(
        fullDailyNotePath,
        settings.journalSection,
        formattedEntry,
        true, // サブセクションを考慮
        true, // セクションが見つからない場合は作成
        settings.insertPosition, // 設定で指定された位置に挿入
      );

      // 成功通知の表示（設定で有効な場合のみ）
      if (settings.showSuccessNotification) {
        await showToast({
          style: Toast.Style.Success,
          title: TEXTS.toast.success.title,
          message: TEXTS.toast.success.message,
        });
      }

      // Raycastを閉じる
      await popToRoot();
    } catch (error) {
      console.error("Error adding memo:", error);
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラー";
      await showToast({
        style: Toast.Style.Failure,
        title: TEXTS.toast.error.title,
        message: TEXTS.toast.error.submitFailed(errorMessage),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    submitMemo,
  };
};

/**
 * テンプレートから日次ノートを作成
 * @param settings - 設定値
 * @param targetPath - 作成するファイルのパス
 */
const createDailyNoteFromTemplate = async (
  settings: ObsidianMemoSettings,
  targetPath: string,
): Promise<void> => {
  const expandedVaultPath = expandTildePath(settings.obsidianVaultPath);
  const templatePath = path.join(expandedVaultPath, settings.templatePath);

  let content = "";

  // テンプレートファイルが存在する場合は読み込み
  if (await fileExists(templatePath)) {
    content = await readFile(templatePath);

    // テンプレート内の日付プレースホルダーを置換
    content = formatDatePattern(content);

    // 時刻プレースホルダーを置換
    content = content.replace(/\{\{time\}\}/g, getCurrentTime());
  } else {
    // テンプレートが存在しない場合はデフォルトの内容を作成
    const today = formatDatePattern("{{DATE:YYYY-MM-DD(ddd)}}");
    content = `# ${today}\n\n${settings.journalSection}\n\n`;
  }

  await writeFile(targetPath, content);
};
