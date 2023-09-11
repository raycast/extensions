import { List } from "@raycast/api";
import { fetchDatabases, renderPluralIfNeeded } from "./utils";
import { useEffect, useState } from "react";
import { Group } from "./interfaces";
import { ConnectionListItem } from "./components/ConnectionListItem";

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
}
