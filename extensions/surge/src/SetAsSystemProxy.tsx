import { Action, ActionPanel, Color, Icon, List, ToastStyle, popToRoot, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import api from "./api.js";

export default function SetAsSystemProxy({
  xKey,
  port,
  isSystemProxyEnabled,
}: {
  xKey: string;
  port: string;
  isSystemProxyEnabled: boolean;
}) {
  const iconCheckMark = { source: Icon.Checkmark, tintColor: Color.Green };
  const iconExclamationMark = { source: Icon.ExclamationMark, tintColor: Color.Yellow };
  const iconTransparent = { source: "Transparent.png" };
  const iconListItem = isSystemProxyEnabled ? iconCheckMark : iconExclamationMark;

  async function handleAction(mode: boolean) {
    try {
      await api(xKey, port).changeSystemProxyStatus(mode);
      await showToast(
        ToastStyle.Success,
        "Success",
        `System Proxy has been ${mode === true ? "enabled" : "disabled"}.`,
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
      title="Set as System Proxy"
      icon={iconListItem}
      actions={
        <ActionPanel title="Change System Proxy mode">
          <ActionPanel.Submenu title="Change System Proxy Mode">
            <Action
              title="Enable"
              icon={isSystemProxyEnabled ? iconCheckMark : iconTransparent}
              onAction={() => handleAction(true)}
            />
            <Action
              title="Disable"
              icon={!isSystemProxyEnabled ? iconCheckMark : iconTransparent}
              onAction={() => handleAction(false)}
            />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
