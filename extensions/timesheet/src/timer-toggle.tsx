import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  formatDurationHM,
  getProjectColor,
  getProjects,
  getTimerDuration,
  getTimerProjectName,
  getTimerStatus,
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer,
  type Project,
  type Timer,
} from "./api";
import { ListErrorView } from "./error-view";
import { useClock } from "./use-clock";

export default function TimerToggle() {
  const timer = useCachedPromise(getTimerStatus, [], {
    initialData: null,
    failureToastOptions: { title: "Failed to load timer" },
  });
  const projects = useCachedPromise(getProjects, [], {
    initialData: [] as Project[],
    failureToastOptions: { title: "Failed to load projects" },
  });
  useClock(timer.data?.status === "running");

  const activeProjects = projects.data.filter((p) => !p.archived);
  const currentDuration = timer.data ? getTimerDuration(timer.data) : 0;
  const projectName = timer.data ? getTimerProjectName(timer.data) : undefined;

  function refresh() {
    timer.revalidate();
  }

  async function handleStartTimer(project: Project) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Starting timer...",
      });
      await startTimer(project.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Timer started",
        message: project.title,
      });
      refresh();
    } catch (error) {
      showFailureToast(error, { title: "Failed to start timer" });
    }
  }

  async function handleStopTimer() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Stopping timer...",
      });
      await stopTimer();
      await showToast({ style: Toast.Style.Success, title: "Timer stopped" });
      refresh();
    } catch (error) {
      showFailureToast(error, { title: "Failed to stop timer" });
    }
  }

  async function handlePauseTimer() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Pausing timer...",
      });
      await pauseTimer();
      await showToast({ style: Toast.Style.Success, title: "Timer paused" });
      refresh();
    } catch (error) {
      showFailureToast(error, { title: "Failed to pause timer" });
    }
  }

  async function handleResumeTimer() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Resuming timer...",
      });
      await resumeTimer();
      await showToast({ style: Toast.Style.Success, title: "Timer resumed" });
      refresh();
    } catch (error) {
      showFailureToast(error, { title: "Failed to resume timer" });
    }
  }

  const isRunning = (t: Timer | null): t is Timer =>
    t !== null && t.status === "running";
  const isPaused = (t: Timer | null): t is Timer =>
    t !== null && t.status === "paused";
  const isStopped = (t: Timer | null): boolean =>
    t === null || t.status === "stopped";

  // Without the timer we can't tell running from stopped, so don't offer to start one.
  if (timer.error && !timer.data) {
    return (
      <List>
        <ListErrorView
          error={timer.error}
          what="the timer"
          onRetry={timer.revalidate}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={timer.isLoading || projects.isLoading}
      searchBarPlaceholder="Search projects..."
    >
      {projects.error && (
        <ListErrorView
          error={projects.error}
          what="your projects"
          onRetry={projects.revalidate}
        />
      )}
      {isRunning(timer.data) && (
        <List.Section title="Running Timer">
          <List.Item
            icon={{ source: Icon.Clock, tintColor: Color.Green }}
            title={projectName || "Timer Running"}
            subtitle={timer.data.task?.description}
            accessories={[
              { text: formatDurationHM(currentDuration), icon: Icon.Stopwatch },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Stop Timer"
                  icon={Icon.Stop}
                  onAction={handleStopTimer}
                />
                <Action
                  title="Pause Timer"
                  icon={Icon.Pause}
                  onAction={handlePauseTimer}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {isPaused(timer.data) && (
        <List.Section title="Paused Timer">
          <List.Item
            icon={{ source: Icon.Clock, tintColor: Color.Yellow }}
            title={projectName || "Timer Paused"}
            subtitle={timer.data.task?.description}
            accessories={[
              { text: formatDurationHM(currentDuration), icon: Icon.Pause },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Resume Timer"
                  icon={Icon.Play}
                  onAction={handleResumeTimer}
                />
                <Action
                  title="Stop Timer"
                  icon={Icon.Stop}
                  onAction={handleStopTimer}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {isStopped(timer.data) && (
        <List.Section title="Start Timer for Project">
          {activeProjects.map((project) => (
            <List.Item
              key={project.id}
              icon={{
                source: Icon.Circle,
                tintColor: getProjectColor(project.color ?? 0),
              }}
              title={project.title}
              subtitle={project.employer || project.team?.name}
              actions={
                <ActionPanel>
                  <Action
                    title="Start Timer"
                    icon={Icon.Play}
                    onAction={() => handleStartTimer(project)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
