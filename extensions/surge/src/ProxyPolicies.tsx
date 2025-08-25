import { Action, ActionPanel, Color, Icon, List, Toast, popToRoot, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import api from "./api.js";

export default function ProxyPolicies({
  xKey,
  port,
  allPolicyGroups,
  allSelectOptions,
}: {
  xKey: string;
  port: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allPolicyGroups: Record<string, any>;
  allSelectOptions: string[];
}) {
  const iconCheckMark = { source: Icon.Checkmark, tintColor: Color.Green };
  const iconTransparent = { source: "Transparent.png" };

  async function handleAction({ groupName, option }: { groupName: string; option: string }) {
    try {
      await api(xKey, port).changeOptionOfGroup(groupName, option);
      await showToast(Toast.Style.Success, "Success", "The option has been changed.");
      popToRoot({ clearSearchBar: true });
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed",
        message: "Please check your X-Key, port and function availability",
      });
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
              <ActionPanel.Submenu title="Change the Option">
                {groupOptions
                  // @ts-expect-error: groupOptions is expected to be an array of policy options
                  .map((policyOption) => (
                    <Action
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
  );
}
