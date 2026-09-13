import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import ConnectionForm from "./connection-form";
import { formatConnection, formatSshCommand } from "./lib/core";
import {
  getPid,
  getStatus,
  startTunnel,
  stopTunnel,
  uptime,
} from "./lib/process";
import {
  Connection,
  cloneConnection,
  loadConnections,
  removeConnection,
  saveConnection,
} from "./lib/store";

function displayConnections(): { active: Connection[]; recent: Connection[] } {
  const connections = loadConnections().sort(
    (a, b) => b.lastUsedAt - a.lastUsedAt,
  );
  const active = connections.filter(
    (connection) => getStatus(connection) === "running",
  );
  const activeIds = new Set(active.map((connection) => connection.id));
  return {
    active,
    recent: connections.filter((connection) => !activeIds.has(connection.id)),
  };
}

export default function QuickSshTunnel() {
  const { push } = useNavigation();
  const [connections, setConnections] = useState(displayConnections);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    setConnections(displayConnections());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh]);

  const newConnection = (
    <Action
      title="New Connection"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() =>
        push(
          <ConnectionForm
            prefillSshTarget={searchText.trim() || undefined}
            onConnected={refresh}
          />,
        )
      }
    />
  );

  async function connect(connection: Connection) {
    if (getStatus(connection) === "running") {
      await showToast({
        style: Toast.Style.Success,
        title: "Tunnel sudah aktif",
      });
      return;
    }
    const conflict = connections.active.find(
      (item) => item.port === connection.port,
    );
    if (conflict) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Port lokal sedang dipakai",
        message: conflict.sshTarget,
      });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Menghubungkan SSH",
    });
    try {
      await startTunnel(connection);
      saveConnection({ ...connection, lastUsedAt: Date.now() });
      toast.style = Toast.Style.Success;
      toast.title = "Tunnel aktif";
      toast.message = `localhost:${connection.port}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Tunnel gagal terhubung";
      toast.message = error instanceof Error ? error.message : String(error);
    }
    refresh();
  }

  async function stop(connection: Connection) {
    await stopTunnel(connection);
    await showToast({ style: Toast.Style.Success, title: "Tunnel dihentikan" });
    refresh();
  }

  async function remove(connection: Connection) {
    if (
      getStatus(connection) === "running" &&
      !(await confirmAlert({
        title: "Hentikan dan hapus tunnel?",
        primaryAction: { title: "Hapus", style: Alert.ActionStyle.Destructive },
      }))
    ) {
      return;
    }
    if (getStatus(connection) === "running") await stopTunnel(connection);
    removeConnection(connection.id);
    refresh();
  }

  function actions(connection: Connection, active: boolean) {
    return (
      <ActionPanel>
        <ActionPanel.Submenu title="Connection Actions" icon={Icon.List}>
          <Action
            title="Clone and Connect"
            icon={Icon.Duplicate}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() =>
              push(
                <ConnectionForm
                  initial={cloneConnection(connection)}
                  onConnected={refresh}
                />,
              )
            }
          />
          <Action
            title={active ? "Stop Tunnel" : "Connect"}
            icon={active ? Icon.Stop : Icon.Plug}
            shortcut={{ modifiers: [], key: "space" }}
            onAction={() => (active ? stop(connection) : connect(connection))}
          />
          {active && (
            <Action.CopyToClipboard
              title="Copy Local Address"
              content={`localhost:${connection.port}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Ssh Command"
            content={formatSshCommand(connection)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            title="Edit and Connect"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() =>
              push(
                <ConnectionForm initial={connection} onConnected={refresh} />,
              )
            }
          />
          <Action
            title="Delete History"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => remove(connection)}
          />
        </ActionPanel.Submenu>
        {newConnection}
      </ActionPanel>
    );
  }

  function renderItem(connection: Connection, active: boolean) {
    const running = active && getStatus(connection) === "running";
    return (
      <List.Item
        key={connection.id}
        icon={{
          source: running ? Icon.CircleFilled : Icon.Circle,
          tintColor: running ? Color.Green : Color.SecondaryText,
        }}
        title={formatConnection(connection)}
        accessories={[
          running
            ? {
                tag: {
                  value: uptime(connection) ?? "active",
                  color: Color.Green,
                },
              }
            : {},
          running ? { text: `PID ${getPid(connection)}` } : { text: "recent" },
          connection.mode === "socks5"
            ? { tag: { value: "SOCKS5", color: Color.Blue } }
            : {},
        ]}
        actions={actions(connection, running)}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering
      searchBarPlaceholder="Cari server atau remote host"
    >
      <List.EmptyView
        icon={Icon.Network}
        title="Belum ada koneksi"
        description={
          searchText.trim()
            ? `Buat koneksi baru untuk “${searchText.trim()}”. Tekan Enter untuk melanjutkan.`
            : "Buat koneksi SSH pertama tanpa menyimpan konfigurasi manual."
        }
        actions={<ActionPanel>{newConnection}</ActionPanel>}
      />
      {connections.active.length > 0 && (
        <List.Section
          title="Active Tunnels"
          subtitle={`${connections.active.length}`}
        >
          {connections.active.map((connection) => renderItem(connection, true))}
        </List.Section>
      )}
      {connections.recent.length > 0 && (
        <List.Section
          title="Recent Connections"
          subtitle={`${connections.recent.length}`}
        >
          {connections.recent.map((connection) =>
            renderItem(connection, false),
          )}
        </List.Section>
      )}
    </List>
  );
}
