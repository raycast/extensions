import { Color, Icon, LaunchType, MenuBarExtra, Toast, launchCommand, showHUD, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { launchWithFailure } from "./lib/command-actions";
import { formatDuration, getDurationSeconds } from "./lib/duration";
import { showFailure } from "./lib/errors";
import { getProjectName } from "./lib/projects";
import { getActiveTimer, getProjects, getWorkLogs } from "./lib/storage";
import { stopTimer } from "./lib/timer";
import {
  checkReminders,
  endPomodoro,
  getPomodoro,
  getReminderSettings,
  startPomodoroInterval,
} from "./lib/reminder-service";
import { isIntervalFinished, nextPhase, phaseLabel, type PomodoroState } from "./lib/reminders";
import type { ActiveTimer, Project } from "./lib/types";

export default function MenuBarCommand() {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pomodoro, setPomodoro] = useState<PomodoroState | null>(null);
  const [reminderError, setReminderError] = useState(false);
  const [isChangingPomodoro, setIsChangingPomodoro] = useState(false);
  const pomodoroEnabled = getReminderSettings().pomodoroEnabled;

  async function load() {
    try {
      const [savedTimer, savedProjects] = await Promise.all([getActiveTimer(), getProjects()]);
      setActiveTimer(savedTimer);
      setProjects(savedProjects);
      try {
        const savedPomodoro = pomodoroEnabled ? await getPomodoro(savedTimer) : null;
        setPomodoro(savedPomodoro);
        const logs = await getWorkLogs();
        await checkReminders(logs, savedTimer, new Date());
        setReminderError(false);
      } catch (error) {
        console.error("Failed to check reminders", error);
        setReminderError(true);
      }
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
  const now = new Date();
  const pomodoroFinished = pomodoro ? isIntervalFinished(pomodoro, now) : false;
  const pomodoroTitle = pomodoro
    ? pomodoroFinished
      ? `${phaseLabel(pomodoro.phase)} finished — waiting`
      : `${phaseLabel(pomodoro.phase)}: ${formatDuration(Math.max(0, Math.ceil((Date.parse(pomodoro.endsAt) - now.getTime()) / 1000)))}`
    : "";
  if (activeTimer) {
    try {
      elapsed = formatDuration(getDurationSeconds(activeTimer.startedAt, new Date()));
    } catch {
      elapsed = "Clock changed";
    }
  }

  async function stop() {
    try {
      const result = await stopTimer();
      if (result.status === "none") {
        await showHUD("No active timer");
        setActiveTimer(null);
        setPomodoro(null);
      } else if (result.status === "clock-rollback") {
        await showToast({
          style: Toast.Style.Failure,
          title: "Clock changed",
          message: "The timer is still running. Correct your Mac clock, then stop it again.",
        });
      } else {
        await showHUD(`Stopped: ${formatDuration(result.durationSeconds)}`);
        setActiveTimer(null);
        setPomodoro(null);
      }
    } catch (error) {
      await showFailure("Failed to stop timer", error);
    }
  }

  async function changePomodoro(action: "start" | "next" | "end") {
    if (!activeTimer || isChangingPomodoro) return;
    setIsChangingPomodoro(true);
    try {
      if (action === "end") {
        await endPomodoro(activeTimer.id);
        setPomodoro(null);
      } else {
        setPomodoro(await startPomodoroInterval(activeTimer.id, action === "next" ? pomodoro?.intervalId : undefined));
      }
    } catch (error) {
      await showFailure("Could not change Pomodoro", error);
    } finally {
      setIsChangingPomodoro(false);
    }
  }

  const menuTitle = activeTimer ? `${elapsed}${pomodoro ? ` · ${pomodoroTitle}` : ""}` : undefined;

  return (
    <MenuBarExtra
      icon={pomodoro ? { source: "tomato.svg", tintColor: Color.PrimaryText } : Icon.Stopwatch}
      title={menuTitle}
      isLoading={isLoading}
      tooltip="Local Time Tracker"
    >
      {activeTimer ? (
        <>
          <MenuBarExtra.Item title={getProjectName(projects, activeTimer.projectId)} />
          {activeTimer.description ? <MenuBarExtra.Item title={activeTimer.description} /> : null}
          <MenuBarExtra.Item title={elapsed} />
          <MenuBarExtra.Separator />
          {pomodoro ? (
            <>
              <MenuBarExtra.Item title={pomodoroTitle} />
              <MenuBarExtra.Item
                title={`Completed work intervals: ${pomodoro.completedWork + (pomodoroFinished && pomodoro.phase === "work" ? 1 : 0)}`}
              />
              {pomodoroFinished ? (
                <MenuBarExtra.Item
                  title={`Start ${phaseLabel(nextPhase(pomodoro))}`}
                  icon={Icon.Play}
                  onAction={() => changePomodoro("next")}
                />
              ) : null}
              <MenuBarExtra.Item title="End Pomodoro" icon={Icon.Stop} onAction={() => changePomodoro("end")} />
            </>
          ) : pomodoroEnabled ? (
            <MenuBarExtra.Item title="Start Pomodoro" icon={Icon.Play} onAction={() => changePomodoro("start")} />
          ) : null}
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
            onAction={() =>
              launchWithFailure(
                () => launchCommand({ name: "start-work", type: LaunchType.UserInitiated }),
                "Could not open Start Work",
                showFailure,
              )
            }
          />
        </>
      )}
      {reminderError ? <MenuBarExtra.Item title="Reminder check failed — will retry" icon={Icon.Warning} /> : null}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Open Work Logs"
        icon={Icon.List}
        onAction={() =>
          launchWithFailure(
            () => launchCommand({ name: "work-logs", type: LaunchType.UserInitiated }),
            "Could not open Work Logs",
            showFailure,
          )
        }
      />
      <MenuBarExtra.Item
        title="Open Reports"
        icon={Icon.BarChart}
        onAction={() =>
          launchWithFailure(
            () => launchCommand({ name: "reports", type: LaunchType.UserInitiated }),
            "Could not open Reports",
            showFailure,
          )
        }
      />
    </MenuBarExtra>
  );
}
