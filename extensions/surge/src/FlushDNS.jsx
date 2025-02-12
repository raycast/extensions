import { ActionPanel, Icon, List, ToastStyle, popToRoot, showToast } from "@raycast/api"
import api from "./api"

/**
 * @param {Object} props
 * @param {string} props.xKey
 * @param {string} props.port
 * @returns {React.ReactElement}
 */
export default function FlushDNS({ xKey, port }) {
  // Flush the DNS cache.
  async function handleAction() {
    try {
      await api(xKey, port).flushDnsCache()
      await showToast(ToastStyle.Success, "Success", "The DNS cache has been flushed.")
      popToRoot({ clearSearchBar: true })
    } catch (err) {
      await showToast(ToastStyle.Failure, "Failed", "Please check your X-Key, port and function availability")
    }
  }

  return (
    <List.Item
      title="Flush the DNS cache"
      icon={Icon.Dot}
      actions={
        <ActionPanel title="Flush now?">
          <ActionPanel.Submenu title="Flush now?">
            <ActionPanel.Item title="Yes" onAction={() => handleAction()} />
            <ActionPanel.Item title="No" />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  )
}
