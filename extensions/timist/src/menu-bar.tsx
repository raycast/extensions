import { Icon, launchCommand, LaunchType, MenuBarExtra, open, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { ApiError, getToday } from "./api/client";
import {
  ensureCacheOwner,
  MenuBarError,
  MenuBarSnapshot,
  readMenuBarError,
  readMenuBarSnapshot,
  writeMenuBarError,
  writeMenuBarSnapshot,
} from "./lib/cache";
import {
  elapsedContextSeconds,
  elapsedTimerSeconds,
  formatCompactDuration,
  formatRemaining,
  remainingSeconds,
  truncate,
} from "./lib/format";

interface MenuBarState {
  snapshot?: MenuBarSnapshot;
  error?: MenuBarError;
}

function readState(): MenuBarState {
  return {
    snapshot: readMenuBarSnapshot(),
    error: readMenuBarError(),
  };
}

// One tick: fetch /today, rewrite the Cache snapshot. On failure keep the
// previous snapshot and set an error flag.
async function refreshTick(): Promise<void> {
  try {
    const today = await getToday();
    writeMenuBarSnapshot(today);
    writeMenuBarError(undefined);
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      writeMenuBarError("network");
    } else if (error instanceof ApiError && error.status === 401) {
      writeMenuBarError("auth");
    } else {
      writeMenuBarError("network");
    }
  }
}

// Read-only for now: Stop Timer, Stop Context, and Start Recent Context were
// removed pending a fix for their action handlers (see menu bar debugging).
export default function MenuBar() {
  ensureCacheOwner();
  const [state, setState] = useState<MenuBarState>(() => readState());
  const { isLoading } = usePromise(async () => {
    await refreshTick();
    setState(readState());
  }, []);

  const now = Date.now();
  const today = state.snapshot?.today;
  const runningTimer = today?.timers.find((timer) => timer.active);
  const runningContext = today?.active_context ?? undefined;

  let title: string | undefined;
  if (state.error === "auth") {
    title = "🔑";
  } else if (state.error === "network") {
    title = "⚠";
  } else if (runningTimer) {
    title = `▶ ${truncate(runningTimer.title, 20)} · ${formatCompactDuration(elapsedTimerSeconds(runningTimer, now))}`;
  } else if (runningContext) {
    title = `◉ ${truncate(runningContext.display_label, 20)} · ${formatCompactDuration(elapsedContextSeconds(runningContext, now))}`;
  }

  return (
    <MenuBarExtra icon="extension-icon.png" title={title} tooltip="Timist" isLoading={isLoading}>
      {state.error === "auth" ? (
        <MenuBarExtra.Item title="Set API Key…" icon={Icon.Key} onAction={() => void openExtensionPreferences()} />
      ) : (
        <>
          {runningTimer && (
            <MenuBarExtra.Section title="Timer">
              <MenuBarExtra.Item
                title={(() => {
                  const elapsed = `${runningTimer.title} · ${formatCompactDuration(elapsedTimerSeconds(runningTimer, now))}`;
                  const remaining = remainingSeconds(runningTimer, now);
                  return remaining === undefined ? elapsed : `${elapsed} · ${formatRemaining(remaining)}`;
                })()}
              />
            </MenuBarExtra.Section>
          )}
          {runningContext && (
            <MenuBarExtra.Section title="Context">
              <MenuBarExtra.Item
                title={`${runningContext.display_label} · ${formatCompactDuration(elapsedContextSeconds(runningContext, now))}`}
              />
            </MenuBarExtra.Section>
          )}
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Start Timer…"
              icon={Icon.Play}
              onAction={() => void launchCommand({ name: "start-timer", type: LaunchType.UserInitiated })}
            />
            <MenuBarExtra.Item
              title="Show Status"
              icon={Icon.List}
              onAction={() => void launchCommand({ name: "show-status", type: LaunchType.UserInitiated })}
            />
            <MenuBarExtra.Item
              title="Open Timist"
              icon={Icon.Globe}
              onAction={() => void open("https://timist.app/app")}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
