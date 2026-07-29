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
  getRunningTimer,
  pauseTimer,
  resumeTimer,
  taskUrl,
} from "./teamwork";

export default function Command() {
  const {
    data: timer,
    isLoading,
    revalidate,
  } = usePromise(getRunningTimer, []);

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

  if (!timer) {
    return (
      <MenuBarExtra
        icon={Icon.Clock}
        isLoading={isLoading}
        tooltip="No Teamwork timer running"
      >
        <MenuBarExtra.Item
          title="Search Teamwork Tasks"
          icon={Icon.MagnifyingGlass}
          onAction={() =>
            launchCommand({
              name: "search-tasks",
              type: LaunchType.UserInitiated,
            })
          }
        />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra
      icon={Icon.Clock}
      title={formatElapsed(timer)}
      isLoading={isLoading}
      tooltip={timer.taskName ?? timer.description}
    >
      <MenuBarExtra.Item
        title={timer.taskName ?? timer.description ?? "Teamwork timer"}
        subtitle={timer.projectName}
      />
      <MenuBarExtra.Separator />
      {timer.running ? (
        <MenuBarExtra.Item
          title="Pause Timer"
          icon={Icon.Pause}
          onAction={() =>
            update(
              () => pauseTimer(timer.id),
              `Paused: ${timer.taskName ?? "Teamwork timer"}`,
            )
          }
        />
      ) : (
        <MenuBarExtra.Item
          title="Resume Timer"
          icon={Icon.Play}
          onAction={() =>
            update(
              () => resumeTimer(timer.id),
              `Resumed: ${timer.taskName ?? "Teamwork timer"}`,
            )
          }
        />
      )}
      <MenuBarExtra.Item
        title="Stop and Log Timer"
        icon={Icon.Stop}
        onAction={() =>
          update(
            () => completeTimer(timer),
            `Logged ${formatElapsed(timer)}: ${timer.taskName ?? "Teamwork timer"}`,
          )
        }
      />
      {timer.taskId ? (
        <MenuBarExtra.Item
          title="Open Task"
          icon={Icon.Globe}
          onAction={() => openUrl(taskUrl(timer.taskId))}
        />
      ) : null}
      <MenuBarExtra.Separator />
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
    </MenuBarExtra>
  );
}

async function openUrl(url: string) {
  const { open } = await import("@raycast/api");
  await open(url);
}
