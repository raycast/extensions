import { Icon, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand, showHUD, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { BRAND_ACCENT } from "./lib/brand";
import { elapsedSeconds, formatClock, formatDuration, formatTime } from "./lib/format";
import { openFolnaro, showError, withFolnaro } from "./lib/raycast";
import { byId, describeEntry } from "./lib/timer";
import type { TimeEntry } from "./lib/types";
import { t } from "./lib/text";

interface TimerState {
  entry: TimeEntry | null;
  name?: string;
}

/**
 * One short helper process per refresh (the manifest interval is 1 minute, Raycast's minimum).
 * The time shown is computed from `started_at`, so it is right without polling more often; the
 * project name is only looked up while a timer runs.
 */
async function loadState(): Promise<TimerState> {
  return withFolnaro(async (api) => {
    const entry = await api.runningTimer();
    if (!entry) return { entry: null };
    const name = await Promise.all([api.projects(), api.customers({ limit: 500 })])
      .then(([projects, customers]) => describeEntry(entry, { projects: byId(projects), customers: byId(customers) }))
      .catch(() => undefined);
    return { entry, name };
  });
}

export default function RunningTimer() {
  const { hideWhenIdle } = getPreferenceValues<Preferences.RunningTimer>();
  // The cached value draws the menu bar at once; the fresh one replaces it when it arrives.
  const { data, isLoading, error, mutate } = useCachedPromise(loadState, [], {
    keepPreviousData: true,
    // Background refreshes never show toasts; the menu itself says when Folnaro is unreachable.
    onError: () => undefined,
  });

  const entry = data?.entry ?? null;
  const unavailable = Boolean(error) && !data;
  if (!entry && hideWhenIdle && !isLoading && !unavailable) return null;

  const elapsed = entry ? elapsedSeconds(entry) : 0;
  const title = entry ? formatClock(elapsed) : undefined;
  const icon = entry ? { source: Icon.Stopwatch, tintColor: BRAND_ACCENT } : Icon.Stopwatch;

  const stop = async () => {
    try {
      const stopped = await withFolnaro((api) => api.stopTimer());
      await mutate(Promise.resolve({ entry: null }), { optimisticUpdate: () => ({ entry: null }) });
      await showHUD(t("timer.stopped", { duration: formatDuration(stopped.duration_seconds) }));
    } catch (failure) {
      await showError(failure);
    }
  };

  return (
    <MenuBarExtra
      icon={icon}
      title={title}
      tooltip={entry ? (data?.name ?? t("timer.startedPlain")) : t("menu.noTimer")}
      isLoading={isLoading}
    >
      {entry ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={data?.name ?? t("timer.withoutProject")}
            subtitle={entry.note || entry.activity || undefined}
            icon={Icon.Stopwatch}
            onAction={() => openFolnaro(`folnaro://time/${encodeURIComponent(entry.id)}`)}
          />
          <MenuBarExtra.Item
            title={
              entry.started_at
                ? t("timer.runningSince", { time: formatTime(entry.started_at) })
                : t("timer.elapsed", { duration: formatDuration(elapsed) })
            }
          />
          <MenuBarExtra.Item
            title={t("menu.stop")}
            icon={Icon.Stop}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={stop}
          />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={unavailable ? t("menu.unavailable") : t("menu.noTimer")} />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={t("menu.start")}
          icon={Icon.Play}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() =>
            launchCommand({ name: "start-timer", type: LaunchType.UserInitiated }).catch((failure) =>
              showError(failure),
            )
          }
        />
        <MenuBarExtra.Item
          title={t("menu.openFolnaro")}
          icon={Icon.AppWindow}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => openFolnaro()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
