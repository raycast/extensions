import { Action, ActionPanel, Icon, List, Toast, popToRoot, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import api from "./api.js";

/**
 * @param {Object} props
 * @param {string} props.xKey
 * @param {string} props.port
 * @returns {React.ReactElement}
 */
export default function FlushDNS({ xKey, port }: { xKey: string; port: string }) {
  // Flush the DNS cache.
  async function handleAction() {
    try {
      await api(xKey, port).flushDnsCache();
      await showToast(Toast.Style.Success, "Success", "The DNS cache has been flushed.");
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
      title="Flush the DNS cache"
      icon={Icon.Dot}
      actions={
        <ActionPanel title="Flush">
          <ActionPanel.Submenu
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Flush DNS"
          >
            <Action title="Yes" onAction={() => handleAction()} />
            <Action title="No" />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
