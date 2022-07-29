import { ActionPanel, Color, CopyToClipboardAction, Icon, List } from "@raycast/api";
import React from "react";

import useKubectx from "./hooks/useKubectx";

const Command: React.FC = () => {
  const { contextes, switchContext, currentContext, loading } = useKubectx();

  const getAccessoryIcon = (contextName: string) => {
    if (contextName !== currentContext) {
      return { source: Icon.Checkmark };
    }

    return { source: Icon.Checkmark, tintColor: Color.Green };
  };

  const handleSwitchContext = async (contextName: string) => {
    await switchContext(contextName);
  };

  return (
    <List isLoading={loading} searchBarPlaceholder="Filter by title...">
      {contextes.map((item) => (
        <List.Item
          key={item}
          title={item}
          icon={getAccessoryIcon(item)}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title={`Switch to ${item}`}
                icon={Icon.Checkmark}
                onAction={() => handleSwitchContext(item)}
              />
              <CopyToClipboardAction content={item} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default Command;
