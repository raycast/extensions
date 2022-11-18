import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/preferences";
import { AppWindowCount } from "../types/type";
import { appIsActive } from "./applescript-utils";

export async function getEnabledApps() {
  const { notes, preview, textEdit, terminal, quickTimePlayer, shortcuts, tv, messages, mail } =
    getPreferenceValues<Preferences>();

  const activeAppName = await appIsActive();

  const appWindowCounts: AppWindowCount[] = [
    { name: "Preview", windows: "0", enabled: preview },
    { name: "TextEdit", windows: "0", enabled: textEdit },
    { name: "Messages", windows: "0", enabled: messages },
    { name: "Terminal", windows: "0", enabled: terminal },
    { name: "QuickTime Player", windows: "0", enabled: quickTimePlayer },
    { name: "Notes", windows: "1", enabled: notes },
    { name: "Shortcuts", windows: "1", enabled: shortcuts },
    { name: "TV", windows: "1", enabled: tv },
    { name: "Mail", windows: "0", enabled: mail },
  ];

  return appWindowCounts.filter((value) => {
    return value.enabled && value.name !== activeAppName;
  });
}
