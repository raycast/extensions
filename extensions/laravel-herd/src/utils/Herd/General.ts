import { readFileSync } from "fs";
import { Herd } from "../Herd";
import { homedir } from "os";

export class General {
  static async checkForUpdates(): Promise<void> {
    await Herd.runAppleScript<void>(`
        openSettings "about"
        check for updates
        `);
  }

  static async isPro(): Promise<boolean> {
    const response = await Herd.runAppleScript<string>(`has pro`);

    if (!response) return false;

    const proStatus = response.split(":");

    if (proStatus.length > 1) {
      return proStatus[1] === "true";
    }

    return false;
  }

  static async openSettings(tab: string): Promise<void> {
    await Herd.runAppleScript<void>(`openSettings "${tab}"`);
  }

  static async getConfig<T extends string | number | boolean>(
    key: string,
    defaultValue: string | number | boolean,
  ): Promise<T> {
    try {
      const path = homedir() + "/Library/Application Support/Herd/config/herd.json";
      const config = readFileSync(path, "utf8");
      const parsedConfig = JSON.parse(config);

      if (key in parsedConfig) {
        return parsedConfig[key] as T;
      }
    } catch (error: unknown) {
      console.error(error);
    }

    return defaultValue as T;
  }
}
