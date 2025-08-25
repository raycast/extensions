import { ActionPanel, Icon, List, getPreferenceValues, showHUD, showToast, Color, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import api from "./api.js";

interface PolicyOption {
  name: string;
  lineHash: string;
}

interface PolicyGroups {
  [groupName: string]: PolicyOption[];
}

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const xKey = preferences["x-key"];
  const port = preferences.port;

  const [policyGroups, setPolicyGroups] = useState<PolicyGroups>({});
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPolicyData() {
      try {
        // Fetch policy groups
        const groupsResponse = await api(xKey, port).getPolicyGroups();
        const groups = groupsResponse.data;

        setPolicyGroups(groups);

        // Fetch current selected options for each group
        const groupNames = Object.keys(groups);
        const selectedOptionsPromises = groupNames.map((groupName) =>
          api(xKey, port).getSelectOptionFromPolicyGroup(groupName),
        );

        const selectedOptionsResponses = await Promise.all(selectedOptionsPromises);
        const currentSelections = selectedOptionsResponses.map((response) => response.data.policy);
        setSelectedOptions(currentSelections);
      } catch (err) {
        console.error("Failed to fetch policy data:", err);
        await showToast(Toast.Style.Failure, "Failed to fetch proxy policies", "Please check your X-Key and port");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPolicyData();
  }, []);

  async function switchProxy(groupName: string, optionName: string) {
    try {
      await api(xKey, port).changeOptionOfGroup(groupName, optionName);
      await showHUD(`🔄 Switched ${groupName} to ${optionName}`);

      // Update local state to reflect the change
      const groupNames = Object.keys(policyGroups);
      const groupIndex = groupNames.indexOf(groupName);
      if (groupIndex !== -1) {
        const newSelectedOptions = [...selectedOptions];
        newSelectedOptions[groupIndex] = optionName;
        setSelectedOptions(newSelectedOptions);
      }
    } catch (error) {
      console.error("🚀 ~ switch-proxy.tsx:66 ~ switchProxy ~ error:", error);
      await showToast(
        Toast.Style.Failure,
        "Failed to switch proxy",
        "Please check your X-Key, port and function availability",
      );
    }
  }

  const groupEntries = Object.entries(policyGroups);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search proxy policies...">
      {groupEntries.map(([groupName, groupOptions], groupIndex) => {
        const currentSelection = selectedOptions[groupIndex];

        return groupOptions.map((option) => {
          const isSelected = currentSelection === option.name;

          return (
            <List.Item
              key={`${groupName}-${option.name}`}
              icon={{
                source: Icon.MemoryChip,
                tintColor: isSelected ? Color.Green : Color.SecondaryText,
              }}
              title={option.name}
              subtitle={`${groupName}${isSelected ? " (Current)" : ""}`}
              accessoryIcon={isSelected ? Icon.Checkmark : undefined}
              actions={
                <ActionPanel>
                  <ActionPanel.Item
                    title={`Switch to ${option.name}`}
                    onAction={() => switchProxy(groupName, option.name)}
                    icon={Icon.ArrowRight}
                  />
                </ActionPanel>
              }
            />
          );
        });
      })}
    </List>
  );
}
