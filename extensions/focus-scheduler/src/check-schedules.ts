import { environment, LaunchType, showHUD } from "@raycast/api";
import { completeFocusSession, startFocusSession } from "./lib/focus";
import {
  remainingDurationSeconds,
  sessionDateKey,
  shouldCompleteSchedule,
  shouldStartSchedule,
} from "./lib/schedule";
import {
  loadRuntimeState,
  loadSchedules,
  saveRuntimeState,
} from "./lib/storage";
import { FocusSchedule, ScheduleRuntimeState } from "./lib/types";

export default async function CheckSchedulesCommand() {
  const now = new Date();
  const schedules = await loadSchedules();
  const runtime = await loadRuntimeState();
  const enabled = schedules.filter((s) => s.enabled);

  if (enabled.length === 0) {
    console.log("Focus Scheduler: no enabled schedules");
    return;
  }

  // Complete active session first if its window ended
  if (runtime.activeScheduleId) {
    const active = schedules.find((s) => s.id === runtime.activeScheduleId);
    if (
      !active ||
      shouldCompleteSchedule(active, runtime.activeScheduleId, now)
    ) {
      console.log(
        `Focus Scheduler: completing session for ${active?.name ?? runtime.activeScheduleId}`,
      );
      try {
        await completeFocusSession();
        if (environment.launchType === LaunchType.UserInitiated) {
          await showHUD("Focus session completed");
        }
      } catch (error) {
        console.error("Focus Scheduler: failed to complete session", error);
      }
      runtime.activeScheduleId = undefined;
      runtime.activeStartedDate = undefined;
      await saveRuntimeState(runtime);
    }
  }

  // Start the first matching schedule that hasn't started for this session key
  const due = enabled.find((schedule) =>
    shouldStartSchedule(schedule, runtime.lastStartedDate[schedule.id], now),
  );

  if (!due) {
    console.log("Focus Scheduler: nothing due");
    await saveRuntimeState(runtime);
    return;
  }

  await startSchedule(due, runtime, now);
}

async function startSchedule(
  schedule: FocusSchedule,
  runtime: ScheduleRuntimeState,
  now: Date,
) {
  const key = sessionDateKey(schedule.startTime, schedule.endTime, now);
  const durationSeconds = remainingDurationSeconds(
    schedule.startTime,
    schedule.endTime,
    now,
  );

  if (durationSeconds < 60) {
    console.log(
      `Focus Scheduler: skipping “${schedule.name}” — less than 1 minute left in window`,
    );
    runtime.lastStartedDate[schedule.id] = key;
    await saveRuntimeState(runtime);
    return;
  }

  console.log(
    `Focus Scheduler: starting “${schedule.name}” for remaining ${durationSeconds}s (until ${schedule.endTime})`,
  );

  try {
    await startFocusSession({
      goal: schedule.goal || schedule.name,
      categories: schedule.categories,
      durationSeconds,
      mode: schedule.mode,
    });

    runtime.lastStartedDate[schedule.id] = key;
    runtime.activeScheduleId = schedule.id;
    runtime.activeStartedDate = key;
    await saveRuntimeState(runtime);

    if (environment.launchType === LaunchType.UserInitiated) {
      const minutes = Math.round(durationSeconds / 60);
      await showHUD(`Started Focus: ${schedule.name} (${minutes}m left)`);
    }
  } catch (error) {
    console.error("Focus Scheduler: failed to start session", error);
    throw error;
  }
}
