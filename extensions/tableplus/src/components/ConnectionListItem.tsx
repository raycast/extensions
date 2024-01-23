import { List, ActionPanel } from "@raycast/api";
import { Connection } from "../interfaces";
import { preferences } from "../constants";
import { GetAccessories } from "./GetAccessories";
import { Actions } from "./Actions";

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
          <Actions connection={connection} groupName={groupName} />
        </ActionPanel>
      }
      keywords={preferences.searchByGroupName ? [groupName] : []}
    />
  );
};
