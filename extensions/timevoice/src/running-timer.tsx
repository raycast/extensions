import { Color, Icon, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { showFailureToast, useCachedPromise, withAccessToken } from "@raycast/utils";
import {
  TimeEntry,
  continueInput,
  elapsedSeconds,
  formatDuration,
  listEntries,
  startTimer,
  stopEntry,
  timerUrl,
  timevoice,
} from "./api";

function RunningTimer() {
  const { data: entries, isLoading, mutate } = useCachedPromise(() => listEntries(7), [], { initialData: [] });
  const running = entries.find((entry) => !entry.ended_at);
  // The running entry is the newest, so deduplicating first also drops older entries of the work it continues.
  const recent = uniqueByWork(entries.filter((entry) => entry.description))
    .filter((entry) => entry.ended_at)
    .slice(0, 5);

  // mutate awaits the refetch in a menu bar command, so the title updates before Raycast unloads it.
  async function run(action: () => Promise<unknown>) {
    try {
      await mutate(action());
    } catch (error) {
      await showFailureToast(error);
    }
  }

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: "icon.png" }}
      title={
        running ? `${formatDuration(elapsedSeconds(running), false)} ${running.description ?? ""}`.trim() : undefined
      }
      tooltip={running ? `Timevoice: ${running.description ?? "Timer running"}` : "Timevoice: no timer running"}
    >
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
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="No timer running" />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Play}
          title="Start Timer…"
          onAction={() => launchCommand({ name: "start-timer", type: LaunchType.UserInitiated })}
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
