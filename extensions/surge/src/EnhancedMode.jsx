import { ActionPanel, Color, Icon, List, ToastStyle, popToRoot, showToast } from "@raycast/api"
import api from "./api"

/**
 * @param {Object} props
 * @param {string} props.xKey
 * @param {string} props.port
 * @param {boolean} props.isEnhancedModeEnabled
 * @returns {React.ReactElement}
 */
export default function EnhancedMode({ xKey, port, isEnhancedModeEnabled }) {
  const iconCheckMark = { source: Icon.Checkmark, tintColor: Color.Green }
  const iconExclamationMark = { source: Icon.ExclamationMark, tintColor: Color.Yellow }
  const iconTransparent = { source: "Transparent.png" }
  const iconListItem = isEnhancedModeEnabled ? iconCheckMark : iconExclamationMark

  /**
   * Change Enhanced Mode.
   * @param {boolean} mode - pending Enhanced Mode.
   */
  async function handleAction(mode) {
    try {
      await api(xKey, port).changeEnhancedMode(mode)
      await showToast(
        ToastStyle.Success,
        "Success",
        `Enhanced Mode has been ${mode === true ? "enabled" : "disabled"}.`
      )
      popToRoot({ clearSearchBar: true })
    } catch (err) {
      await showToast(ToastStyle.Failure, "Failed", "Please check your X-Key, port and function availability")
    }
  }

  return (
    <List.Item
      title="Enhanced Mode"
      icon={iconListItem}
      actions={
        <ActionPanel title="Change Enhanced Mode">
          <ActionPanel.Submenu title="Change Enhanced Mode">
            <ActionPanel.Item
              title="Enable"
              icon={isEnhancedModeEnabled ? iconCheckMark : iconTransparent}
              onAction={() => handleAction(true)}
            />
            <ActionPanel.Item
              title="Disable"
              icon={!isEnhancedModeEnabled ? iconCheckMark : iconTransparent}
              onAction={() => handleAction(false)}
            />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  )
}
