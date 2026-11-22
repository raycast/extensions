import { Icon, MenuBarExtra, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { formatMinutes, type State, type Status, type StatusKind } from "./lib/engine";
import { loadState, runTick, saveState, showOverlay } from "./lib/runtime";

const ICONS: Record<StatusKind, Icon> = {
  paused: Icon.Pause,
  call: Icon.Phone,
  away: Icon.Moon,
  focus: Icon.Bolt,
  scattered: Icon.Shuffle,
  comms: Icon.Message,
  browse: Icon.Globe,
  leisure: Icon.Mug,
  active: Icon.Circle,
};

export default function WorkStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    runTick()
      .then((r) => {
        setStatus(r.status);
        setState(r.state);
      })
      .catch((error) => {
        console.error(error);
        setStatus({ kind: "active", title: "", detail: "Could not read your activity", next: String(error) });
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function pause(minutes: number | "tomorrow") {
    const s = await loadState();
    if (minutes === "tomorrow") {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(7, 0, 0, 0);
      s.pausedUntil = d.getTime();
    } else {
      s.pausedUntil = Date.now() + minutes * 60_000;
    }
    await saveState(s);
  }

  async function resume() {
    const s = await loadState();
    s.pausedUntil = null;
    await saveState(s);
  }

  const kind = status?.kind ?? "active";
  const done = state?.cues.filter((c) => c.outcome === "done").length ?? 0;
  const skipped = state?.cues.filter((c) => c.outcome === "skipped").length ?? 0;
  const m = state?.minutes;

  return (
    <MenuBarExtra icon={ICONS[kind]} title={status?.title} tooltip={status?.detail} isLoading={isLoading}>
      <MenuBarExtra.Section title="Now">
        <MenuBarExtra.Item icon={ICONS[kind]} title={status?.detail ?? "Reading your activity…"} />
        <MenuBarExtra.Item icon={Icon.Clock} title={status?.next ?? ""} />
      </MenuBarExtra.Section>
      {m && (
        <MenuBarExtra.Section title="Today">
          <MenuBarExtra.Item icon={Icon.Bolt} title={`Deep work ${formatMinutes(m.focus)}`} />
          <MenuBarExtra.Item icon={Icon.Phone} title={`Calls ${formatMinutes(m.meeting)}`} />
          <MenuBarExtra.Item icon={Icon.Message} title={`Messaging ${formatMinutes(m.comms)}`} />
          <MenuBarExtra.Item icon={Icon.Globe} title={`Browsing ${formatMinutes(m.browse)}`} />
          <MenuBarExtra.Item
            icon={Icon.Heartbeat}
            title={`Breaths ${done} taken${skipped ? `, ${skipped} skipped` : ""}`}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Heartbeat}
          title="Breathe Now"
          shortcut={{ modifiers: ["cmd"], key: "b" }}
          onAction={async () => showOverlay("manual", state ?? (await loadState()))}
        />
        {state?.pausedUntil ? (
          <MenuBarExtra.Item icon={Icon.Play} title="Resume Cues" onAction={resume} />
        ) : (
          <>
            <MenuBarExtra.Item icon={Icon.Pause} title="Pause for 1 Hour" onAction={() => pause(60)} />
            <MenuBarExtra.Item icon={Icon.Moon} title="Pause Until Tomorrow" onAction={() => pause("tomorrow")} />
          </>
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.QuestionMarkCircle}
          title="How Breath Cue Decides"
          onAction={() => open("https://github.com/raycast/extensions/tree/main/extensions/breath-cue#how-it-decides")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
