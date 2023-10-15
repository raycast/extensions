import { ActionPanel, Action, Icon, List, showToast, Toast, getPreferenceValues, Color } from "@raycast/api";
import plist from "plist";
import fs from "fs";
import { homedir } from "os";
import path from "node:path";
import os from "node:os";
import expandTidle from "expand-tilde";
import { useEffect, useState } from "react";
import { Connection, Group, tintColors, Preferences } from "./interfaces";

const homeDirectory = os.homedir();
const EmptyGroupID = "__EMPTY__";
const preferences: Preferences = getPreferenceValues();
const appendPath = fs.existsSync(`${homedir()}/Library/Application Support/com.tinyapp.TablePlus-setapp/Data/`)
  ? "-setapp"
  : "";
const directoryPath = preferences.path
  ? expandTidle(preferences.path)
  : `${homedir()}/Library/Application Support/com.tinyapp.TablePlus${appendPath}/Data/`;

export default function DatabaseList() {
  const [state, setState] = useState<{ isLoading: boolean; connections?: Group[] }>({ isLoading: true });

  useEffect(() => {
    async function fetch() {
      const tablePlusLocation = `${directoryPath}/Connections.plist`;
      const groupLocations = `${directoryPath}/ConnectionGroups.plist`;

      if (!fs.existsSync(tablePlusLocation)) {
        showToast(
          Toast.Style.Failure,
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
      <List.EmptyView icon={{ source: "no-view.png" }} title="No databases found in TablePlus, go add one!" />
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

  function tildify(absolutePath: string) {
    const normalizedPath = path.normalize(absolutePath) + path.sep;

    return (
      normalizedPath.startsWith(homeDirectory)
        ? normalizedPath.replace(homeDirectory + path.sep, `~${path.sep}`)
        : normalizedPath
    ).slice(0, -1);
  }

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
        subtitle={tildify(subtitle)}
        accessories={getAccessories(connection)}
        icon={groupIcon}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Database" icon={Icon.Coin} url={`tableplus://?id=${connection.id}`} />
          </ActionPanel>
        }
      />
    );
  }
}
