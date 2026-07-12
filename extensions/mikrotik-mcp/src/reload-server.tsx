/**
 * Reload Server command — reload the MCP server from Raycast.
 *
 * "Reload config (live)" hits `POST /api/reload` and the server re-reads its
 * config from disk and applies it with zero downtime — a device added in the
 * dashboard (or edited in the config file) takes effect immediately. "Restart
 * process (hard)" exits the server so a supervisor (systemd/docker/pm2/the MCP
 * host) respawns it — a full restart that also re-registers tools and reloads
 * code; it drops the connection, so it's confirmed first.
 */
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import { postJson } from "./lib/api";
import { confirmDestructive, showFailureToast } from "./lib/confirm";

interface ReloadResult {
  ok?: boolean;
  mode?: string;
  count?: number;
  devices?: string[];
  note?: string;
  error?: string;
}

export default function Command() {
  async function reload(hard: boolean): Promise<void> {
    if (
      hard &&
      !(await confirmDestructive({
        title: "Restart the MCP server process?",
        message:
          "The server relaunches itself and rebinds the same port(s) in ~1.5s. The current connection drops briefly — reconnect after.",
        actionTitle: "Restart",
        icon: Icon.Power,
      }))
    ) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: hard ? "Restarting server…" : "Reloading config…",
    });
    try {
      const r = await postJson<ReloadResult>("/api/reload", { hard });
      if (r?.ok) {
        toast.style = Toast.Style.Success;
        toast.title = hard ? "Restart triggered" : "Config reloaded";
        toast.message = hard
          ? (r.note ?? "Reconnect shortly.")
          : `${r.count ?? "?"} device(s): ${(r.devices ?? []).join(", ")}`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Reload failed";
        toast.message = r?.error ?? "Unknown error";
      }
    } catch (e) {
      await showFailureToast(e, {
        title: "Reload failed (server unreachable)",
      });
    }
  }

  const md = [
    "# Reload MCP Server",
    "",
    "**Reload config (live)** — the server re-reads its configuration from disk and",
    "applies it immediately, with no downtime. Use this after adding or editing a",
    "device so it's picked up right away.",
    "",
    "**Restart process (hard)** — fully restarts the server process (re-registers",
    "tools, reloads code). It **relaunches itself** (no external supervisor needed)",
    "and rebinds in ~1.5s, dropping the connection briefly — so it confirms first.",
    "",
    "_Set the dashboard URL and token in this extension's preferences._",
  ].join("\n");

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action
            title="Reload Config (Live)"
            icon={Icon.ArrowClockwise}
            onAction={() => void reload(false)}
          />
          <Action
            title="Restart Process (Hard)"
            icon={Icon.Power}
            style={Action.Style.Destructive}
            onAction={() => void reload(true)}
          />
        </ActionPanel>
      }
    />
  );
}
