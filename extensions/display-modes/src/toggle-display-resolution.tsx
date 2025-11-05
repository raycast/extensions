
import React from "react";
import { showHUD, getPreferenceValues, LocalStorage, ActionPanel, List, Action, useNavigation } from "@raycast/api";
import { listDisplays, setMode, formatDisplayMode, formatDisplayTitle } from "./utils";
import { DisplayInfo, Mode } from "./types";

export default function Command() {
  const [displays, setDisplays] = React.useState<DisplayInfo[] | undefined>();
  const [displayNames, setDisplayNames] = React.useState<Record<string, string>>({});
  const { pop } = useNavigation();

  React.useEffect(() => {
    async function fetchDisplays() {
      try {
        const displays = await listDisplays();
        setDisplays(displays);
      } catch (error) {
        showHUD("❌ Failed to list displays");
      }
    }
    fetchDisplays();
  }, []);

  React.useEffect(() => {
    async function fetchDisplayNames() {
      const names = await LocalStorage.getItem<string>("displayNames");
      if (names) {
        setDisplayNames(JSON.parse(names));
      }
    }
    fetchDisplayNames();
  }, []);

  const preferences = getPreferenceValues();

  if (!displays) {
    return <List isLoading={true} />;
  }

  let display: DisplayInfo | undefined;

  if (preferences.selectedDisplay) {
    display = displays.find((d) => d.display.id === Number(preferences.selectedDisplay));
  }

  if (!display) {
    if (displays.length === 1) {
      display = displays[0];
toggleResolutionLogic(display).then(() => pop());
      return null;
    } else {
      // If there are multiple displays, show a list to choose from
      return (
        <List>
          {displays.map((d) => (
            <List.Item
              key={d.display.id}
              title={displayNames[d.display.id] || formatDisplayTitle(d)}
              actions={
                <ActionPanel>
                  <Action
                    title="Select Display"
                    onAction={async () => {
                      await LocalStorage.setItem("selectedDisplay", d.display.id.toString());
                      await toggleResolutionLogic(d);
                      pop();
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List>
      );
    }
  } else {
    toggleResolutionLogic(display).then(() => pop());
    return null;
  }

  return <List isLoading={true} />;
}

async function toggleResolutionLogic(display: DisplayInfo) {
  const previousModeStr = await LocalStorage.getItem<string>(`previousMode_${display.display.id}`);
  const currentMode = display.currentMode;

  if (previousModeStr) {
    const previousMode = JSON.parse(previousModeStr) as Mode;
    // Toggle between current and previous
    const result = await setMode(display.display.id, previousMode);
    if (result) {
      await showHUD(`✅ Mode changed successfully ${formatDisplayMode(previousMode)}`);
      await LocalStorage.setItem(`previousMode_${display.display.id}`, JSON.stringify(currentMode));
    } else {
      await showHUD("❌ Failed to change display mode");
    }
  } else {
    // First time, store current and switch to next
    const modes = display.modes;
    const currentModeIndex = modes.findIndex(
      (mode) =>
        mode.width === currentMode.width &&
        mode.height === currentMode.height &&
        mode.refreshRate === currentMode.refreshRate &&
        mode.scale === currentMode.scale
    );
    const nextModeIndex = (currentModeIndex + 1) % modes.length;
    const nextMode = modes[nextModeIndex];

    const result = await setMode(display.display.id, nextMode);
    if (result) {
      await showHUD(`✅ Mode changed successfully ${formatDisplayMode(nextMode)}`);
      await LocalStorage.setItem(`previousMode_${display.display.id}`, JSON.stringify(currentMode));
    } else {
      await showHUD("❌ Failed to change display mode");
    }
  }
}



