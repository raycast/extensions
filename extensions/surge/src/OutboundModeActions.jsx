import { ActionPanel, Color, Icon, List, ToastStyle, popToRoot, showToast } from "@raycast/api"
import api from "./api"

/**
 * @param {Object} props
 * @param {string} props.xKey
 * @param {string} props.port
 * @param {boolean} props.currentOutboundMode
 * @returns {React.ReactElement}
 */
export default function OutboundModeActions({ xKey, port, currentOutboundMode }) {
  // https://manual.nssurge.com/others/http-api.html#outbound-mode
  const existOutboundModes = {
    direct: "Direct Outbound",
    proxy: "Global Proxy",
    rule: "Rule-Based Proxy"
  }

  /**
   * Change Outbound Mode.
   * @param {string} mode - pending Outbound Mode.
   */
  async function changeOutboundMode(mode) {
    try {
      await api(xKey, port).changeOutboundMode(mode)
      await showToast(ToastStyle.Success, "Success", `Outbound Mode changed to ${existOutboundModes[mode]}`)
      popToRoot({ clearSearchBar: true })
    } catch (err) {
      await showToast(ToastStyle.Failure, "Failed", "Please check your X-Key, port and function availability")
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
                mode={key}
                title={existOutboundModes[key]}
                handleAction={changeOutboundMode}
              />
            ))}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  )
}

/**
 * Render Outbound Mode action.
 * @param {Object} props
 * @param {string} props.currentOutboundMode
 * @param {string} props.mode - keyed Outbound Mode.
 * @param {string} props.title - Outbound Mode label.
 * @param {Function} props.handleAction - callback function to update current Outbound Mode.
 * @returns {React.ReactElement}
 */
function OutboundModeAction({ currentOutboundMode, mode, title, handleAction }) {
  const iconCheckMark = { source: Icon.Checkmark, tintColor: Color.Green }
  const iconTransparent = { source: "Transparent.png" }

  return (
    <ActionPanel.Item
      title={title}
      icon={currentOutboundMode === mode ? iconCheckMark : iconTransparent}
      onAction={() => handleAction(mode)}
    />
  )
}
