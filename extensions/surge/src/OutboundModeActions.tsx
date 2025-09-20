import { ActionPanel, Color, Icon, List, Toast, popToRoot, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import api from "./api.js";
import { OutBoundMode } from "./types.js";

export default function OutboundModeActions({
  xKey,
  port,
  currentOutboundMode,
}: {
  xKey: string;
  port: string;
  currentOutboundMode: OutBoundMode;
}) {
  // https://manual.nssurge.com/others/http-api.html#outbound-mode
  const existOutboundModes: Record<OutBoundMode, string> = {
    direct: "Direct Outbound",
    proxy: "Global Proxy",
    rule: "Rule-Based Proxy",
  };

  async function changeOutboundMode(mode: OutBoundMode) {
    try {
      await api(xKey, port).changeOutboundMode(mode);
      await showToast(Toast.Style.Success, "Success", `Outbound Mode changed to ${existOutboundModes[mode]}`);
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
      title="Outbound Mode"
      icon={Icon.ArrowRight}
      subtitle={existOutboundModes[currentOutboundMode]}
      actions={
        <ActionPanel title="Change Outbound Mode">
          <ActionPanel.Submenu title="Change Outbound Mode">
            {Object.entries(existOutboundModes).map(([key]) => (
              <OutboundModeAction
                key={key}
                currentOutboundMode={currentOutboundMode}
                mode={key as OutBoundMode}
                title={existOutboundModes[key as OutBoundMode]}
                handleAction={changeOutboundMode}
              />
            ))}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}

function OutboundModeAction({
  currentOutboundMode,
  mode,
  title,
  handleAction,
}: {
  currentOutboundMode: OutBoundMode;
  mode: OutBoundMode;
  title: string;
  handleAction: (mode: OutBoundMode) => Promise<void>;
}) {
  const iconCheckMark = { source: Icon.Checkmark, tintColor: Color.Green };
  const iconTransparent = { source: "Transparent.png" };

  return (
    <ActionPanel.Item
      title={title}
      icon={currentOutboundMode === mode ? iconCheckMark : iconTransparent}
      onAction={() => handleAction(mode)}
    />
  );
}
