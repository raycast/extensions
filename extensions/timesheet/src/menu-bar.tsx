// MenuBarExtra is macOS-only, so every shortcut in this file is too. Platform-specific
// variants would be dead code on Windows, where this command never renders.
/* eslint-disable @raycast/no-ambiguous-platform-shortcut */
import {
  Icon,
  LaunchType,
  MenuBarExtra,
  Toast,
  launchCommand,
  open,
  showToast,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  formatDurationHM,
  formatDurationHuman,
  getProjects,
  getTaskDurationMs,
  getTimerDuration,
  getTimerProjectName,
  getTimerStatus,
  getTodayTasks,
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer,
  type Project,
} from "./api";

export default function MenuBar() {
  const timer = useCachedPromise(getTimerStatus, [], { initialData: null });
  const projects = useCachedPromise(getProjects, [], {
    initialData: [] as Project[],
  });
  const tasks = useCachedPromise(getTodayTasks, [], { initialData: [] });

  const currentDuration = timer.data ? getTimerDuration(timer.data) : 0;
  const projectName = timer.data ? getTimerProjectName(timer.data) : undefined;

  const todayTotal = tasks.data.reduce(
    (sum, task) => sum + getTaskDurationMs(task),
    0,
  );

  const activeProjects = projects.data.filter((p) => !p.archived).slice(0, 10);

  let title: string | undefined;
  let icon: Icon | string = "icon_menubar.png";

  if (timer.data?.status === "running") {
    title = formatDurationHM(currentDuration);
    icon = Icon.PlayFilled;
  } else if (timer.data?.status === "paused") {
    title = formatDurationHM(currentDuration);
    icon = Icon.PauseFilled;
  }

  function revalidateAll() {
    timer.revalidate();
    tasks.revalidate();
  }

  // A disabled target command rejects instead of opening, so say so.
  async function openCommand(name: string) {
    try {
      await launchCommand({ name, type: LaunchType.UserInitiated });
    } catch (error) {
      showFailureToast(error, { title: "Could not open the command" });
    }
  }

  async function handleStartTimer(project: Project) {
    try {
      await startTimer(project.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Timer started",
        message: project.title,
      });
      revalidateAll();
    } catch (error) {
      showFailureToast(error, { title: "Failed to start timer" });
    }
  }

  async function handleStopTimer() {
    try {
      await stopTimer();
      await showToast({ style: Toast.Style.Success, title: "Timer stopped" });
      revalidateAll();
    } catch (error) {
      showFailureToast(error, { title: "Failed to stop timer" });
    }
  }

  async function handlePauseTimer() {
    try {
      await pauseTimer();
      await showToast({ style: Toast.Style.Success, title: "Timer paused" });
      revalidateAll();
    } catch (error) {
      showFailureToast(error, { title: "Failed to pause timer" });
    }
  }

  async function handleResumeTimer() {
    try {
      await resumeTimer();
      await showToast({ style: Toast.Style.Success, title: "Timer resumed" });
      revalidateAll();
    } catch (error) {
      showFailureToast(error, { title: "Failed to resume timer" });
    }
  }

  return (
    <MenuBarExtra
      icon={icon}
      title={title}
      isLoading={timer.isLoading || projects.isLoading || tasks.isLoading}
    >
      {timer.data?.status === "running" && (
        <MenuBarExtra.Section title="Running Timer">
          <MenuBarExtra.Item
            title={projectName || "Timer Running"}
            subtitle={formatDurationHM(currentDuration)}
            icon={Icon.Play}
          />
          <MenuBarExtra.Item
            title="Pause"
            icon={Icon.Pause}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={handlePauseTimer}
          />
          <MenuBarExtra.Item
            title="Stop"
            icon={Icon.Stop}
            shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
            onAction={handleStopTimer}
          />
        </MenuBarExtra.Section>
      )}

      {timer.data?.status === "paused" && (
        <MenuBarExtra.Section title="Paused Timer">
          <MenuBarExtra.Item
            title={projectName || "Timer Paused"}
            subtitle={formatDurationHM(currentDuration)}
            icon={Icon.Pause}
          />
          <MenuBarExtra.Item
            title="Resume"
            icon={Icon.Play}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={handleResumeTimer}
          />
          <MenuBarExtra.Item
            title="Stop"
            icon={Icon.Stop}
            shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
            onAction={handleStopTimer}
          />
        </MenuBarExtra.Section>
      )}

      {(timer.data?.status === "running" ||
        timer.data?.status === "paused") && (
        <MenuBarExtra.Section title="Add to Timer">
          <MenuBarExtra.Item
            title="Add Note"
            icon={Icon.Pencil}
            onAction={() => openCommand("add-note")}
          />
          <MenuBarExtra.Item
            title="Add Expense"
            icon={Icon.Coins}
            onAction={() => openCommand("add-expense")}
          />
          <MenuBarExtra.Item
            title="Add Break"
            icon={Icon.Mug}
            onAction={() => openCommand("add-break")}
          />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section title="Today">
        <MenuBarExtra.Item
          title={`Total: ${formatDurationHuman(todayTotal)}`}
          icon={Icon.Calendar}
        />
      </MenuBarExtra.Section>

      {timer.data?.status === "stopped" && (
        <MenuBarExtra.Section title="Start Timer">
          {activeProjects.map((project) => (
            <MenuBarExtra.Item
              key={project.id}
              title={project.title}
              icon={Icon.Circle}
              onAction={() => handleStartTimer(project)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Timesheet"
          icon={Icon.Globe}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => open("https://my.timesheet.io")}
        />
        <MenuBarExtra.Item
          title="Full Timer View"
          icon={Icon.AppWindowList}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={() => openCommand("timer-toggle")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
