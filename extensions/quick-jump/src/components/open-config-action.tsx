import { Action, getPreferenceValues, open, Icon, Keyboard, popToRoot } from "@raycast/api";
import { environment } from "@raycast/api";
import path from "path";
import { Preferences } from "../types";
import { ACTION_TITLES } from "../constants";

export function OpenConfigFileAction({ shortcut }: { shortcut?: Keyboard.Shortcut }) {
  const preferences = getPreferenceValues<Preferences>();
  let filePath = preferences.jsonFilePath;

  if (!path.isAbsolute(filePath)) {
    filePath = path.join(environment.assetsPath, filePath);
  }

  return (
    <Action
      title={ACTION_TITLES.OPEN_CONFIG_FILE}
      icon={Icon.Gear}
      onAction={async () => {
        await popToRoot({ clearSearchBar: true });
        open(filePath);
      }}
      shortcut={shortcut}
    />
  );
}
