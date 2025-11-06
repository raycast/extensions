import React from "react";
import { showHUD, getPreferenceValues, LocalStorage, ActionPanel, List, Action, useNavigation } from "@raycast/api";
import { listDisplays, setMode, formatDisplayMode, formatDisplayTitle } from "./utils";
import { DisplayInfo, Mode } from "./types";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const {
    data: displays,
    isLoading: isLoadingDisplays,
    revalidate: revalidateDisplays,
  } = useCachedPromise(listDisplays);
  const { data: displayNames } = useCachedPromise(
    async () => {
      const names = await LocalStorage.getItem<string>("displayNames");
      return names ? JSON.parse(names) : {};
    },
    [],
    { initialData: {} },
  );
  const { pop } = useNavigation();

  const preferences = getPreferenceValues();

  if (isLoadingDisplays) {
    return <List isLoading={true} />;
  }

  let display: DisplayInfo | undefined;

  if (preferences.selectedDisplay) {
    display = displays?.find((d) => d.display.id === Number(preferences.selectedDisplay));
  }

  if (!display) {
    if (displays && displays.length === 1) {
      display = displays[0];
      toggleResolutionLogic(display, revalidateDisplays).then(() => pop());
      return null;
    } else {
      // If there are multiple displays, show a list to choose from
      return (
        <List isLoading={isLoadingDisplays}>
          {displays?.map((d) => (
            <List.Item
              key={d.display.id}
              title={displayNames?.[d.display.id] || formatDisplayTitle(d)}
              actions={
                <ActionPanel>
                  <Action
                    title="Select Display"
                    onAction={async () => {
                      await LocalStorage.setItem("selectedDisplay", d.display.id.toString());
                      await toggleResolutionLogic(d, revalidateDisplays);
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
    toggleResolutionLogic(display, revalidateDisplays).then(() => pop());
    return null;
  }
}

async function toggleResolutionLogic(display: DisplayInfo, revalidateDisplays: () => void) {
  const previousModeStr = await LocalStorage.getItem<string>(`previousMode_${display.display.id}`);
  const currentMode = display.currentMode;

  if (previousModeStr) {
    const previousMode = JSON.parse(previousModeStr) as Mode;
    // Toggle between current and previous
    const result = await setMode(display.display.id, previousMode);
    if (result) {
      await showHUD(`✅ Mode changed successfully ${formatDisplayMode(previousMode)}`);
      await LocalStorage.setItem(`previousMode_${display.display.id}`, JSON.stringify(currentMode));
      revalidateDisplays();
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
        mode.scale === currentMode.scale,
    );
    const nextModeIndex = (currentModeIndex + 1) % modes.length;
    const nextMode = modes[nextModeIndex];

    const result = await setMode(display.display.id, nextMode);
    if (result) {
      await showHUD(`✅ Mode changed successfully ${formatDisplayMode(nextMode)}`);
      await LocalStorage.setItem(`previousMode_${display.display.id}`, JSON.stringify(currentMode));
      revalidateDisplays();
    } else {
      await showHUD("❌ Failed to change display mode");
    }
  }
}
