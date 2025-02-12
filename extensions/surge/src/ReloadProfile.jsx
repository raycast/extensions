import { ActionPanel, Icon, List, ToastStyle, popToRoot, showToast } from "@raycast/api"
import api from "./api"

/**
 * @param {Object} props
 * @param {string} props.xKey
 * @param {string} props.port
 * @returns {React.ReactElement}
 */
export default function ReloadProfile({ xKey, port }) {
  // Reload profile immediately.
  async function handleAction() {
    try {
      await api(xKey, port).reloadProfile()
      await showToast(ToastStyle.Success, "Success", "Profile has been reloaded.")
      popToRoot({ clearSearchBar: true })
    } catch (err) {
      await showToast(ToastStyle.Failure, "Failed", "Please check your X-Key, port and function availability")
    }
  }

  return (
    <List.Item
      title="Reload Profile from File"
      icon={Icon.Dot}
      actions={
        <ActionPanel title="Reload now?">
          <ActionPanel.Submenu title="Reload now?">
            <ActionPanel.Item title="Yes" onAction={() => handleAction()} />
            <ActionPanel.Item title="No" />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  )
}
