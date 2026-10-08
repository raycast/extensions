import { ActionPanel, Action, Icon, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import plist from "plist";
import fs from "fs";
import { homedir } from "os";
import { useEffect, useState } from "react";
import expandTidle from "expand-tilde";
import { Connection, Group, enviromentIndex, tintColorsIndex, Preferences } from "./interfaces";

const preferences: Preferences = getPreferenceValues();
const directoryPath = preferences.path
  ? expandTidle(preferences.path)
  : `${homedir()}/Library/Containers/com.sequel-ace.sequel-ace/Data/Library/Application Support/Sequel Ace/Data`;

export default function DatabaseList() {
  const [state, setState] = useState<{ isLoading: boolean; grps?: Group[] }>({ isLoading: true });

  useEffect(() => {
    async function fetch() {
      const sequelAceLocation = `${directoryPath}/Favorites.plist`;

      if (!fs.existsSync(sequelAceLocation)) {
        showToast(
          Toast.Style.Failure,
          "Error loading connections",
          "Sequel Ace data directory not found, add directory path in preferences"
        );
        setState({ isLoading: false });
      } else {
        const _grps = readfavorites(sequelAceLocation);
        setState({ isLoading: false, grps: [..._grps] });
      }
    }

    fetch();
  }, []);

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Filter connections...">
      <List.EmptyView icon={{ source: "no-view.png" }} title="No databases found in Sequel Ace, go add one!" />
      {state &&
        state.grps?.map((item) => {
          const subtitle = `${item.connections.length}` + ` item${item.connections.length !== 1 ? "s" : ""}`;
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

type ObjType = {
  [key: string]: ReadonlyArray<plist.PlistObject>;
};

function readfavorites(sequelAceLocation: string): any[] {
  const connectionsList = plist.parse(fs.readFileSync(sequelAceLocation, "utf8")) as ReadonlyArray<plist.PlistObject>;

  const root = connectionsList["Favorites Root" as any];
  const cnns = getfavorites(root["Children"] as ReadonlyArray<plist.PlistObject>, "No Group");
  return cnns;
}

function getfavorites(favorites: ReadonlyArray<plist.PlistObject>, grpName: string, grps: Group[] = []): any[] {
  const grp: Group = {
    id: grps.length.toString(),
    name: grpName,
    connections: [],
  };
  grps.push(grp);
  for (const favorite of favorites) {
    if ("Children" in favorite) {
      grps.concat(getfavorites(favorite.Children as ReadonlyArray<plist.PlistObject>, favorite.Name as string, grps));
    } else {
      const conn: Connection = {
        id:
          favorite.id?.toString() ?? favorite.name.toString() + favorite.host.toString() + favorite.database.toString(),
        colorIndex: favorite.colorIndex as number,
        name: favorite.name.toString(),
        database: favorite.database.toString(),
        databaseHost: favorite.host.toString(),
      };
      grp.connections.push(conn);
    }
  }
  return grps;
}

function ConnectionListItem(props: { connection: Connection; groupName: string }) {
  const connection = props.connection;
  const groupName = props.groupName;
  const accessories = [];
  if (connection.colorIndex in tintColorsIndex && connection.colorIndex in enviromentIndex) {
    accessories.push({
      tag: {
        color: tintColorsIndex[connection.colorIndex],
        value: enviromentIndex[connection.colorIndex],
      },
    });
  }
  return (
    <List.Item
      id={connection.id}
      key={connection.id}
      title={connection.name}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Database"
            icon={Icon.Coin}
            url={`sequelace://LaunchFavorite?name=${encodeURIComponent(connection.name)}`}
          />
        </ActionPanel>
      }
      keywords={preferences.searchByGroupName ? [groupName] : []}
    />
  );
}
