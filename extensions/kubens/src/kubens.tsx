import { ActionPanel, Color, Action, Icon, List } from "@raycast/api";
import React from "react";

import useKubens from "./useKubens";

const Command: React.FC = () => {
  const { namespaces, switchNamespace, currentNamespace, loading } = useKubens();

  const getAccessoryIcon = (namespaceName: string) => {
    if (namespaceName !== currentNamespace) {
      return { source: Icon.Checkmark };
    }

    return { source: Icon.Checkmark, tintColor: Color.Green };
  };

  const handleSwitchNamespace = async (namespaceName: string) => {
    await switchNamespace(namespaceName);
  };

  return (
    <List isLoading={loading} searchBarPlaceholder="Filter by title...">
      {namespaces.map((item) => (
        <List.Item
          key={item}
          title={item}
          icon={getAccessoryIcon(item)}
          actions={
            <ActionPanel>
              <Action title={`Switch to ${item}`} icon={Icon.Checkmark} onAction={() => handleSwitchNamespace(item)} />
              <Action.CopyToClipboard content={item} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default Command;
