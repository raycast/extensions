import { ActionPanel, List, Action, useNavigation, showHUD, Icon } from "@raycast/api";
import { ReactNode, useEffect, useState } from "react";
import { listDisplays, setMode } from "./utils";
import { DisplayInfo, DisplayKind, Mode, areModesEqual } from "./types";

export default function Command() {
  const [displays, setDisplays] = useState<DisplayInfo[] | undefined>();

  async function fetchDisplaysInfo() {
    const displays = await listDisplays();
    setDisplays(displays);
  }

  useEffect(() => {
    fetchDisplaysInfo();
  }, []);

  function formatTitle(display: DisplayInfo): string {
    return `Display ${display.display.id} (${formatDisplayKind(display.display.kind)})`;
  }

  function formatSubtitle(display: DisplayInfo): string {
    return formatDisplayMode(display.currentMode);
  }

  function formatDisplayKind(kind: DisplayKind): string {
    switch (kind) {
      case DisplayKind.builtIn:
        return "Built-in";
      case DisplayKind.external:
        return "External";
      default:
        return "Unknown";
    }
  }

  function formatDisplayMode(mode: Mode): string {
    const widthFormatted = mode.width.toString().padStart(5, " ");
    const heightFormatted = mode.height.toString().padStart(5, " ");
    const scaleFormatted = mode.scale?.toString().padStart(2, " ") ?? "N/A";
    const refreshRateFormatted = mode.refreshRate.toString().padStart(4, " ");

    return `${widthFormatted} x ${heightFormatted} @ ${scaleFormatted}x ${refreshRateFormatted}Hz`;
  }

  const navigation = useNavigation();

  function detail(display: DisplayInfo): ReactNode {
    // First, map the modes to an array of objects with mode and isEqual properties
    const modesWithComparison = display.modes.map((mode) => ({
      mode: mode,
      isEqual: areModesEqual(mode, display.currentMode),
    }));

    return (
      <List navigationTitle={formatTitle(display)}>
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
                        await showHUD(`Mode changed successfully ${formatDisplayMode(modeInfo.mode)}`);
                        await fetchDisplaysInfo();
                        navigation.pop();
                      } else {
                        await showHUD("Failed to change display mode");
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
            title={formatTitle(display)}
            subtitle={formatSubtitle(display)}
            actions={
              <ActionPanel>
                <Action.Push title="Show Display Modes" icon={Icon.Monitor} target={detail(display)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
