import { vCenter } from "./api/vCenter";
import { GetServer, GetServerLocalStorage, GetSelectedServer } from "./api/function";
import { Datastore } from "./api/types";
import * as React from "react";
import {
  ActionPanel,
  Action,
  Icon,
  List,
  Toast,
  showToast,
  LocalStorage,
  Cache,
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
  async function GetDatastores(): Promise<void> {
    if (Server && ServerSelected) {
      SetIsLoadingDatastores(true);

      let cached: Datastore[] | undefined;
      const cachedj = cache.get(`datastore_${ServerSelected}_hosts`);
      if (cachedj) cached = JSON.parse(cachedj);
      if (Datastores.length === 0 && cached) SetDatastores(cached);

      let s: Map<string, vCenter> = Server;
      if (ServerSelected !== "All") s = new Map([...s].filter(([k]) => k === ServerSelected));

      const datastores: Datastore[] = [];
      await Promise.all(
        [...s].map(async ([k, s]) => {
          const datastoreSummary = await s.ListDatastore().catch(async (err) => {
            await showToast({ style: Toast.Style.Failure, title: `${k} - Get Datastores:`, message: `${err}` });
          });
          if (datastoreSummary)
            datastoreSummary.forEach((d) => {
              datastores.push({
                server: k,
                summary: d,
              } as Datastore);
            });
        })
      );

      if (datastores.length > 0) {
        SetDatastores(datastores);
        cache.set(`datastore_${ServerSelected}_hosts`, JSON.stringify(datastores));
      }

      SetIsLoadingDatastores(false);
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
   * Search Bar Accessory
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
   * Accessory List.
   * @param {Datastore} datastore.
   * @returns {List.Item.Accessory[]}
   */
  function GetDatastoreAccessory(datastore: Datastore): List.Item.Accessory[] {
    const a: List.Item.Accessory[] = [];
    if (ServerSelected === "All") a.push({ tag: datastore.server, icon: Icon.Building });
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
        />
        {!IsLoadingDatastores && (
          <Action
            title="Refresh"
            icon={Icon.Repeat}
            onAction={GetDatastores}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
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

  React.useEffect(() => {
    if (Server && !IsLoadingServer && ServerSelected && !IsLoadingServerSelected) {
      GetDatastores();
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
      isLoading={IsLoadingServer || IsLoadingServerSelected || IsLoadingDatastores}
      isShowingDetail={showDetail}
      actions={GetDatastoreAction()}
      searchBarAccessory={Server && GetSearchBar(Server)}
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
