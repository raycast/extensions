import { vCenter } from "./api/vCenter";
import { GetCachedDatastores, GetServerConfig, GetServerNames, RemoveServerConfig } from "./api/function";
import { Shortcut } from "./api/shortcut";
import { Datastore } from "./api/types";
import * as React from "react";
import { ActionPanel, Action, Icon, List, Toast, showToast, Cache, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import ServerView from "./api/ServerView";

const pref = getPreferenceValues();
if (!pref.certificate) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const cache = new Cache();

export default function Command(): JSX.Element {
  const {
    data: ServerNames,
    revalidate: RevalidateServerNames,
    isLoading: IsLoadingServerNames,
  } = usePromise(GetServerNames);
  const SelectedServerName = React.useRef<string>("");

  const [Datastores, SetDatastores]: [Datastore[], React.Dispatch<React.SetStateAction<Datastore[]>>] = React.useState(
    [] as Datastore[]
  );
  const [IsLoadingDatastores, SetIsLoadingDatastores]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);
  const [showDetail, setShowDetail]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);

  /**
   * Preload Datastores from cache and when api data is received replace data and save to cache.
   * @returns {Promise<void>}
   */
  async function LoadDatastores(serverNames: string[], useCache = true): Promise<void> {
    SetIsLoadingDatastores(true);

    const now = Date.now();

    /* Set Cache Expiration to 1h */
    const cacheExpiration = now + 60 * 60 * 1000;

    /* Set Server Names with Data Expired */
    let serverNamesCacheExpired = Array.of<string>();

    /* Load Data from Cache */
    const dataCache = Array.of<Datastore>();
    for (const serverName of serverNames) {
      const value = GetCachedDatastores(serverName);
      if (value) {
        dataCache.push(...value);
        /* Validate Cache Expiration */
        const expiration = value.at(-1)?.cache_expiration;
        if (!expiration || now > expiration) serverNamesCacheExpired.push(serverName);
      } else {
        serverNamesCacheExpired.push(serverName);
      }
    }

    /* If useCache SetDatastores with Cached Data */
    if (useCache) {
      SetDatastores(dataCache);
    } else {
      serverNamesCacheExpired = serverNames;
    }

    /* Load Data from API */
    let dataFresh = Array.of<Datastore>();
    const fetchData = async (server: string) => {
      const output = Array.of<Datastore>();

      /* Init vCenter Client */
      const serverConfig = await GetServerConfig(server);
      const client = new vCenter(serverConfig.server, serverConfig.username, serverConfig.password);

      /* Load Data */
      const data = await client.ListDatastore();
      if (data)
        for (const value of data) {
          output.push({ server: server, summary: value, cache_expiration: cacheExpiration });
        }

      return output;
    };
    const promises = await Promise.allSettled(serverNamesCacheExpired.map((name) => fetchData(name)));
    for (const [index, resp] of promises.entries()) {
      if (resp.status === "fulfilled") {
        dataFresh = [...dataFresh, ...resp.value];
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: `Server '${serverNamesCacheExpired[index]}'`,
          message: resp.reason,
        });
      }
    }

    /* Merge Cache and Fresh Data */
    let dataMerged = Array.of<Datastore>();
    for (const server of serverNames) {
      if (serverNamesCacheExpired.findIndex((value) => value === server) !== -1) {
        const data = dataFresh.filter((value) => value.server === server);
        if (data.length > 0) {
          dataMerged = [...dataMerged, ...data];
          continue;
        }
      }
      dataMerged = [...dataMerged, ...dataCache.filter((value) => value.server === server)];
    }

    /* SetNetworks and Save to Cache */
    SetDatastores(dataMerged);
    SetIsLoadingDatastores(false);
    for (const server of serverNames) {
      cache.set(`datastore_${server}`, JSON.stringify(dataMerged.filter((value) => value.server === server)));
    }
  }

  /**
   * Function to call when selected server name change on searchBarAccessory.
   * @param {string} server - Server Name.
   * @returns {Promise<void>}
   */
  async function onChangeSelectedServerName(server?: string, useCache = true): Promise<void> {
    if (!ServerNames || !server) return;

    /* Exit if Selected Item is unchanged and Update useRef Object */
    if (useCache && SelectedServerName.current === server) return;
    SelectedServerName.current = server;

    /* Set serverNames */
    let serverNames = Array.of<string>();
    if (server === "All") {
      serverNames = ServerNames.filter((value) => value !== "All");
    } else {
      serverNames.push(server);
    }

    /* Clear Data */
    if (useCache) SetDatastores([]);

    /* Load Data */
    await LoadDatastores(serverNames, useCache);
  }

  /**
   * Delete Selected Server from LocalStorage.
   * @returns {Promise<void>}
   */
  async function DeleteSelectedServer(): Promise<void> {
    if (!SelectedServerName.current) return;
    try {
      await RemoveServerConfig(SelectedServerName.current);
      RevalidateServerNames();
    } catch (error) {
      if (error instanceof Error)
        await showToast({
          style: Toast.Style.Failure,
          title: `Error on deleting server '${SelectedServerName.current}'`,
          message: error.message,
        });
      console.error(error);
    }
  }

  /**
   * Search Bar Accessory
   */
  function GetSearchBar(server: string[]): JSX.Element {
    return (
      <List.Dropdown storeValue={true} tooltip="VMware Server" onChange={onChangeSelectedServerName}>
        {server.map((value) => (
          <List.Dropdown.Item title={value} value={value} />
        ))}
      </List.Dropdown>
    );
  }

  /**
   * Accessory List.
   * @param {Datastore} datastore.
   * @returns {List.Item.Accessory[]}
   */
  function GetDatastoreAccessory(datastore: Datastore): List.Item.Accessory[] {
    const a: List.Item.Accessory[] = [];
    if (SelectedServerName.current === "All") a.push({ tag: datastore.server, icon: Icon.Building });
    return a;
  }

  /**
   * Datastore Action Menu.
   * @returns {JSX.Element}
   */
  function GetDatastoreAction(): JSX.Element {
    return (
      <ActionPanel title="vCenter Datastore">
        <Action
          title={showDetail ? "Hide Detail" : "Show Detail"}
          icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
          onAction={() => {
            setShowDetail((prevState) => !prevState);
          }}
          shortcut={Shortcut.ToggleQuickLook}
        />
        {!IsLoadingDatastores && (
          <Action
            title="Refresh"
            icon={Icon.Repeat}
            onAction={() => onChangeSelectedServerName(SelectedServerName.current, false)}
            shortcut={Shortcut.Refresh}
          />
        )}
        {!IsLoadingServerNames && !IsLoadingDatastores && (
          <ActionPanel.Section title="vCenter Server">
            <Action
              title="Add Server"
              icon={Icon.NewDocument}
              onAction={() => {
                SetShowServerView(true);
              }}
            />
            <Action title="Edit Server" icon={Icon.Pencil} onAction={() => SetShowServerViewEdit(true)} />
            <Action title="Delete Server" icon={Icon.DeleteDocument} onAction={DeleteSelectedServer} />
          </ActionPanel.Section>
        )}
      </ActionPanel>
    );
  }

  /**
   * Datastore Detail Section.
   * @param {Datastore} datastore.
   * @returns {JSX.Element}
   */
  function GetDatastoreDetail(datastore?: Datastore): JSX.Element {
    const capacity_tier: Map<string, number> = new Map([
      ["KB", 1e-3],
      ["MB", 1e-6],
      ["GB", 1e-9],
      ["TB", 1e-12],
    ]);
    let capacity = "Unknown";
    let free_space = "Unknown";

    capacity_tier.forEach((value, key) => {
      if (capacity === "Unknown") {
        const s = Number(datastore ? datastore.summary.capacity : 0) * value;
        if (s < 1000 && s > 1) {
          capacity = `${s.toFixed(2)} ${key}`;
        }
      }
      if (free_space === "Unknown") {
        const s = Number(datastore ? datastore.summary.free_space : 0) * value;
        if (s < 1000 && s > 1) {
          free_space = `${s.toFixed(2)} ${key}`;
        }
      }
    });

    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Name" text={datastore ? datastore.summary.name : ""} />
            <List.Item.Detail.Metadata.Label title="Type" text={datastore ? datastore.summary.type : ""} />
            <List.Item.Detail.Metadata.Label title="Capacity" text={capacity} />
            <List.Item.Detail.Metadata.Label title="Free Space" text={free_space} />
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  const [ShowServerView, SetShowServerView] = React.useState(false);
  const [ShowServerViewEdit, SetShowServerViewEdit] = React.useState(false);

  if (ShowServerView)
    return <ServerView SetShowView={SetShowServerView} RevalidateServerNames={RevalidateServerNames} />;
  if (ShowServerViewEdit)
    return <ServerView SetShowView={SetShowServerViewEdit} ServerSelected={SelectedServerName.current} />;

  return (
    <List
      isLoading={IsLoadingServerNames || IsLoadingDatastores}
      isShowingDetail={showDetail}
      actions={GetDatastoreAction()}
      searchBarAccessory={ServerNames && GetSearchBar(ServerNames)}
    >
      {Datastores.map((datastore) => (
        <List.Item
          key={`${datastore.server}_${datastore.summary.datastore}`}
          id={`${datastore.server}_${datastore.summary.datastore}`}
          title={datastore.summary.name}
          icon={{ source: "icons/datastore/datastore.svg" }}
          accessories={GetDatastoreAccessory(datastore)}
          detail={GetDatastoreDetail(datastore)}
          actions={GetDatastoreAction()}
        />
      ))}
    </List>
  );
}
