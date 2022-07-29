import { ActionPanel, Color, Icon, List, ToastStyle, popToRoot, showToast } from "@raycast/api"
import api from "./api"

/**
 * @param {Object} props
 * @param {string} props.xKey
 * @param {string} props.port
 * @param {boolean} props.isSystemProxyEnabled
 * @returns {React.ReactElement}
 */
export default function SetAsSystemProxy({ xKey, port, isSystemProxyEnabled }) {
  const iconCheckMark = { source: Icon.Checkmark, tintColor: Color.Green }
  const iconExclamationMark = { source: Icon.ExclamationMark, tintColor: Color.Yellow }
  const iconTransparent = { source: "Transparent.png" }
  const iconListItem = isSystemProxyEnabled ? iconCheckMark : iconExclamationMark

  /**
   * Change System Proxy status.
   * @param {boolean} mode - pending system proxy status.
   */
  async function handleAction(mode) {
    try {
      await api(xKey, port).changeSystemProxyStatus(mode)
      await showToast(ToastStyle.Success, "Success", `System Proxy has been ${mode === true ? "enabled" : "disabled"}.`)
      popToRoot({ clearSearchBar: true })
    } catch (err) {
      await showToast(ToastStyle.Failure, "Failed", "Please check your X-Key, port and function availability")
    }
  }

  return (
    <List.Item
      title="Set as System Proxy"
      icon={iconListItem}
      actions={
        <ActionPanel title="Change System Proxy mode">
          <ActionPanel.Submenu title="Change System Proxy mode">
            <ActionPanel.Item
              title="Enable"
              icon={isSystemProxyEnabled ? iconCheckMark : iconTransparent}
              onAction={() => handleAction(true)}
            />
            <ActionPanel.Item
              title="Disable"
              icon={!isSystemProxyEnabled ? iconCheckMark : iconTransparent}
              onAction={() => handleAction(false)}
            />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  )
}
