import { ActionPanel, Icon, List, OpenInBrowserAction, showToast, ToastStyle, getPreferenceValues } from "@raycast/api";
import plist from "plist";
import fs from "fs";
import { homedir } from "os";

import expandTidle from "expand-tilde";

import { useEffect, useState } from "react";
import { Connection, Group, tintColors, Preferences } from "./interfaces";

const EmptyGroupID = "__EMPTY__";
const preferences: Preferences = getPreferenceValues();
const directoryPath = preferences.path
  ? expandTidle(preferences.path)
  : `${homedir()}/Library/Application Support/com.tinyapp.TablePlus/Data/`;

export default function DatabaseList() {
  const [state, setState] = useState<{ isLoading: boolean; connections?: Group[] }>({ isLoading: true });

  useEffect(() => {
    async function fetch() {
      const tablePlusLocation = `${directoryPath}/Connections.plist`;
      const groupLocations = `${directoryPath}/ConnectionGroups.plist`;

      if (!fs.existsSync(tablePlusLocation)) {
        showToast(
          ToastStyle.Failure,
          "Error loading connections",
          "TablePlus data directory not found, add directory path in preferences"
        );
        setState({ isLoading: false });
      } else {
        const connectionsList = plist.parse(
          fs.readFileSync(tablePlusLocation, "utf8")
        ) as ReadonlyArray<plist.PlistObject>;
        const groupList = plist.parse(fs.readFileSync(groupLocations, "utf8")) as ReadonlyArray<plist.PlistObject>;

        const groups = new Map<string, Group>(
          groupList.map((group) => [
            group.ID.toString(),
            { id: group.ID.toString(), name: group.Name.toString(), connections: [] },
          ])
        );

        groups.set(EmptyGroupID, {
          id: EmptyGroupID,
          name: "Ungrouped",
          connections: [],
        });

        connectionsList.forEach((connection) => {
          const groupId = connection.GroupID?.toString() !== "" ? connection.GroupID?.toString() : EmptyGroupID;

          const conn: Connection = {
            id: connection.ID.toString(),
            groupId,
            name: connection.ConnectionName.toString() ?? "",
            driver: connection.Driver.toString(),
            isSocket: connection.isUseSocket === 1,
            isOverSSH: connection.isOverSSH === 1,
            database: connection.DatabaseName.toString(),
            ServerAddress: connection.ServerAddress.toString(),
            DatabaseHost: connection.DatabaseHost.toString(),
            Driver: connection.Driver.toString(),
            Environment: connection.Enviroment.toString(),
          };

          groups.get(groupId)?.connections.push(conn);
        });

        setState({ isLoading: false, connections: Array.from(groups.values()) });
      }
    }

    fetch();
  }, []);

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Filter connections...">
      {state &&
        state.connections?.map((item) => {
          const subtitle = `${item.connections.length} ${renderPluralIfNeeded(item.connections.length)}`;

          return (
            <List.Section key={item.id} title={item.name} subtitle={subtitle}>
              {item.connections.map((connection) => (
                <ConnectionListItem key={connection.id} connection={connection} />
              ))}
            </List.Section>
          );
        })}
    </List>
  );

  function renderPluralIfNeeded(itemsLength: number) {
    return `item${itemsLength > 1 ? "s" : ""}`;
  }

  function ConnectionListItem(props: { connection: Connection }) {
    const connection = props.connection;

    let subtitle = connection.isOverSSH ? "SSH" : connection.isSocket ? "SOCKET" : connection.DatabaseHost;
    if (connection.database && connection.Driver !== "SQLite") {
      subtitle += ` : ${connection.database}`;
    } else if (connection.Driver === "SQLite" && connection.isOverSSH) {
      subtitle += ` : ${connection.DatabaseHost}`;
    }

    let groupIcon = "icon.png";
    if (connection.groupId) {
      if (fs.existsSync(`${directoryPath}/${connection.groupId}`)) {
        groupIcon = `${directoryPath}/${connection.groupId}`;
      }
    }

    return (
      <List.Item
        id={connection.id}
        key={connection.id}
        title={connection.name}
        subtitle={subtitle}
        accessoryIcon={groupIcon}
        accessoryTitle={connection.Driver}
        icon={{ source: Icon.Dot, tintColor: tintColors[connection.Environment] }}
        actions={
          <ActionPanel>
            <OpenInBrowserAction title="Open Database" url={`tableplus://?id=${connection.id}`} />
          </ActionPanel>
        }
      />
    );
  }
}
