import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";

interface SourcetreePreference {
  bin: string;
  plist: string;
}

export class Preferences {
  static get(): SourcetreePreference {
    const preferences = getPreferenceValues<SourcetreePreference>();
    preferences.bin = preferences.bin.replace("~", homedir());
    preferences.plist = preferences.plist.replace("~", homedir());

    return preferences;
  }
}
