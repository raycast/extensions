import {
  Clipboard,
  Color,
  Icon,
  Image,
  LaunchType,
  LocalStorage,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  showHUD,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { holdHUD, notificationsEnabled } from "./lib/hud";
import { markSeen, poll, type Notice, type SessionActivity } from "./lib/activity";
import type { Status } from "./lib/block-state";
import { HIDDEN_KEY } from "./lib/menu-bar-visibility";
import { openRex, showSession } from "./lib/rex";

const NOTICE_SECONDS = 6;

const open = async (s: SessionActivity) => {
  try {
    await showSession(s.session_id);
    await markSeen(s.session_id);
  } catch {
    // Remote Control off or no client connected: at least bring Rex to the front.
    await openRex().catch(() => undefined);
  }
};

const copy = async (text: string) => {
  await Clipboard.copy(text);
  await showHUD("Copied");
};

const since = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (Number.isNaN(m)) return "unknown";
  return m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.floor(m / 1440)} d`;
};

const STATUS: Record<Status, { icon: Image.ImageLike; label: string }> = {
  blocked: { icon: { source: Icon.ExclamationMark, tintColor: Color.Orange }, label: "Needs your input" },
  failed: { icon: { source: Icon.XMarkCircle, tintColor: Color.Red }, label: "Failed" },
  working: { icon: { source: Icon.CircleProgress, tintColor: Color.Blue }, label: "Working" },
  finished: { icon: { source: Icon.CheckCircle, tintColor: Color.Green }, label: "Finished" },
  idle: { icon: Icon.Circle, label: "Idle" },
};

const noticeText = (n: Notice) =>
  n.event === "blocked"
    ? `${n.label} needs your input${n.kind ? ` (${n.kind})` : ""}`
    : n.event === "failed"
      ? `${n.label} failed`
      : `${n.label} finished`;

export default function Command() {
  const { data, isLoading } = usePromise(async () => {
    const res = await poll();
    // The menu bar always updates; the message only shows when notifications are on.
    if (res.notices.length && notificationsEnabled(getPreferenceValues<Preferences.MenuBar>())) {
      await holdHUD(showHUD, `Rex: ${res.notices.map(noticeText).join(" · ")}`, NOTICE_SECONDS);
    }
    return res;
  });
  const { data: storedHidden, isLoading: loadingHidden } = usePromise(
    async () => (await LocalStorage.getItem<string>(HIDDEN_KEY)) === "1",
  );
  const [hidden, setHidden] = useState(false);

  // No icon in the menu bar: the command renders nothing while hidden.
  if (hidden || (!loadingHidden && storedHidden)) return null;

  const sessions = data?.sessions ?? [];
  const server = data?.server;
  const count = (st: Status) => sessions.filter((s) => s.status === st).length;
  // The most urgent thing wins the title: needs input, then failed, then how many are working, then finished.
  const title = count("blocked")
    ? "!"
    : count("failed")
      ? "✕"
      : count("working")
        ? String(count("working"))
        : count("finished")
          ? "✓"
          : undefined;

  return (
    <MenuBarExtra
      icon="menu-bar-icon.png"
      title={title}
      isLoading={isLoading || loadingHidden}
      tooltip="Rex session activity"
    >
      <MenuBarExtra.Submenu
        title={server ? "Rex Server · Running" : isLoading ? "Rex Server" : "Rex Server · Stopped"}
        icon={{ source: Icon.CircleFilled, tintColor: server ? Color.Green : Color.Red }}
      >
        {server && (
          <>
            <MenuBarExtra.Item
              title="Version"
              subtitle={server.version}
              icon={Icon.CopyClipboard}
              onAction={() => copy(server.version)}
            />
            <MenuBarExtra.Item title="Uptime" subtitle={since(server.startedAt)} />
            <MenuBarExtra.Item title="Process" subtitle={String(server.pid)} />
            {server.tailscale && (
              <MenuBarExtra.Item
                title="Tailscale"
                subtitle={server.tailscale}
                icon={Icon.CopyClipboard}
                onAction={() => copy(server.tailscale as string)}
              />
            )}
          </>
        )}
        <MenuBarExtra.Item title="Open Rex" icon={Icon.AppWindow} onAction={() => openRex().catch(() => undefined)} />
      </MenuBarExtra.Submenu>

      {sessions.length > 0 && (
        <MenuBarExtra.Section title={`Sessions (${sessions.length})`}>
          {sessions.map((s) => (
            <MenuBarExtra.Submenu key={s.session_id} title={s.label} icon={STATUS[s.status].icon}>
              <MenuBarExtra.Item title={STATUS[s.status].label} subtitle={s.detail.slice(0, 80)} icon={Icon.Terminal} />
              <MenuBarExtra.Item title="Show in Rex" icon={Icon.ArrowRight} onAction={() => open(s)} />
              <MenuBarExtra.Item
                title="Peek at Screen"
                icon={Icon.Eye}
                onAction={() =>
                  launchCommand({
                    name: "peek",
                    type: LaunchType.UserInitiated,
                    context: { session: s.session_id, label: s.label },
                  })
                }
              />
              <MenuBarExtra.Section title="Tabs">
                {s.windows.map((w) => (
                  <MenuBarExtra.Item
                    key={w.label}
                    title={w.label}
                    subtitle={`${w.panes} ${w.panes === 1 ? "pane" : "panes"}${w.active ? " · active" : ""}`}
                    icon={w.active ? Icon.CircleFilled : Icon.Circle}
                    onAction={() => open(s)}
                  />
                ))}
              </MenuBarExtra.Section>
              <MenuBarExtra.Item title="Copy ID" icon={Icon.CopyClipboard} onAction={() => copy(s.session_id)} />
            </MenuBarExtra.Submenu>
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Remove from Menu Bar"
          onAction={async () => {
            await LocalStorage.setItem(HIDDEN_KEY, "1");
            setHidden(true);
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
