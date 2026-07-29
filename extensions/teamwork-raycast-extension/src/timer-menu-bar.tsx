import {
  Icon,
  MenuBarExtra,
  launchCommand,
  LaunchType,
  showHUD,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  completeTimer,
  formatElapsed,
  getTimerState,
  pauseTimer,
  resumeTimer,
  taskUrl,
} from "./teamwork";
import type { TeamworkTimer } from "./types";

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(getTimerState, []);

  const timer = data?.running;
  const paused = data?.paused ?? [];
  const selected = timer ?? paused[0];
  const remaining = timer ? paused : paused.slice(1);

  async function update(action: () => Promise<void>, success: string) {
    try {
      await action();
      await showHUD(success);
      await revalidate();
    } catch (error) {
      await showHUD(
        `Timer action failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return (
    <MenuBarExtra
      icon={Icon.Clock}
      title={selected ? formatElapsed(selected) : undefined}
      isLoading={isLoading}
      tooltip={
        selected
          ? (selected.taskName ?? selected.description)
          : "No Teamwork timer running"
      }
    >
      {selected ? (
        <>
          <MenuBarExtra.Item
            title={
              selected.taskName ?? selected.description ?? "Teamwork timer"
            }
          />
          <MenuBarExtra.Separator />
          {selected.running ? (
            <MenuBarExtra.Item
              title="Pause Timer"
              icon={Icon.Pause}
              onAction={() =>
                update(
                  () => pauseTimer(selected.id),
                  `Paused: ${selected.taskName ?? "Teamwork timer"}`,
                )
              }
            />
          ) : (
            <MenuBarExtra.Item
              title="Resume Timer"
              icon={Icon.Play}
              onAction={() =>
                update(
                  () => resumeTimer(selected.id),
                  `Resumed: ${selected.taskName ?? "Teamwork timer"}`,
                )
              }
            />
          )}
          <MenuBarExtra.Item
            title="Stop and Log Timer"
            icon={Icon.Stop}
            onAction={() =>
              update(
                () => completeTimer(selected),
                `Logged ${formatElapsed(selected)}: ${selected.taskName ?? "Teamwork timer"}`,
              )
            }
          />
          {selected.taskId ? (
            <MenuBarExtra.Item
              title="Open Task"
              icon={Icon.Globe}
              onAction={() => openUrl(taskUrl(selected.taskId))}
            />
          ) : null}
          <MenuBarExtra.Separator />
        </>
      ) : null}
      <MenuBarExtra.Item
        title="Search Tasks"
        icon={Icon.MagnifyingGlass}
        onAction={() =>
          launchCommand({
            name: "search-tasks",
            type: LaunchType.UserInitiated,
          })
        }
      />
      {remaining.length > 0 ? (
        <>
          <MenuBarExtra.Separator />
          {remaining.map((t: TeamworkTimer) => (
            <MenuBarExtra.Item
              key={t.id}
              title={t.taskName ?? t.description ?? "Teamwork timer"}
              subtitle={formatElapsed(t)}
              icon={Icon.Pause}
              onAction={() =>
                update(
                  () => resumeTimer(t.id),
                  `Resumed: ${t.taskName ?? "Teamwork timer"}`,
                )
              }
            />
          ))}
        </>
      ) : null}
    </MenuBarExtra>
  );
}

async function openUrl(url: string) {
  const { open } = await import("@raycast/api");
  await open(url);
}
