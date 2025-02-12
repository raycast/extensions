import { ActionPanel, Color, Icon, List, ToastStyle, popToRoot, showToast } from "@raycast/api"
import api from "./api"

/**
 * @param {Object} props
 * @param {string} props.xKey
 * @param {string} props.port
 * @param {boolean} props.allPolicyGroups - All policy group(s) and their options.
 * @param {boolean} props.allSelectOptions - All options of select group(s).
 * @returns {React.ReactElement}
 */
export default function ProxyPolicies({ xKey, port, allPolicyGroups, allSelectOptions }) {
  const iconCheckMark = { source: Icon.Checkmark, tintColor: Color.Green }
  const iconTransparent = { source: "Transparent.png" }

  /**
   * Change Proxy Policy.
   * @param {Object} props
   * @param {string} props.groupName
   * @param {string} props.option - The option of a select Proxy Policy.
   */
  async function handleAction({ groupName, option }) {
    try {
      await api(xKey, port).changeOptionOfGroup(groupName, option)
      await showToast(ToastStyle.Success, "Success", "The option has been changed.")
      popToRoot({ clearSearchBar: true })
    } catch (err) {
      await showToast(ToastStyle.Failure, "Failed", "Please check your X-Key, port and function availability")
    }
  }

  return (
    <>
      {Object.entries(allPolicyGroups).map(([groupName, groupOptions], idx) => (
        <List.Item
          key={`policy-group-${groupName}`}
          title={groupName}
          subtitle={allSelectOptions[idx]}
          icon={Icon.MemoryChip}
          actions={
            <ActionPanel title="Change the option">
              <ActionPanel.Submenu title="Change the option">
                {groupOptions.map(policyOption => (
                  <ActionPanel.Item
                    key={`policy-option-${policyOption.lineHash}`}
                    title={policyOption.name}
                    icon={allSelectOptions[idx] === policyOption.name ? iconCheckMark : iconTransparent}
                    onAction={() => handleAction({ groupName, option: policyOption.name })}
                  />
                ))}
              </ActionPanel.Submenu>
            </ActionPanel>
          }
        />
      ))}
    </>
  )
}
