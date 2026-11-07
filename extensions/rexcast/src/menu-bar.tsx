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
import { holdHUD, noticeSeconds, notificationsEnabled } from "./lib/hud";
import { poll, type Notice, type SessionActivity } from "./lib/activity";
import type { Status } from "./lib/block-state";
import { HIDDEN_KEY } from "./lib/menu-bar-visibility";
import { openSession } from "./lib/open-session";
import { openRex } from "./lib/rex";

// A menu bar action that fails says so, instead of doing nothing.
const report = (e: unknown, title: string) => showHUD(`${title}: ${e instanceof Error ? e.message : String(e)}`);

const open = (s: SessionActivity) =>
  openSession(s.session_id).catch((e) => report(e, "Could not show the session (is Remote Control on in Rex?)"));

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
  // The menu data is published as soon as it is read; the notice is held afterwards, in its own step.
  const { data, isLoading } = usePromise(() => poll());
  const noticeKey = data?.notices.length ? JSON.stringify(data.notices) : "";
  const { isLoading: showingNotice } = usePromise(
    async (key: string) => {
      const prefs = getPreferenceValues<Preferences.MenuBar>();
      if (!notificationsEnabled(prefs)) return; // the menu bar always updates; only the message is optional
      const notices = JSON.parse(key) as Notice[];
      await holdHUD(showHUD, `Rex: ${notices.map(noticeText).join(" · ")}`, noticeSeconds(prefs));
    },
    [noticeKey],
    { execute: noticeKey !== "" },
  );
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
      isLoading={isLoading || loadingHidden || showingNotice}
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
        <MenuBarExtra.Item
          title="Open Rex"
          icon={Icon.AppWindow}
          onAction={() => openRex().catch((e) => report(e, "Could not open Rex"))}
        />
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
                onAction={async () => {
                  try {
                    await launchCommand({
                      name: "peek",
                      type: LaunchType.UserInitiated,
                      context: { session: s.session_id, label: s.label },
                    });
                  } catch (e) {
                    await report(e, "Could not open Peek at Session (is the command enabled?)");
                  }
                }}
              />
              <MenuBarExtra.Section title="Tabs">
                {s.windows.map((w) => (
                  <MenuBarExtra.Item
                    key={w.window_id}
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
