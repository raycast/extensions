import { Action, ActionPanel, closeMainWindow, Color, Icon, List, showToast, confirmAlert } from "@raycast/api";
import { MutableRefObject, useEffect, useState } from "react";
import { useSshPidList } from "../hooks/pidList";
import { cache, useCache } from "../hooks/store";
import { useTunelCmd, useKillTunnelCmd } from "../hooks/tunnelCmd";
import { ListData, Storage, Values } from "../types";

export function ListScreen(props: {
  shouldEstablish: MutableRefObject<boolean>;
  defaultTunnelParams: Partial<Values>;
  toCreate: () => void;
  markUsed: () => void;
}) {
  const { toCreate, defaultTunnelParams, shouldEstablish, markUsed } = props;
  const { cachedList, alivePidSet } = useCache();
  const [listData, setListData] = useState<ListData[]>(cachedList ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { setTunnelParams, isLoading } = useTunelCmd(
    listData,
    setListData,
    alivePidSet,
    defaultTunnelParams,
    shouldEstablish
  );

  const { killTunnel, setPidToKill } = useKillTunnelCmd();

  const { refreshList } = useSshPidList();

  const tunnelTrigger = () => {
    const tunnelItem = listData.find((i) => i.name === selectedId);
    if (!tunnelItem?.pid) {
      setTunnelParams((params) => {
        const res = { ...params, ...tunnelItem } as Partial<ListData>;
        delete res.pid;
        return res as Values;
      });
      showToast({ title: "Tunnel established" });
    } else {
      setPidToKill(tunnelItem.pid);
      alivePidSet.delete(tunnelItem.pid);
      cache.set(Storage.AlivePidList, JSON.stringify(Array.from(alivePidSet)));
      tunnelItem.pid = null;
      setListData([...listData]);
      showToast({ title: "Tunnel Closed" });
    }
  };

  const deleteTunnel = () => {
    confirmAlert({
      title: "Confirm",
      message: "Tunnel will be deleted, are you sure?",
      primaryAction: {
        title: "Delete",
        onAction: () => {
          const itemToDelete = listData.find((i) => i.name === selectedId);
          const newListData = listData.filter((i) => i.name !== selectedId);
          setListData(newListData);
          if (itemToDelete?.pid) {
            setPidToKill(itemToDelete.pid);
            alivePidSet.delete(itemToDelete.pid);
            cache.set(Storage.AlivePidList, JSON.stringify(Array.from(alivePidSet)));
            killTunnel();
          }
          markUsed();
          setTunnelParams({});
          showToast({ title: "Tunnel deleted" });
        },
      },
    });
  };

  const generateListData = () => {
    listData.forEach((data) => {
      if (data.pid && !alivePidSet.has(data.pid)) data.pid = null;
    });
    if (shouldEstablish.current === false && !listData.find((i) => i.name === defaultTunnelParams.name)) {
      listData.push({ ...(defaultTunnelParams as Values), pid: null });
    } else if (shouldEstablish.current === true && !listData.find((i) => i.name === defaultTunnelParams.name)) {
      if (defaultTunnelParams.name) {
        listData.push({ ...(defaultTunnelParams as Values), pid: null });
        setTunnelParams({ ...defaultTunnelParams });
      }
    }
    cache.set(Storage.List, JSON.stringify(listData));
  };

  generateListData();

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={listData.length !== 0}
      searchBarPlaceholder={"Search Tunnels"}
      onSelectionChange={(id) => {
        setSelectedId(id);
      }}
      actions={
        <ActionPanel>
          <Action
            title="Create Tunnel"
            onAction={toCreate}
            shortcut={{
              modifiers: ["cmd"],
              key: "n",
            }}
          />
          <Action
            onAction={refreshList}
            title="Refresh List"
            shortcut={{
              modifiers: ["shift", "cmd"],
              key: "r",
            }}
          />
        </ActionPanel>
      }
    >
      {listData.length === 0 ? (
        <List.EmptyView title="No Tunnels Found" description="Press ⌘+n to create a tunnel"></List.EmptyView>
      ) : (
        listData.map((i) => {
          return (
            <List.Item
              title={i.name}
              key={i.name}
              id={i.name}
              icon={{
                source: i.pid ? Icon.CheckCircle : Icon.XMarkCircle,
                tintColor: i.pid ? Color.Green : Color.Red,
              }}
              actions={
                <ActionPanel>
                  <Action title="Connect/Disconnect" onAction={tunnelTrigger} />
                  <Action
                    title="Connect/Disconnect and Exit"
                    onAction={() => {
                      tunnelTrigger();
                      closeMainWindow();
                    }}
                  />
                  <Action
                    title="Create Tunnel"
                    onAction={toCreate}
                    shortcut={{
                      modifiers: ["cmd"],
                      key: "n",
                    }}
                  />
                  <Action
                    onAction={refreshList}
                    title="Refresh List"
                    shortcut={{
                      modifiers: ["shift", "cmd"],
                      key: "r",
                    }}
                  />
                  <Action
                    onAction={deleteTunnel}
                    title="Delete Tunnel"
                    style={Action.Style.Destructive}
                    shortcut={{
                      modifiers: ["cmd"],
                      key: "d",
                    }}
                  />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Pid" text={{ value: i.pid ?? "" }} />
                      <List.Item.Detail.Metadata.Label title="Local Port" text={{ value: i.localPort ?? "" }} />
                      <List.Item.Detail.Metadata.Label title="Username" text={{ value: i.user ?? "" }} />
                      <List.Item.Detail.Metadata.Label title="SSH Host" text={{ value: i.sshHost || "22" }} />
                      <List.Item.Detail.Metadata.Label title="SSH Port" text={{ value: i.sshPort ?? "" }} />
                      <List.Item.Detail.Metadata.Label
                        title="Target Host"
                        text={{ value: i.remoteHost || "localhost" }}
                      />
                      <List.Item.Detail.Metadata.Label title="Target Port" text={{ value: i.remotePort ?? "" }} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Type" text={{ value: i.type ?? "" }} />
                      {i.identityFile && i.identityFile.length ? (
                        <List.Item.Detail.Metadata.Label
                          title="Identity File"
                          text={{ value: i.identityFile[0] ? i.identityFile[0] : "" }}
                        />
                      ) : undefined}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          );
        })
      )}
    </List>
  );
}
