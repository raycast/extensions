import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";
import { homedir } from "os";

interface SourcetreePreference {
  bin: string;
  plist: string;

  isBinAvailable(): boolean;
}

export class Preferences {
  static get(): SourcetreePreference {
    const preferences = getPreferenceValues<SourcetreePreference>();
    preferences.bin = preferences.bin.replace("~", homedir());
    preferences.plist = preferences.plist.replace("~", homedir());

    return {
      ...preferences,

      isBinAvailable(): boolean {
        return existsSync(preferences.bin);
      },
    };
  }
}
