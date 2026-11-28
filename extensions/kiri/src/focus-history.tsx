import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  type LaunchProps,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import ConnectView from "./components/ConnectView";
import { disconnect, flush, refreshMe } from "./lib/account";
import { formatKiris, PRICING_URL, PROGRESS_URL } from "./lib/api";
import { startFocus, tick } from "./lib/engine";
import { dayKey, groupByDay, type HistoryEntry } from "./lib/queue";
import { type Connection, getHistory, setHistory } from "./lib/storage";
import { formatMinutes } from "./lib/timer";

interface Data {
  connection: Connection | null;
  history: HistoryEntry[];
}

const PLAN_LABEL: Record<string, string> = { free: "Free", trial: "Trial", paid: "Lifetime" };

function dayTitle(key: string): string {
  const now = Date.now();
  if (key === dayKey(now)) return "Today";
  if (key === dayKey(now - 24 * 60 * 60 * 1000)) return "Yesterday";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function timeOf(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function Command(props: LaunchProps<{ launchContext?: { connect?: boolean } }>) {
  const [data, setData] = useState<Data | null>(null);

  const reload = useCallback(async (forceMe = false) => {
    await tick();
    const connection = await refreshMe(forceMe);
    setData({ connection, history: await getHistory() });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (props.launchContext?.connect) return <ConnectView onConnected={() => reload(true)} />;

  const connection = data?.connection ?? null;
  const queued = data?.history.filter((h) => h.kiri === "queued").length ?? 0;
  const groups = groupByDay(data?.history ?? []);

  const accountItem = connection ? (
    <List.Item
      title={connection.account.name || "Kiri account"}
      subtitle={connection.account.emailHint}
      icon={{ source: Icon.PersonCircle, tintColor: Color.Green }}
      accessories={[
        ...(connection.me?.kirisTotal != null ? [{ text: formatKiris(connection.me.kirisTotal) }] : []),
        ...(connection.me?.plan ? [{ tag: PLAN_LABEL[connection.me.plan] ?? connection.me.plan }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Kiri Progress" url={PROGRESS_URL} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => reload(true)}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          {connection.me?.plan !== "paid" && <Action.OpenInBrowser title="See Kiri Lifetime" url={PRICING_URL} />}
          <Action
            title="Disconnect Kiri Account"
            icon={Icon.Logout}
            style={Action.Style.Destructive}
            onAction={async () => {
              const ok = await confirmAlert({
                title: "Disconnect Kiri account?",
                message:
                  "Blocks you finish in Raycast will stay on this Mac only. Blocks waiting to be saved are dropped.",
                primaryAction: { title: "Disconnect", style: Alert.ActionStyle.Destructive },
              });
              if (!ok) return;
              await disconnect();
              await showToast({ style: Toast.Style.Success, title: "Disconnected" });
              await reload();
            }}
          />
        </ActionPanel>
      }
    />
  ) : (
    <List.Item
      title="Connect Kiri Account"
      subtitle="Save blocks to your Kiri history and play more sounds"
      icon={Icon.Link}
      actions={
        <ActionPanel>
          <Action.Push
            title="Connect Kiri Account"
            icon={Icon.Link}
            target={<ConnectView onConnected={() => reload(true)} />}
          />
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={data === null} searchBarPlaceholder="Search blocks by task">
      {data && (
        <List.Section title="Kiri Account">
          {accountItem}
          {connection && queued > 0 && (
            <List.Item
              title={`${queued} ${queued === 1 ? "block" : "blocks"} waiting to be saved`}
              icon={{ source: Icon.Upload, tintColor: Color.Orange }}
              actions={
                <ActionPanel>
                  <Action
                    title="Save Now"
                    icon={Icon.Upload}
                    onAction={async () => {
                      const r = await flush();
                      await showToast({
                        style: r.sentIds.length ? Toast.Style.Success : Toast.Style.Failure,
                        title: r.sentIds.length ? "Saved to Kiri" : "Kiri could not be reached",
                      });
                      await reload();
                    }}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}
      {data && groups.length === 0 && (
        <List.Section title="Blocks">
          <List.Item
            title="No blocks yet"
            subtitle="Finished focus blocks show up here"
            icon={Icon.Leaf}
            actions={
              <ActionPanel>
                <Action
                  title="Start 25 Min Focus Block"
                  icon={Icon.Play}
                  onAction={async () => {
                    await startFocus(25, "", "");
                    await showHUD("Focus block started · 25 min");
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {groups.map((g) => (
        <List.Section
          key={g.day}
          title={dayTitle(g.day)}
          subtitle={`${g.entries.length} ${g.entries.length === 1 ? "block" : "blocks"} · ${formatMinutes(g.minutes)}`}
        >
          {g.entries.map((h) => (
            <List.Item
              key={h.id}
              title={h.task || "Focus block"}
              subtitle={formatMinutes(h.minutes)}
              icon={Icon.Leaf}
              keywords={h.task ? h.task.split(" ") : []}
              accessories={[
                ...(h.kiri === "saved" ? [{ icon: Icon.CheckCircle, tooltip: "Saved to your Kiri history" }] : []),
                ...(h.kiri === "queued" ? [{ icon: Icon.Clock, tooltip: "Waiting to be saved to Kiri" }] : []),
                { text: timeOf(h.endedAt) },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Start Again"
                    icon={Icon.Play}
                    onAction={async () => {
                      try {
                        await startFocus(h.minutes, h.task, h.sound);
                        await showHUD(`Focus block started · ${formatMinutes(h.minutes)}`);
                      } catch (err) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "The block started without sound",
                          message: err instanceof Error ? err.message : undefined,
                        });
                      }
                    }}
                  />
                  {h.task && <Action.CopyToClipboard title="Copy Task" content={h.task} />}
                  {connection && <Action.OpenInBrowser title="Open Kiri Progress" url={PROGRESS_URL} />}
                  <Action
                    title="Remove from This Mac"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      await setHistory((await getHistory()).filter((x) => x.id !== h.id));
                      await reload();
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
