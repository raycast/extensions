// @ts-nocheck - Raycast internal React types conflict with @types/react v18
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Clipboard,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  Preferences,
  parsePathList,
  getActivePath,
  setActivePath,
} from "./utils";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const paths = parsePathList(preferences.path);
  const [activePath, setActivePathState] = useState<string>("");

  useEffect(() => {
    getActivePath(preferences).then(setActivePathState);
  }, []);

  if (paths.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Folder}
          title="No Folders Configured"
          description="Add folder paths in extension preferences, separated by commas (e.g., images/, screenshots/)"
        />
      </List>
    );
  }

  return (
    <List>
      {paths.map((p) => (
        <List.Item
          key={p}
          icon={p === activePath ? Icon.Checkmark : Icon.Folder}
          title={p}
          actions={
            <ActionPanel>
              <Action
                title="Switch to This Folder"
                onAction={async () => {
                  await setActivePath(p);
                  setActivePathState(p);
                  await Clipboard.copy(p);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Switched to ${p}`,
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
