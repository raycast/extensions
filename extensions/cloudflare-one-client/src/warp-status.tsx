import {
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  List,
} from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  connect,
  disconnect,
  setMode,
  getStatus,
  WarpStatus,
  MODES,
  WarpMode,
} from "./warp";

export default function Command() {
  const [status, setStatusState] = useState<WarpStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      setStatusState(getStatus());
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refresh]);

  async function handleConnect() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Connecting…",
    });
    try {
      connect();
      toast.style = Toast.Style.Success;
      toast.title = "Connected";
      refresh();
    } catch (e: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Connection failed";
      toast.message = String(e);
    }
  }

  async function handleDisconnect() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Disconnecting…",
    });
    try {
      disconnect();
      toast.style = Toast.Style.Success;
      toast.title = "Disconnected";
      refresh();
    } catch (e: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Disconnect failed";
      toast.message = String(e);
    }
  }

  async function handleModeSwitch(mode: WarpMode, label: string) {
    const wasConnected = status?.connected ?? false;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Switching to ${label}…`,
    });
    try {
      setMode(mode);
      if (wasConnected) {
        toast.title = "Reconnecting…";
        connect();
      }
      toast.style = Toast.Style.Success;
      toast.title = `Mode → ${label}`;
      if (wasConnected) toast.message = "Reconnected";
      refresh();
    } catch (e: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to switch mode";
      toast.message = String(e);
    }
  }

  const connected = status?.connected ?? false;
  const modeRaw = status?.mode ?? "–";
  const modeLabel =
    MODES.find((m) => m.value.toLowerCase() === modeRaw.toLowerCase())?.label ??
    modeRaw;

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Cannot reach WARP"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Cloudflare WARP">
      {/* ── Connection ── */}
      <List.Item
        icon={{ source: "icon.png" }}
        title={connected ? "Connected" : "Disconnected"}
        accessories={[
          {
            tag: {
              value: connected ? "●" : "●",
              color: connected ? Color.Green : Color.Red,
            },
          },
        ]}
        actions={
          <ActionPanel>
            {connected ? (
              <Action
                title="Disconnect"
                icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                onAction={handleDisconnect}
              />
            ) : (
              <Action
                title="Connect"
                icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                onAction={handleConnect}
              />
            )}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={refresh}
            />
            {status?.raw && (
              <Action.CopyToClipboard
                title="Copy Diagnostics"
                content={status.raw}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
          </ActionPanel>
        }
      />

      {/* ── Mode ── */}
      <List.Item
        icon={{ source: Icon.Globe, tintColor: Color.Blue }}
        title={modeLabel}
        subtitle={modeRaw}
        accessories={[{ tag: { value: "Mode", color: Color.Blue } }]}
        actions={
          <ActionPanel>
            <ActionPanel.Submenu title="Switch Mode" icon={Icon.Switch}>
              {MODES.map((m) => {
                const isActive =
                  modeRaw.toLowerCase() === m.value.toLowerCase();
                return (
                  <Action
                    key={m.value}
                    title={m.label}
                    icon={
                      isActive
                        ? { source: Icon.CheckCircle, tintColor: Color.Green }
                        : {
                            source: Icon.Circle,
                            tintColor: Color.SecondaryText,
                          }
                    }
                    onAction={() => handleModeSwitch(m.value, m.label)}
                  />
                );
              })}
            </ActionPanel.Submenu>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={refresh}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
