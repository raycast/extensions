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
import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { Tunnel, loadTunnels, removeTunnel } from "./lib/store";
import {
  Status,
  forwardSpec,
  getPid,
  getStatus,
  restartTunnel,
  startTunnel,
  stopTunnel,
  uptime,
} from "./lib/process";
import TunnelForm from "./tunnel-form";
import TunnelLogs from "./tunnel-logs";
import TunnelRowActions from "./tunnel-row-actions";

type Row = { tunnel: Tunnel; status: Status; uptime?: string; pid?: number };

export default function ManageTunnels() {
  const { push } = useNavigation();

  const { data, isLoading, revalidate } = usePromise(
    async (): Promise<Row[]> => {
      return loadTunnels().map((tunnel) => ({
        tunnel,
        status: getStatus(tunnel),
        uptime: uptime(tunnel),
        pid: getPid(tunnel),
      }));
    },
  );

  // Proses ssh berjalan di luar Raycast, jadi statusnya bisa berubah tanpa
  // sepengetahuan kita. Periksa ulang secara berkala selama daftar terbuka.
  useEffect(() => {
    const timer = setInterval(revalidate, 3000);
    return () => clearInterval(timer);
  }, [revalidate]);

  async function toggle(row: Row) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title:
        row.status === "running" ? "Menghentikan tunnel" : "Menjalankan tunnel",
    });
    try {
      if (row.status === "running") {
        await stopTunnel(row.tunnel);
        toast.style = Toast.Style.Success;
        toast.title = `${row.tunnel.name} berhenti`;
      } else {
        await startTunnel(row.tunnel);
        toast.style = Toast.Style.Success;
        toast.title = `${row.tunnel.name} berjalan`;
        toast.message = `localhost:${row.tunnel.localPort}`;
      }
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Tunnel gagal berjalan";
      toast.message = err instanceof Error ? err.message : String(err);
    }
    revalidate();
  }

  async function restart(row: Row) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Menjalankan ulang",
    });
    try {
      await restartTunnel(row.tunnel);
      toast.style = Toast.Style.Success;
      toast.title = `${row.tunnel.name} berjalan`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Tunnel gagal berjalan";
      toast.message = err instanceof Error ? err.message : String(err);
    }
    revalidate();
  }

  async function remove(row: Row) {
    const confirmed = await confirmAlert({
      title: `Hapus "${row.tunnel.name}"?`,
      message:
        row.status === "running"
          ? "Tunnel sedang berjalan dan akan dihentikan lebih dulu."
          : undefined,
      primaryAction: { title: "Hapus", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    if (row.status === "running") await stopTunnel(row.tunnel);
    removeTunnel(row.tunnel.id);
    await showToast({
      style: Toast.Style.Success,
      title: `${row.tunnel.name} dihapus`,
    });
    revalidate();
  }

  const newTunnelAction = (
    <Action
      title="Add Tunnel"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() => push(<TunnelForm onSave={revalidate} />)}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Cari tunnel">
      <List.EmptyView
        icon={Icon.Network}
        title="Belum ada tunnel"
        description="Tambahkan tunnel pertama untuk meneruskan port dari server ke mesin ini."
        actions={<ActionPanel>{newTunnelAction}</ActionPanel>}
      />

      {(data ?? []).map((row) => {
        const running = row.status === "running";
        return (
          <List.Item
            key={row.tunnel.id}
            icon={{
              source: running ? Icon.CircleFilled : Icon.Circle,
              tintColor: running ? Color.Green : Color.SecondaryText,
            }}
            title={row.tunnel.name}
            subtitle={`${forwardSpec(row.tunnel)} → ${row.tunnel.sshTarget}`}
            accessories={[
              row.tunnel.autoReconnect
                ? { tag: { value: "auto", color: Color.Purple } }
                : {},
              row.tunnel.compression
                ? { tag: { value: "compressed", color: Color.Blue } }
                : {},
              row.uptime
                ? { tag: { value: row.uptime, color: Color.Green } }
                : {},
              { text: running ? `PID ${row.pid}` : "berhenti" },
            ]}
            actions={
              <TunnelRowActions
                row={row}
                addTunnelAction={newTunnelAction}
                onToggle={() => toggle(row)}
                onRestart={() => restart(row)}
                onShowLogs={() => push(<TunnelLogs tunnel={row.tunnel} />)}
                onEdit={() =>
                  push(<TunnelForm tunnel={row.tunnel} onSave={revalidate} />)
                }
                onDelete={() => remove(row)}
              />
            }
          />
        );
      })}
    </List>
  );
}
