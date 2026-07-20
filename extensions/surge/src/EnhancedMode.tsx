import { Action, ActionPanel, Color, Icon, List, Toast, popToRoot, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import api from "./api.js";

export default function EnhancedMode({
  xKey,
  port,
  isEnhancedModeEnabled,
}: {
  xKey: string;
  port: string;
  isEnhancedModeEnabled: boolean;
}) {
  const iconCheckMark = { source: Icon.Checkmark, tintColor: Color.Green };
  const iconExclamationMark = { source: Icon.ExclamationMark, tintColor: Color.Yellow };
  const iconTransparent = { source: "Transparent.png" };
  const iconListItem = isEnhancedModeEnabled ? iconCheckMark : iconExclamationMark;

  /**
   * Change Enhanced Mode.
   * @param {boolean} mode - pending Enhanced Mode.
   */
  async function handleAction(mode: boolean) {
    try {
      await api(xKey, port).changeEnhancedMode(mode);
      await showToast(
        Toast.Style.Success,
        "Success",
        `Enhanced Mode has been ${mode === true ? "enabled" : "disabled"}.`,
      );
      popToRoot({ clearSearchBar: true });
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed",
        message: "Please check your X-Key, port and function availability",
      });
    }
  }

  return (
    <List.Item
      title="Enhanced Mode"
      icon={iconListItem}
      actions={
        <ActionPanel title="Change Enhanced Mode">
          <ActionPanel.Submenu title="Change Enhanced Mode">
            <Action
              title="Enable"
              icon={isEnhancedModeEnabled ? iconCheckMark : iconTransparent}
              onAction={() => handleAction(true)}
            />
            <Action
              title="Disable"
              icon={!isEnhancedModeEnabled ? iconCheckMark : iconTransparent}
              onAction={() => handleAction(false)}
            />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
