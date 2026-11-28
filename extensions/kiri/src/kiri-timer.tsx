import {
  Color,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { playableSounds } from "./lib/account";
import { KIRI_SITE, PROGRESS_URL } from "./lib/api";
import {
  defaultFocusMinutes,
  pause,
  pausedForCall,
  resume,
  startBreak,
  startFocus,
  stopTimer,
  tick,
} from "./lib/engine";
import { dayKey } from "./lib/queue";
import {
  type Connection,
  getConnection,
  getHistory,
  getLastSound,
  getPendingBreak,
  getPendingConnect,
  getTimer,
  setPendingBreak,
} from "./lib/storage";
import {
  formatClock,
  formatMinutes,
  formatShort,
  type PendingBreak,
  remainingMs,
  type RunningTimer,
} from "./lib/timer";

/** Open another command from the menu bar. It can throw (e.g. the command is disabled); toasts don't work here. */
async function openCommand(name: string, title: string, context?: Record<string, unknown>): Promise<void> {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated, context });
  } catch {
    await showHUD(`Could not open ${title}`);
  }
}

interface Snapshot {
  timer: RunningTimer | null;
  pendingBreak: PendingBreak | null;
  connection: Connection | null;
  connecting: boolean;
  today: { blocks: number; minutes: number };
  lastSound: string;
  callPaused: boolean;
}

async function load(): Promise<Snapshot> {
  await tick();
  const now = Date.now();
  const [timer, pendingBreak, connection, pendingConnect, history, lastSound] = await Promise.all([
    getTimer(),
    getPendingBreak(now),
    getConnection(),
    getPendingConnect(),
    getHistory(),
    getLastSound(),
  ]);
  const todayKey = dayKey(now);
  const todays = history.filter((h) => dayKey(h.endedAt) === todayKey);
  return {
    timer,
    pendingBreak,
    connection,
    connecting: pendingConnect !== null && pendingConnect.expiresAt > now,
    today: { blocks: todays.length, minutes: todays.reduce((s, h) => s + h.minutes, 0) },
    lastSound,
    callPaused: await pausedForCall(timer),
  };
}

const QUICK = [25, 50, 90];

export default function Command() {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    load()
      .then(setSnap)
      .catch(() =>
        setSnap({
          timer: null,
          pendingBreak: null,
          connection: null,
          connecting: false,
          today: { blocks: 0, minutes: 0 },
          lastSound: "",
          callPaused: false,
        }),
      );
  }, []);

  const now = Date.now();
  const t = snap?.timer ?? null;
  const left = t ? remainingMs(t, now) : 0;

  let title: string | undefined;
  let tooltip = "Kiri Timer";
  if (t) {
    title = t.pausedAt !== null ? `${formatShort(left)} ‖` : formatShort(left);
    tooltip = `${t.phase === "focus" ? "Focus block" : "Break"}: ${formatClock(left)} left`;
  }
  const icon = t?.phase === "break" ? { source: Icon.Mug } : { source: Icon.Leaf };

  // Quick starts reuse the last sound when this account can still play it.
  const sounds = playableSounds(snap?.connection?.me ?? null);
  const quickSound = snap && sounds.some((s) => s.key === snap.lastSound) ? snap.lastSound : "";
  const soundLabel = (key: string) => sounds.find((s) => s.key === key)?.label ?? key;

  const quickStart = async (minutes: number) => {
    try {
      await startFocus(minutes, "", quickSound);
      await showHUD(`Focus block started · ${formatMinutes(minutes)}`);
    } catch {
      await showHUD(`Focus block started without sound · ${formatMinutes(minutes)}`);
    }
  };

  return (
    <MenuBarExtra isLoading={snap === null} icon={icon} title={title} tooltip={tooltip}>
      {t && (
        <MenuBarExtra.Section title={t.phase === "focus" ? "Focus Block" : "Break"}>
          <MenuBarExtra.Item
            title={`${formatClock(left)} left${t.pausedAt !== null ? (snap?.callPaused ? " · paused for a call" : " · paused") : ""}`}
            subtitle={`of ${formatMinutes(t.minutes)}`}
            icon={Icon.Clock}
          />
          {t.task && <MenuBarExtra.Item title={t.task} icon={Icon.Pencil} />}
          {t.sound && <MenuBarExtra.Item title={soundLabel(t.sound)} icon={Icon.SpeakerOn} />}
          {t.pausedAt === null ? (
            <MenuBarExtra.Item title="Pause" icon={Icon.Pause} onAction={pause} />
          ) : (
            <MenuBarExtra.Item title="Resume" icon={Icon.Play} onAction={resume} />
          )}
          <MenuBarExtra.Item
            title={t.phase === "focus" ? "Stop Block" : "Skip Break"}
            icon={{ source: Icon.Stop, tintColor: Color.Red }}
            onAction={async () => {
              await stopTimer();
              await showHUD(t.phase === "focus" ? "Block stopped. It was not saved." : "Break skipped");
            }}
          />
        </MenuBarExtra.Section>
      )}

      {!t && snap?.pendingBreak && (
        <MenuBarExtra.Section title="Block Done">
          <MenuBarExtra.Item
            title={`Start ${formatMinutes(snap.pendingBreak.minutes)} Break`}
            icon={Icon.Mug}
            onAction={async () => {
              await startBreak(snap.pendingBreak?.minutes ?? 5);
            }}
          />
          <MenuBarExtra.Item
            title="Skip Break"
            icon={Icon.Forward}
            onAction={async () => {
              await setPendingBreak(null);
            }}
          />
        </MenuBarExtra.Section>
      )}

      {!t && snap && (
        <MenuBarExtra.Section title="Start">
          {[...new Set([defaultFocusMinutes(), ...QUICK])]
            .sort((a, b) => a - b)
            .map((m) => (
              <MenuBarExtra.Item
                key={m}
                title={`${formatMinutes(m)} Focus Block`}
                subtitle={quickSound ? soundLabel(quickSound) : undefined}
                icon={Icon.Play}
                onAction={() => quickStart(m)}
              />
            ))}
          <MenuBarExtra.Item
            title="Start Focus Block…"
            icon={Icon.Pencil}
            onAction={() => openCommand("start-focus-block", "Start Focus Block")}
          />
        </MenuBarExtra.Section>
      )}

      {snap && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={`Today: ${snap.today.blocks} ${snap.today.blocks === 1 ? "block" : "blocks"}`}
            subtitle={snap.today.minutes ? formatMinutes(snap.today.minutes) : undefined}
            icon={Icon.BarChart}
            onAction={() => openCommand("focus-history", "Focus History")}
          />
          {snap.connection ? (
            <MenuBarExtra.Item
              title="Open Kiri Progress"
              subtitle={snap.connection.account.name || undefined}
              icon={Icon.Globe}
              onAction={() => open(PROGRESS_URL)}
            />
          ) : (
            <MenuBarExtra.Item
              title={snap.connecting ? "Connecting to Kiri…" : "Connect Kiri Account…"}
              icon={Icon.Link}
              onAction={() => openCommand("focus-history", "Focus History", { connect: true })}
            />
          )}
          {!snap.connection && (
            <MenuBarExtra.Item title="Open Kiri Website" icon={Icon.Globe} onAction={() => open(KIRI_SITE)} />
          )}
          <MenuBarExtra.Item title="Preferences…" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
