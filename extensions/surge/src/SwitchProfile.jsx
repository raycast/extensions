import { ActionPanel, Color, Icon, List, ToastStyle, popToRoot, showToast } from "@raycast/api"
import api from "./api"

/**
 * @param {Object} props
 * @param {string} props.xKey
 * @param {string} props.port
 * @param {boolean} props.allProfiles
 * @param {boolean} props.currentProfile
 * @returns {React.ReactElement}
 */
export default function SwitchProfile({ xKey, port, allProfiles, currentProfile }) {
  const iconCheckMark = { source: Icon.Checkmark, tintColor: Color.Green }
  const iconTransparent = { source: "Transparent.png" }

  /**
   * Change profile.
   * @param {Object} props
   * @param {string} props.profileName
   */
  async function handleAction(profileName) {
    try {
      await api(xKey, port).changeProfile(profileName)
      await showToast(ToastStyle.Success, "Success", `Profile has been changed to "${profileName}".`)
      popToRoot({ clearSearchBar: true })
    } catch (err) {
      await showToast(ToastStyle.Failure, "Failed", "Please check your X-Key, port and function availability")
    }
  }

  return (
    <List.Item
      title="Switch Profile"
      subtitle={currentProfile}
      icon={Icon.ArrowRight}
      actions={
        <ActionPanel title="Switch Profile">
          <ActionPanel.Submenu title="Switch Profile">
            {allProfiles.map(profile => (
              <ActionPanel.Item
                key={profile}
                title={profile}
                icon={profile === currentProfile ? iconCheckMark : iconTransparent}
                onAction={() => handleAction(profile)}
              />
            ))}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  )
}
