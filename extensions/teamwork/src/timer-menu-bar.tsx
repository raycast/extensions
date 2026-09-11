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

  const running = data?.running;
  const paused = data?.paused ?? [];

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
      title={running ? formatElapsed(running) : undefined}
      isLoading={isLoading}
      tooltip={
        running
          ? (running.taskName ?? running.description)
          : "No Teamwork timer running"
      }
    >
      {running ? (
        <>
          <MenuBarExtra.Item
            title={running.taskName ?? running.description ?? "Teamwork timer"}
          />
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title="Pause Timer"
            icon={Icon.Pause}
            onAction={() =>
              update(
                () => pauseTimer(running.id),
                `Paused: ${running.taskName ?? "Teamwork timer"}`,
              )
            }
          />
          <MenuBarExtra.Item
            title="Stop and Log Timer"
            icon={Icon.Stop}
            onAction={() =>
              update(
                () => completeTimer(running),
                `Logged ${formatElapsed(running)}: ${running.taskName ?? "Teamwork timer"}`,
              )
            }
          />
          {running.taskId ? (
            <MenuBarExtra.Item
              title="Open Task"
              icon={Icon.Globe}
              onAction={() => openUrl(taskUrl(running.taskId))}
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
      {paused.length > 0 ? (
        <>
          <MenuBarExtra.Separator />
          {paused.map((t: TeamworkTimer) => (
            <MenuBarExtra.Submenu
              key={t.id}
              title={`${t.taskName ?? t.description ?? "Teamwork timer"} (${formatElapsed(t)})`}
              icon={Icon.Pause}
            >
              <MenuBarExtra.Item
                title="Resume"
                icon={Icon.Play}
                onAction={() =>
                  update(
                    () => resumeTimer(t.id),
                    `Resumed: ${t.taskName ?? "Teamwork timer"}`,
                  )
                }
              />
              <MenuBarExtra.Item
                title="Stop and Log"
                icon={Icon.Stop}
                onAction={() =>
                  update(
                    () => completeTimer(t),
                    `Logged ${formatElapsed(t)}: ${t.taskName ?? "Teamwork timer"}`,
                  )
                }
              />
              {t.taskId ? (
                <MenuBarExtra.Item
                  title="Open Task"
                  icon={Icon.Globe}
                  onAction={() => openUrl(taskUrl(t.taskId))}
                />
              ) : null}
            </MenuBarExtra.Submenu>
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
