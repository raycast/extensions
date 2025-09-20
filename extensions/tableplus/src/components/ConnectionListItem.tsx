import { List, ActionPanel, Action, openExtensionPreferences, Icon } from "@raycast/api";
import { Connection } from "../interfaces";
import { preferences } from "../constants";
import { GetAccessories } from "./GetAccessories";
import { OpenActions } from "./Actions";

export const ConnectionListItem = (props: { connection: Connection; groupName: string }) => {
  const { connection, groupName } = props;

  return (
    <List.Item
      id={connection.id}
      key={connection.id}
      title={connection.name}
      subtitle={connection.subtitle}
      accessories={GetAccessories(connection)}
      icon={connection.icon}
      actions={
        <ActionPanel>
          <OpenActions connection={connection} groupName={groupName} />
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          />
        </ActionPanel>
      }
      keywords={preferences.searchByGroupName ? [groupName] : []}
    />
  );
};
