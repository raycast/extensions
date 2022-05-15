import { existsSync, writeFileSync } from "fs";
import { useEffect } from "react";
import { LocalStorage } from "@raycast/api";
import { SVGR_DEFAULT, SVGO_DEFAULT } from "../constants";

interface UseInitSettings {
  svgoConfigPath: string;
}

const useInitSettings = ({ svgoConfigPath }: UseInitSettings) => {
  useEffect(() => {
    const handleSvgrConfig = async () => {
      const localSvgrSettings = await LocalStorage.getItem("svgr");
      if (!localSvgrSettings) {
        await LocalStorage.setItem("svgr", JSON.stringify(SVGR_DEFAULT));
      }
    };
    handleSvgrConfig();
    const svgoSettings = existsSync(svgoConfigPath);
    if (!svgoSettings) writeFileSync(svgoConfigPath, JSON.stringify(SVGO_DEFAULT));
  }, []);
};

export default useInitSettings;
