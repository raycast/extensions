import {
  Color,
  environment,
  Icon,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  open,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { timer, stopTimer } from "./lib/api";
import {
  isSignedIn,
  menuState,
  origin,
  read,
  type Snapshot,
} from "./lib/store";
import { duration, elapsed } from "./lib/domain";
import { launch, message, notifyError } from "./lib/actions";
import type { Timer } from "./lib/types";

// The command re-renders every minute so elapsed time stays current. While a
// timer runs it asks ttrackii again once the snapshot is this old (12 requests
// an hour at most), so a timer stopped elsewhere disappears. While idle it asks
// only when the menu is opened; timers started in Raycast update the snapshot.
const BACKGROUND_MAX_AGE = 5 * 60_000;
const OPENED_MAX_AGE = 60_000;
// The Mac app's template glyph, as a vector so it stays sharp at any scale.
const icon = { source: "menu-bar.svg", tintColor: Color.PrimaryText };

export default function MenuBar() {
  // Raycast shows the menu from the first render, so start from the
  // synchronous cache; load() then confirms it against the token store.
  const [cached] = useState(() => menuState<Timer>());
  const [data, setData] = useState<Snapshot<Timer> | undefined>(cached.timer);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(cached.signedIn);
  const busy = useRef(false);
  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      if (!(await isSignedIn())) {
        setSignedIn(false);
        setData(undefined);
        return;
      }
      setSignedIn(true);
      const saved = await read<Snapshot<Timer>>("timer");
      setData(saved);
      const opened = environment.launchType === LaunchType.UserInitiated;
      const maxAge = opened ? OPENED_MAX_AGE : BACKGROUND_MAX_AGE;
      const stale = !saved || Date.now() - saved.savedAt > maxAge;
      const watching = opened || !saved || saved.data.running;
      if (force || (stale && watching)) {
        // Background refreshes leave the last few requests of the hourly quota to timer actions.
        await timer(!opened && !force);
        setData(await read<Snapshot<Timer>>("timer"));
      }
      setError("");
    } catch (error) {
      // A 401 clears credentials; make sure the old account's timer disappears with them.
      if (!(await isSignedIn().catch(() => false))) {
        setSignedIn(false);
        setData(undefined);
      }
      setError(message(error));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load(false);
  }, [load]);

  async function stop() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      await stopTimer();
      setData(await read<Snapshot<Timer>>("timer"));
      setError("");
    } catch (error) {
      if (!(await isSignedIn().catch(() => false))) {
        setSignedIn(false);
        setData(undefined);
      }
      setError(message(error));
      await notifyError("Couldn't stop timer", error);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  const current = data?.data;
  const running = current?.running ? current : undefined;
  const task =
    running?.entry?.taskName.replace(/\s+/g, " ").trim() || "Untitled";
  const details = [
    running?.entry?.projectName,
    ...(running?.entry?.tagNames ?? [running?.entry?.tagName]),
    running?.entry?.workspaceId !== "personal"
      ? running?.entry?.workspaceName
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <MenuBarExtra
      icon={icon}
      title={running ? duration(elapsed(running)) : undefined}
      isLoading={loading}
      tooltip={
        running ? `${task}${error ? " · couldn't refresh" : ""}` : "ttrackii"
      }
    >
      {!signedIn ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Connect ttrackii…"
            icon={Icon.Link}
            onAction={() => launch("recent-entries")}
          />
        </MenuBarExtra.Section>
      ) : (
        <>
          <MenuBarExtra.Section>
            {running ? (
              <>
                <MenuBarExtra.Item
                  title={task.length > 48 ? `${task.slice(0, 47)}…` : task}
                  subtitle={duration(elapsed(running))}
                  icon={{ source: Icon.Play, tintColor: Color.Green }}
                  tooltip={details || undefined}
                  onAction={() => launch("recent-entries")}
                />
                {details && <MenuBarExtra.Item title={details} />}
                <MenuBarExtra.Item
                  title="Stop Timer"
                  icon={Icon.Stop}
                  onAction={stop}
                />
                <MenuBarExtra.Item
                  title="Edit Timer…"
                  icon={Icon.Pencil}
                  onAction={() => launch("timer", { edit: true })}
                />
              </>
            ) : (
              <MenuBarExtra.Item title="No timer running" icon={Icon.Clock} />
            )}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title={running ? "Switch Timer…" : "Start Timer…"}
              icon={Icon.Play}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() => launch("timer")}
            />
            <MenuBarExtra.Item
              title="Recent Entries"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() => launch("recent-entries")}
            />
            <MenuBarExtra.Item
              title="Reports"
              icon={Icon.BarChart}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => launch("reports")}
            />
          </MenuBarExtra.Section>
        </>
      )}
      <MenuBarExtra.Section>
        {error && (
          <MenuBarExtra.Item
            title="Couldn't refresh"
            subtitle={error}
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          />
        )}
        {signedIn && (
          <MenuBarExtra.Item
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => load(true)}
          />
        )}
        <MenuBarExtra.Item
          title="Open ttrackii"
          icon={Icon.Globe}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => open(origin())}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
