import { vCenter } from "./api/vCenter";
import { GetServerNames, GetCachedHosts, GetServerConfig, RemoveServerConfig } from "./api/function";
import { Shortcut } from "./api/shortcut";
import { Host } from "./api/types";
import { HostPowerStateIcon } from "./api/ui";
import * as React from "react";
import { List, Toast, showToast, Cache, Icon, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
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

  const [Hosts, SetHosts]: [Host[], React.Dispatch<React.SetStateAction<Host[]>>] = React.useState([] as Host[]);
  const [IsLoadingHosts, SetIsLoadingHosts]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);

  /**
   * Preload Networks from cache and when api data is received replace data and save to cache.
   * @returns {Promise<void>}
   */
  async function LoadHosts(serverNames: string[], useCache = true): Promise<void> {
    SetIsLoadingHosts(true);

    const now = Date.now();

    /* Set Cache Expiration to 1h */
    const cacheExpiration = now + 60 * 60 * 1000;

    /* Set Server Names with Data Expired */
    let serverNamesCacheExpired = Array.of<string>();

    /* Load Data from Cache */
    const dataCache = Array.of<Host>();
    for (const serverName of serverNames) {
      const value = GetCachedHosts(serverName);
      if (value) {
        dataCache.push(...value);
        /* Validate Cache Expiration */
        const expiration = value.at(-1)?.cache_expiration;
        if (!expiration || now > expiration) serverNamesCacheExpired.push(serverName);
      } else {
        serverNamesCacheExpired.push(serverName);
      }
    }

    /* If useCache setHosts with Cached Data */
    if (useCache) {
      SetHosts(dataCache);
    } else {
      serverNamesCacheExpired = serverNames;
    }

    /* Load Data from API */
    let dataFresh = Array.of<Host>();
    const fetchData = async (server: string) => {
      const output = Array.of<Host>();

      /* Init vCenter Client */
      const serverConfig = await GetServerConfig(server);
      const client = new vCenter(serverConfig.server, serverConfig.username, serverConfig.password);

      /* Load Data */
      const data = await client.ListHost();
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
    let dataMerged = Array.of<Host>();
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

    /* SetHosts and Save to Cache */
    SetHosts(dataMerged);
    SetIsLoadingHosts(false);
    for (const server of serverNames) {
      cache.set(`host_${server}`, JSON.stringify(dataMerged.filter((value) => value.server === server)));
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
    if (useCache) SetHosts([]);

    /* Load Data */
    await LoadHosts(serverNames, useCache);
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
   * Search Bar Accessory
   * @param {Host} host.
   * @returns {List.Item.Accessory[]}
   */
  function GetHostAccessory(host: Host): List.Item.Accessory[] {
    const a: List.Item.Accessory[] = [];
    if (SelectedServerName.current === "All") a.push({ tag: host.server, icon: Icon.Building });
    return a;
  }

  /**
   * Host Action Menu.
   * @returns {JSX.Element}
   */
  function GetHostAction(): JSX.Element {
    return (
      <ActionPanel title="vCenter Host">
        {!IsLoadingHosts && !IsLoadingServerNames && (
          <React.Fragment>
            <Action
              title="Refresh"
              icon={Icon.Repeat}
              onAction={() => onChangeSelectedServerName(SelectedServerName.current, false)}
              shortcut={Shortcut.Refresh}
            />
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
          </React.Fragment>
        )}
      </ActionPanel>
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
      isLoading={IsLoadingServerNames || IsLoadingHosts}
      actions={GetHostAction()}
      searchBarAccessory={ServerNames && GetSearchBar(ServerNames)}
    >
      {Hosts.map((host) => (
        <List.Item
          key={`${host.server}_${host.summary.host}`}
          id={`${host.server}_${host.summary.host}`}
          title={host.summary.name}
          icon={HostPowerStateIcon.get(host.summary.power_state)}
          accessories={GetHostAccessory(host)}
          actions={GetHostAction()}
        />
      ))}
    </List>
  );
}
