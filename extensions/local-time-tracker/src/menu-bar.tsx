import { Icon, LaunchType, MenuBarExtra, launchCommand, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { formatDuration, getDurationSeconds } from "./lib/duration";
import { showFailure } from "./lib/errors";
import { getProjectName } from "./lib/projects";
import { getActiveTimer, getProjects } from "./lib/storage";
import { stopTimer } from "./lib/timer";
import type { ActiveTimer, Project } from "./lib/types";

export default function MenuBarCommand() {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    try {
      const [savedTimer, savedProjects] = await Promise.all([getActiveTimer(), getProjects()]);
      setActiveTimer(savedTimer);
      setProjects(savedProjects);
    } catch (error) {
      console.error("Failed to load menu bar timer", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  let elapsed = "-";
  if (activeTimer) {
    try {
      elapsed = formatDuration(getDurationSeconds(activeTimer.startedAt, new Date()));
    } catch {
      elapsed = "Invalid";
    }
  }

  async function stop() {
    try {
      const result = await stopTimer();
      if (result.status === "none") {
        await showHUD("No active timer");
      } else {
        await showHUD(`Stopped: ${formatDuration(result.durationSeconds)}`);
      }
      setActiveTimer(null);
    } catch (error) {
      await showFailure("Failed to stop timer", error);
    }
  }

  return (
    <MenuBarExtra icon={Icon.Stopwatch} title={elapsed} isLoading={isLoading} tooltip="Local Time Tracker">
      {activeTimer ? (
        <>
          <MenuBarExtra.Item title={getProjectName(projects, activeTimer.projectId)} />
          {activeTimer.description ? <MenuBarExtra.Item title={activeTimer.description} /> : null}
          <MenuBarExtra.Item title={elapsed} />
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item title="Stop Work" icon={Icon.Stop} onAction={stop} />
        </>
      ) : (
        <>
          <MenuBarExtra.Item title="No active timer" />
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title="Start Work"
            icon={Icon.Play}
            onAction={() => launchCommand({ name: "start-work", type: LaunchType.UserInitiated })}
          />
        </>
      )}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Open Work Logs"
        icon={Icon.List}
        onAction={() => launchCommand({ name: "work-logs", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Item
        title="Open Reports"
        icon={Icon.BarChart}
        onAction={() => launchCommand({ name: "reports", type: LaunchType.UserInitiated })}
      />
    </MenuBarExtra>
  );
}
