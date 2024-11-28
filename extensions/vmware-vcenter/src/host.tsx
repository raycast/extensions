import { vCenter } from "./api/vCenter";
import { GetServer, GetServerLocalStorage, GetSelectedServer } from "./api/function";
import { Host } from "./api/types";
import { HostPowerStateIcon } from "./api/ui";
import * as React from "react";
import {
  List,
  Toast,
  showToast,
  LocalStorage,
  Cache,
  Icon,
  ActionPanel,
  Action,
  getPreferenceValues,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import ServerView from "./api/ServerView";

const pref = getPreferenceValues();
if (!pref.certificate) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const cache = new Cache();

export default function Command(): JSX.Element {
  const { data: Server, revalidate: RevalidateServer, isLoading: IsLoadingServer } = usePromise(GetServer);
  const {
    data: ServerLocalStorage,
    revalidate: RevalidateServerLocalStorage,
    isLoading: IsLoadingServerLocalStorage,
  } = usePromise(GetServerLocalStorage);
  const {
    data: ServerSelected,
    revalidate: RevalidateServerSelected,
    isLoading: IsLoadingServerSelected,
  } = usePromise(GetSelectedServer);

  const [Hosts, SetHosts]: [Host[], React.Dispatch<React.SetStateAction<Host[]>>] = React.useState([] as Host[]);
  const [IsLoadingHosts, SetIsLoadingHosts]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);

  /**
   * Preload Hosts from cache and when api data is received replace data and save to cache.
   * @returns {Promise<void>}
   */
  async function GetHosts(): Promise<void> {
    if (Server && ServerSelected) {
      SetIsLoadingHosts(true);

      let cached: Host[] | undefined;
      const cachedj = cache.get(`host_${ServerSelected}_hosts`);
      if (cachedj) cached = JSON.parse(cachedj);
      if (Hosts.length === 0 && cached) SetHosts(cached);

      let s: Map<string, vCenter> = Server;
      if (ServerSelected !== "All") s = new Map([...s].filter(([k]) => k === ServerSelected));

      const hosts: Host[] = [];
      await Promise.all(
        [...s].map(async ([k, s]) => {
          const hostSummary = await s.ListHost().catch(async (err) => {
            await showToast({ style: Toast.Style.Failure, title: `${k} - Get Hosts:`, message: `${err}` });
          });
          if (hostSummary)
            hostSummary.forEach((h) => {
              hosts.push({
                server: k,
                summary: h,
              } as Host);
            });
        })
      );

      if (hosts.length > 0) {
        SetHosts(hosts);
        cache.set(`host_${ServerSelected}_hosts`, JSON.stringify(hosts));
      }

      SetIsLoadingHosts(false);
    }
  }

  /**
   * Change Selected Server and save state on LocalStorage.
   * @param {string} value - Server Name.
   */
  async function ChangeSelectedServer(value: string) {
    await LocalStorage.setItem("server_selected", value);
    RevalidateServerSelected();
  }

  /**
   * Delete Selected Server from LocalStorage.
   * @returns {Promise<void>}
   */
  async function DeleteSelectedServer(): Promise<void> {
    if (Server && [...Server.keys()].length > 1) {
      const OldServer = await GetServerLocalStorage();
      if (OldServer) {
        const NewServer = OldServer.filter((c) => {
          return c.name !== ServerSelected;
        });
        const NewServerSelected = NewServer[0].name;
        await LocalStorage.setItem("server", JSON.stringify(NewServer));
        await LocalStorage.setItem("server_selected", NewServerSelected);
      }
    } else if (Server) {
      await LocalStorage.removeItem("server");
      await LocalStorage.removeItem("server_selected");
    }
    RevalidateServer();
    RevalidateServerLocalStorage();
    RevalidateServerSelected();
  }

  /**
   * Search Bar Accessory.
   * @param {Map<string, vCenter>} server.
   * @returns {JSX.Element}
   */
  function GetSearchBar(server: Map<string, vCenter>): JSX.Element {
    const keys = [...server.keys()];
    if (keys.length > 1) keys.unshift("All");
    return (
      <List.Dropdown
        tooltip="Available Server"
        onChange={ChangeSelectedServer}
        defaultValue={ServerSelected ? ServerSelected : undefined}
      >
        {keys.map((s) => (
          <List.Dropdown.Item title={s} value={s} />
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
    if (ServerSelected === "All") a.push({ tag: host.server, icon: Icon.Building });
    return a;
  }

  /**
   * Host Action Menu.
   * @returns {JSX.Element}
   */
  function GetHostAction(): JSX.Element {
    return (
      <ActionPanel title="vCenter Host">
        {!IsLoadingHosts && (
          <Action title="Refresh" icon={Icon.Repeat} onAction={GetHosts} shortcut={{ modifiers: ["cmd"], key: "r" }} />
        )}
        <ActionPanel.Section title="vCenter Server">
          {!IsLoadingServerLocalStorage && (
            <Action
              title="Add Server"
              icon={Icon.NewDocument}
              onAction={() => {
                SetShowServerView(true);
              }}
            />
          )}
          {ServerSelected !== "All" &&
            !IsLoadingServerLocalStorage &&
            ServerLocalStorage &&
            !IsLoadingServerSelected &&
            ServerSelected && (
              <Action title="Edit Server" icon={Icon.Pencil} onAction={() => SetShowServerViewEdit(true)} />
            )}
          {ServerSelected !== "All" && (
            <Action title="Delete Server" icon={Icon.DeleteDocument} onAction={DeleteSelectedServer} />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  React.useEffect(() => {
    if (Server && !IsLoadingServer && ServerSelected && !IsLoadingServerSelected) {
      GetHosts();
    } else if (Server && !IsLoadingServer && !ServerSelected && !IsLoadingServerSelected) {
      const name = [...Server.keys()][0];
      LocalStorage.setItem("server_selected", name);
      RevalidateServerSelected();
    } else if (!IsLoadingServer && !Server) {
      SetShowServerView(true);
    }
  }, [Server, IsLoadingServer, ServerSelected, IsLoadingServerSelected]);

  const [ShowServerView, SetShowServerView] = React.useState(false);
  const [ShowServerViewEdit, SetShowServerViewEdit] = React.useState(false);

  React.useEffect(() => {
    if (!ShowServerView || !ShowServerViewEdit) {
      RevalidateServer();
      RevalidateServerLocalStorage();
      RevalidateServerSelected();
    }
  }, [ShowServerView, ShowServerViewEdit]);

  if (ShowServerView) return <ServerView SetShowView={SetShowServerView} Server={ServerLocalStorage} />;
  if (ShowServerViewEdit && ServerLocalStorage && ServerSelected)
    return (
      <ServerView SetShowView={SetShowServerViewEdit} Server={ServerLocalStorage} ServerSelected={ServerSelected} />
    );

  return (
    <List
      isLoading={IsLoadingServer || IsLoadingServerSelected || IsLoadingHosts}
      actions={GetHostAction()}
      searchBarAccessory={Server && GetSearchBar(Server)}
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
