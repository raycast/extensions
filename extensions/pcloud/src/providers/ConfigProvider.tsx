import React, { createContext, useCallback, useContext, useState } from "react";
import { getPreferenceValues, LocalStorage } from "@raycast/api";

export type MyPreferences = {
  token: string;
  pCloudDriveDirectory: string;
  isEuropeRegion: boolean;
  excludedFilePatterns?: string[];
};

const ConfigContext = createContext<{
  config: MyPreferences;
  updateToken: (token: string) => void;
}>({
  config: { pCloudDriveDirectory: "", token: "", isEuropeRegion: false, excludedFilePatterns: [] },
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  updateToken: () => {},
});
export const useConfigProvider = () => useContext(ConfigContext);

export default function ConfigProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const preferences = getPreferenceValues<MyPreferences>();

  const [config, setConfig] = useState<MyPreferences>({
    token: preferences.token,
    pCloudDriveDirectory: preferences.pCloudDriveDirectory,
    isEuropeRegion: preferences.isEuropeRegion,
    excludedFilePatterns: ((preferences.excludedFilePatterns as unknown as string) || "")
      .split(",")
      .map((s) => s.trim()),
  });

  const updateToken = useCallback((token: string) => {
    setConfig((prev) => ({ ...prev, token }));
    LocalStorage.setItem("pcloud_token", token);
  }, []);

  return <ConfigContext.Provider value={{ config, updateToken }}>{children}</ConfigContext.Provider>;
}
