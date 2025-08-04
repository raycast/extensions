import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import {
  ObsidianMemoSettings,
  loadSettings,
  saveSettings,
  resetSettings,
  DEFAULT_SETTINGS,
} from "../utils/settings";
import { TEXTS } from "../constants/texts";

interface UseSettingsResult {
  settings: ObsidianMemoSettings;
  isLoading: boolean;
  isSettingsLoaded: boolean;
  updateSetting: <K extends keyof ObsidianMemoSettings>(
    key: K,
    value: ObsidianMemoSettings[K],
  ) => void;
  handleSubmit: (values: ObsidianMemoSettings) => Promise<boolean>;
  handleReset: () => Promise<void>;
}

export const useSettings = (): UseSettingsResult => {
  const [settings, setSettings] =
    useState<ObsidianMemoSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // 設定値を初期化
  useEffect(() => {
    const initSettings = async () => {
      const loadedSettings = await loadSettings();
      setSettings(loadedSettings);
      setIsSettingsLoaded(true);
    };
    initSettings();
  }, []);

  // 設定値を更新
  const updateSetting = <K extends keyof ObsidianMemoSettings>(
    key: K,
    value: ObsidianMemoSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // 設定を保存
  const handleSubmit = async (
    values: ObsidianMemoSettings,
  ): Promise<boolean> => {
    if (!values.obsidianVaultPath.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: TEXTS.toast.error.title,
        message: "Obsidian Vault Path は必須です",
      });
      return false;
    }

    setIsLoading(true);

    try {
      await saveSettings(values);

      await showToast({
        style: Toast.Style.Success,
        title: TEXTS.toast.success.title,
        message: "設定を保存しました",
      });

      return true;
    } catch (error) {
      console.error("Failed to save settings:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: TEXTS.toast.error.title,
        message: "設定の保存に失敗しました",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 設定をリセット
  const handleReset = async (): Promise<void> => {
    try {
      await resetSettings();
      setSettings(DEFAULT_SETTINGS);

      await showToast({
        style: Toast.Style.Success,
        title: TEXTS.toast.success.title,
        message: "設定をリセットしました",
      });
    } catch (error) {
      console.error("Failed to reset settings:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: TEXTS.toast.error.title,
        message: "設定のリセットに失敗しました",
      });
    }
  };

  return {
    settings,
    isLoading,
    isSettingsLoaded,
    updateSetting,
    handleSubmit,
    handleReset,
  };
};
