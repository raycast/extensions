import { Color, Icon, LaunchType, MenuBarExtra, launchCommand, open, showHUD } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import {
  TimeEntry,
  continueInput,
  elapsedSeconds,
  formatDuration,
  getRunningEntries,
  listEntries,
  startTimer,
  stopEntry,
  timerUrl,
  timevoice,
} from "./api";

function RunningTimer() {
  // The running timer is fetched on its own because it can have started before the recent window.
  const {
    data: [entries, runningEntries],
    isLoading,
    error,
    mutate,
  } = useCachedPromise(() => Promise.all([listEntries(7), getRunningEntries()]), [], {
    initialData: [[], []],
    // Shown in the menu instead of the hook's default failure toast.
    onError: () => undefined,
  });
  const running = runningEntries[0];
  // The running entry is the newest, so deduplicating first also drops older entries of the work it continues.
  const recent = uniqueByWork(entries.filter((entry) => entry.description))
    .filter((entry) => entry.ended_at)
    .slice(0, 5);

  // mutate awaits the refetch in a menu bar command, so the title updates before Raycast unloads it.
  async function run(action: () => Promise<unknown>) {
    try {
      await mutate(action());
    } catch (error) {
      await showError("Timevoice action failed", error);
    }
  }

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: "icon.png" }}
      title={
        running ? `${formatDuration(elapsedSeconds(running), false)} ${running.description ?? ""}`.trim() : undefined
      }
      tooltip={
        running
          ? `Timevoice: ${running.description ?? "Timer running"}`
          : error
            ? "Timevoice: could not load"
            : "Timevoice: no timer running"
      }
    >
      {error && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            icon={{ source: Icon.Warning, tintColor: Color.Red }}
            title="Could not load Timevoice"
            subtitle={error.message}
          />
        </MenuBarExtra.Section>
      )}
      {running ? (
        <MenuBarExtra.Section title="Running">
          <MenuBarExtra.Item
            icon={{ source: Icon.CircleFilled, tintColor: running.project?.color ?? Color.Green }}
            title={running.description || "No description"}
            subtitle={running.project?.name}
          />
          <MenuBarExtra.Item icon={Icon.Stop} title="Stop Timer" onAction={() => run(() => stopEntry(running.id))} />
        </MenuBarExtra.Section>
      ) : (
        !error && (
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="No timer running" />
          </MenuBarExtra.Section>
        )
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Play}
          title="Start Timer…"
          onAction={async () => {
            try {
              await launchCommand({ name: "start-timer", type: LaunchType.UserInitiated });
            } catch (error) {
              await showError("Could not open Start Timer", error);
            }
          }}
        />
      </MenuBarExtra.Section>
      {recent.length > 0 && (
        <MenuBarExtra.Section title="Continue">
          {recent.map((entry) => (
            <MenuBarExtra.Item
              key={entry.id}
              icon={{ source: Icon.CircleFilled, tintColor: entry.project?.color ?? Color.SecondaryText }}
              title={entry.description ?? ""}
              subtitle={entry.project?.name}
              onAction={() => run(() => startTimer(continueInput(entry)))}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Globe} title="Open Timevoice" onAction={async () => open(await timerUrl())} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

// Menu bar commands run without a window, where toasts are unavailable, so errors go to a HUD.
function showError(title: string, error: unknown) {
  return showHUD(`${title}: ${error instanceof Error ? error.message : String(error)}`);
}

function uniqueByWork(entries: TimeEntry[]): TimeEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.description}\u0000${entry.project?.id ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default withAccessToken(timevoice)(RunningTimer);
