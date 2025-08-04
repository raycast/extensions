import { LocalStorage } from "@raycast/api";

/**
 * 設定値の型定義
 */
export interface ObsidianMemoSettings {
  obsidianVaultPath: string;
  dailyNotesPath: string;
  templatePath: string;
  journalSection: string;
  entryFormat: string;
  autoCreateTemplate: boolean;
  insertPosition: "top" | "bottom";
  showSuccessNotification: boolean;
}

/**
 * デフォルト設定値
 */
export const DEFAULT_SETTINGS: ObsidianMemoSettings = {
  obsidianVaultPath: "",
  dailyNotesPath: "200_Daily/{{DATE:YYYY-MM-DD(ddd)}}.md",
  templatePath: "999_Templates/DailyNote.md",
  journalSection: "## Journal",
  entryFormat: "###### {{time}}\n{{content}}",
  autoCreateTemplate: true,
  insertPosition: "bottom",
  showSuccessNotification: true,
};

/**
 * 設定キー
 */
const SETTINGS_KEY = "obsidian-memo-settings";

/**
 * 設定値を保存
 * @param settings - 保存する設定値
 */
export const saveSettings = async (
  settings: ObsidianMemoSettings,
): Promise<void> => {
  await LocalStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

/**
 * 設定値を読み込み
 * @returns 設定値
 */
export const loadSettings = async (): Promise<ObsidianMemoSettings> => {
  try {
    const savedSettings = await LocalStorage.getItem<string>(SETTINGS_KEY);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      // デフォルト値と統合して、新しいプロパティにも対応
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.warn("Failed to load settings:", error);
  }

  return DEFAULT_SETTINGS;
};

/**
 * 設定値をリセット
 */
export const resetSettings = async (): Promise<void> => {
  await LocalStorage.removeItem(SETTINGS_KEY);
};

/**
 * 特定の設定値を更新
 * @param key - 更新するキー
 * @param value - 新しい値
 */
export const updateSetting = async <K extends keyof ObsidianMemoSettings>(
  key: K,
  value: ObsidianMemoSettings[K],
): Promise<void> => {
  const currentSettings = await loadSettings();
  const updatedSettings = { ...currentSettings, [key]: value };
  await saveSettings(updatedSettings);
};
