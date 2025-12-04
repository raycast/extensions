import fs from "fs";
import { Connection, Group } from "./interfaces";
import { Keyboard, Toast, showToast } from "@raycast/api";
import plist from "plist";
import path from "node:path";
import { EmptyGroupID, directoryPath, homeDirectory, plistVersionPath } from "./constants";

export async function fetchDatabases() {
  const tablePlusLocation = `${directoryPath}/Connections.plist`;
  const groupLocations = `${directoryPath}/ConnectionGroups.plist`;

  if (!fs.existsSync(tablePlusLocation)) {
    showToast(
      Toast.Style.Failure,
      "Error loading connections",
      "TablePlus data directory not found, add directory path in preferences",
    );
    return { isLoading: false };
  } else {
    const connectionsList = plist.parse(fs.readFileSync(tablePlusLocation, "utf8")) as ReadonlyArray<plist.PlistObject>;
    const groupList = plist.parse(fs.readFileSync(groupLocations, "utf8")) as ReadonlyArray<plist.PlistObject>;
    const plistInformation = plist.parse(fs.readFileSync(plistVersionPath, "utf8")) as Readonly<plist.PlistObject>;

    const groups = new Map<string, Group>();
    const parentGroups = new Map<string, string>();

    groupList.forEach((group) => {
      const groupId = group.ID.toString();
      const groupName = group.Name.toString();
      const parentGroupId = group.GroupID?.toString() || "";

      groups.set(groupId, {
        id: groupId,
        name: groupName,
        connections: [],
      });

      if (parentGroupId) {
        parentGroups.set(groupId, parentGroupId);
      }
    });

    parentGroups.forEach((parentGroupId, groupId) => {
      const parentGroup = groups.get(parentGroupId);
      if (parentGroup) {
        const group = groups.get(groupId);
        if (group) {
          group.name = `${parentGroup.name} - ${group.name}`;
        }
      }
    });

    groups.set(EmptyGroupID, {
      id: EmptyGroupID,
      name: "Ungrouped",
      connections: [],
    });

    connectionsList.forEach((connection) => {
      const groupId = connection.GroupID?.toString() !== "" ? connection.GroupID?.toString() : EmptyGroupID;
      let groupIcon = "icon.png";
      if (groupId) {
        if (fs.existsSync(`${directoryPath}/${groupId}`)) {
          groupIcon = `${directoryPath}/${groupId}`;
        }
      }

      let subtitle = (
        connection.isOverSSH ? "SSH" : connection.isSocket ? "SOCKET" : connection.DatabaseHost
      ) as string;
      if (connection.database && connection.Driver !== "SQLite") {
        subtitle += ` : ${connection.database}`;
      } else if (connection.Driver === "SQLite" && connection.isOverSSH) {
        subtitle += ` : ${connection.DatabaseHost}`;
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
        subtitle: tildify(subtitle),
        version: Number(plistInformation.CFBundleVersion),
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

export function uppercaseText(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function getShortcut(index: number) {
  const key = index + 1;

  let shortcut: Keyboard.Shortcut | undefined;
  if (key >= 1 && key <= 9) {
    shortcut = {
      modifiers: ["cmd"],
      key: String(key) as Keyboard.KeyEquivalent,
    };
  }

  return shortcut;
}
