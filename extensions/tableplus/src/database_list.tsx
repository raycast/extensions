import { Icon, List } from "@raycast/api";
import { fetchDatabases, renderPluralIfNeeded } from "./utils";
import { useEffect, useState } from "react";
import { Group } from "./interfaces";
import { ConnectionListItem } from "./components/ConnectionListItem";
import { getAvatarIcon } from "@raycast/utils";

export default function DatabaseList() {
  const [state, setState] = useState<{
    isLoading: boolean;
    connections?: Group[];
  }>({ isLoading: true });
  const [filterDriver, setFilterDriver] = useState("");

  useEffect(() => {
    (async () => {
      setState(await fetchDatabases());
    })();
  }, []);

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder="Filter connections..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilterDriver}>
          <List.Dropdown.Item icon={Icon.Coin} title="All" value="" />
          {[...new Set(state.connections?.flatMap((group) => group.connections.map((conn) => conn.Driver)))].map(
            (driver) => (
              <List.Dropdown.Item key={driver} icon={getAvatarIcon(driver)} title={driver} value={driver} />
            ),
          )}
        </List.Dropdown>
      }
    >
      <List.EmptyView icon={{ source: "no-view.png" }} title="No databases found in TablePlus, go add one!" />
      {state &&
        state.connections?.map((item) => {
          const connections = item.connections.filter((conn) => !filterDriver || conn.Driver === filterDriver);
          const subtitle = `${connections.length} ${renderPluralIfNeeded(connections.length)}`;

          return (
            <List.Section key={item.id} title={item.name} subtitle={subtitle}>
              {connections.map((connection) => (
                <ConnectionListItem key={connection.id} connection={connection} groupName={item.name} />
              ))}
            </List.Section>
          );
        })}
    </List>
  );
}
