import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { fetchDatabases, renderPluralIfNeeded } from "./utils";
import { useEffect, useState } from "react";
import { Connection, Group, tintColors } from "./interfaces";
import { preferences } from "./utils";

export default function DatabaseList() {
  const [state, setState] = useState<{ isLoading: boolean; connections?: Group[] }>({ isLoading: true });

  useEffect(() => {
    (async () => {
      setState(await fetchDatabases());
    })();
  }, []);

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Filter connections...">
      <List.EmptyView icon={{ source: "no-view.png" }} title="No databases found in TablePlus, go add one!" />
      {state &&
        state.connections?.map((item) => {
          const subtitle = `${item.connections.length} ${renderPluralIfNeeded(item.connections.length)}`;

          return (
            <List.Section key={item.id} title={item.name} subtitle={subtitle}>
              {item.connections.map((connection) => (
                <ConnectionListItem key={connection.id} connection={connection} groupName={item.name} />
              ))}
            </List.Section>
          );
        })}
    </List>
  );

  function getAccessories(connection: Connection) {
    const accessories = [];

    if (preferences.showConnectionDriver) {
      accessories.push({ tag: connection.Driver.toString() });
    }

    accessories.push({
      tag: {
        color: tintColors[connection.Environment],
        value: connection.Environment.charAt(0).toUpperCase() + connection.Environment.slice(1),
      },
    });

    return accessories;
  }

  function ConnectionListItem(props: { connection: Connection; groupName: string }) {
    const connection = props.connection;
    const groupName = props.groupName;

    return (
      <List.Item
        id={connection.id}
        key={connection.id}
        title={connection.name}
        subtitle={connection.subtitle}
        accessories={getAccessories(connection)}
        icon={connection.icon}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Database" icon={Icon.Coin} url={`tableplus://?id=${connection.id}`} />
          </ActionPanel>
        }
        keywords={preferences.searchByGroupName ? [groupName] : []}
      />
    );
  }
}
