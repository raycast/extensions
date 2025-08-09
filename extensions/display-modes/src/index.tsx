import { ActionPanel, List, Action, useNavigation, showHUD, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { listDisplays, setMode, formatDisplayMode, formatDisplayTitle, formatDisplaySubtitle } from "./utils";
import { DisplayInfo, areModesEqual } from "./types";

export default function Command() {
  const [displays, setDisplays] = useState<DisplayInfo[] | undefined>();

  async function fetchDisplaysInfo() {
    const displays = await listDisplays();
    setDisplays(displays);
  }

  useEffect(() => {
    fetchDisplaysInfo();
  }, []);

  const navigation = useNavigation();

  function DetailComponent({ display }: { display: DisplayInfo }) {
    // First, map the modes to an array of objects with mode and isEqual properties
    const modesWithComparison = display.modes.map((mode) => ({
      mode: mode,
      isEqual: areModesEqual(mode, display.currentMode),
    }));

    return (
      <List navigationTitle={formatDisplayTitle(display)}>
        {modesWithComparison.map((modeInfo, index) => {
          return (
            <List.Item
              key={index}
              icon={modeInfo.isEqual ? "selected-mode-icon.png" : "mode-icon.png"}
              title={formatDisplayMode(modeInfo.mode)}
              subtitle={modeInfo.isEqual ? "Current Mode" : undefined}
              actions={
                <ActionPanel>
                  <Action
                    title="Change Display Mode"
                    icon={Icon.Monitor}
                    onAction={async () => {
                      const result = await setMode(display.display.id, modeInfo.mode);

                      if (result) {
                        await showHUD(`✅ Mode changed successfully ${formatDisplayMode(modeInfo.mode)}`);
                        await fetchDisplaysInfo();
                        navigation.pop();
                      } else {
                        showFailureToast("Failed to change display mode");
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List>
    );
  }

  return (
    <List isLoading={displays === undefined}>
      {displays?.map((display, index) => {
        return (
          <List.Item
            key={index}
            icon="display-icon.png"
            title={formatDisplayTitle(display)}
            subtitle={formatDisplaySubtitle(display)}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Display Modes"
                  icon={Icon.Monitor}
                  target={<DetailComponent display={display} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
