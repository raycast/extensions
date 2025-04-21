import { useState, useEffect } from "react";
import * as fs from "fs/promises";
import * as os from "os";
import { CustomMode } from "./types";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  customModesPath: string;
}

export function useCustomModes() {
  const [customModes, setCustomModes] = useState<CustomMode[]>([]);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    const fetchCustomModes = async () => {
      try {
        const rawFilePath = preferences.customModesPath;

        if (!rawFilePath) {
          setCustomModes([]);
          return;
        }

        const filePath = rawFilePath.replace(/^~/, os.homedir());

        try {
          await fs.access(filePath);
        } catch {
          setCustomModes([]);
          return;
        }

        const fileContent = await fs.readFile(filePath, "utf8");
        const data = JSON.parse(fileContent);
        if (data && Array.isArray(data.customModes)) {
          setCustomModes(data.customModes);
        } else {
          setCustomModes([]);
        }
      } catch (error) {
        console.error(error);
        setCustomModes([]);
      }
    };

    fetchCustomModes();
  }, [preferences.customModesPath]);

  return customModes;
}
