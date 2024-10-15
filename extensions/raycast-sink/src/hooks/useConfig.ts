import { useState, useEffect } from "react";
import {
  LocalStorage,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";

import { Config } from "../types";

interface Preferences {
  host: string;
  token: string;
  showWebsitePreview: string;
  language: string;
}

const CONFIG_INITIALIZED_KEY = "config_initialized";

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const initialized = await LocalStorage.getItem(CONFIG_INITIALIZED_KEY);

        if (!initialized) {
          const preferences = getPreferenceValues<Preferences>();
          await LocalStorage.setItem("host", preferences.host);
          await LocalStorage.setItem("token", preferences.token);
          await LocalStorage.setItem(CONFIG_INITIALIZED_KEY, "true");
        }

        // 从 LocalStorage 读取配置
        const newConfig: Config = {
          host: (await LocalStorage.getItem<string>("host")) || "",
          token: (await LocalStorage.getItem<string>("token")) || "",
          showWebsitePreview:
            (await LocalStorage.getItem<string>("showWebsitePreview")) ||
            "true",
          language: (await LocalStorage.getItem<string>("language")) || "en",
        };

        setConfig(newConfig);

        // 检查配置是否完整
        if (!newConfig.host || !newConfig.token) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Configuration incomplete",
            message: "Please fill in Host and Token in the plugin settings",
          });
        }
      } catch (error) {
        console.error(":", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Load config failed",
          message: "Please check network connection or restart the app",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadConfig();
  }, []);

  const updateConfig = async (newConfig: Partial<Config>) => {
    if (config) {
      const updatedConfig = { ...config, ...newConfig };
      setConfig(updatedConfig);

      await Promise.all(
        Object.entries(updatedConfig).map(([key, value]) =>
          LocalStorage.setItem(key, value.toString())
        )
      );
    }
  };

  return { config, isLoading, updateConfig };
}
