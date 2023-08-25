import { homedir } from "os";
import os from "node:os";
import fs from "fs";
import expandTidle from "expand-tilde";
import { Connection, Group } from "./interfaces";
import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import plist from "plist";
import path from "node:path";

export const homeDirectory = os.homedir();
export const EmptyGroupID = "__EMPTY__";
export const preferences = getPreferenceValues<ExtensionPreferences>();
export const appendPath = fs.existsSync(`${homedir()}/Library/Application Support/com.tinyapp.TablePlus-setapp/Data/`)
  ? "-setapp"
  : "";

export const directoryPath = preferences.path
  ? expandTidle(preferences.path)
  : `${homedir()}/Library/Application Support/com.tinyapp.TablePlus${appendPath}/Data/`;

export async function fetchDatabases() {
  const tablePlusLocation = `${directoryPath}/Connections.plist`;
  const groupLocations = `${directoryPath}/ConnectionGroups.plist`;

  if (!fs.existsSync(tablePlusLocation)) {
    showToast(
      Toast.Style.Failure,
      "Error loading connections",
      "TablePlus data directory not found, add directory path in preferences"
    );
    return { isLoading: false };
  } else {
    const connectionsList = plist.parse(fs.readFileSync(tablePlusLocation, "utf8")) as ReadonlyArray<plist.PlistObject>;
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

      let groupIcon = "icon.png";
      if (connection.groupId) {
        if (fs.existsSync(`${directoryPath}/${connection.groupId}`)) {
          groupIcon = `${directoryPath}/${connection.groupId}`;
        }
      }

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
        icon: groupIcon,
      };

      groups.get(groupId)?.connections.push(conn);
    });

    return { isLoading: false, connections: Array.from(groups.values()) };
  }
}

export function tildify(absolutePath: string) {
  const normalizedPath = path.normalize(absolutePath) + path.sep;

  return (
    normalizedPath.startsWith(homeDirectory)
      ? normalizedPath.replace(homeDirectory + path.sep, `~${path.sep}`)
      : normalizedPath
  ).slice(0, -1);
}

export function renderPluralIfNeeded(itemsLength: number) {
  return `item${itemsLength > 1 ? "s" : ""}`;
}
