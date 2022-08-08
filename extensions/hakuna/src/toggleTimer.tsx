import { LocalStorage, showToast, Toast } from "@raycast/api";
import { deleteTimeEntry, getTimer, listTimeEntries, startTimer, stopTimer } from "./api/hakuna";
import { differenceInMinutes, format, parseISO } from "date-fns";
import { Timer } from "./@types/models";

export default async function () {
  const timer = await getTimer();

  if (isTimerRunning(timer)) {
    const toast = new Toast({ style: Toast.Style.Animated, title: `Stopping timer...` });
    toast.show();
    await Promise.all([
      LocalStorage.setItem("projectId", timer.project.id),
      LocalStorage.setItem("taskId", timer.task.id),
      stopTimer(),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
    await toast.hide();

    await showToast({ title: `Timer stopped` });

    return;
  }

  const projectId = await LocalStorage.getItem<number>("projectId");
  const taskId = await LocalStorage.getItem<number>("taskId");

  if (!projectId || !taskId) {
    await showToast({ style: Toast.Style.Failure, title: `Use change project first` });
    return;
  }

  const toast = new Toast({ style: Toast.Style.Animated, title: `Starting timer...` });
  toast.show();
  const timeEntries = await listTimeEntries(today(), today());
  if (timeEntries[0]) {
    const diffInMinutes = differenceInMinutes(new Date(), parseISO(timeEntries[0].ends));
    if (diffInMinutes <= 1) {
      await deleteTimeEntry(timeEntries[0].id);
      await startTimer(timeEntries[0].project.id, timeEntries[0].task.id, timeEntries[0].start_time);
      await toast.hide();

      await showToast({ title: `Timer restarted` });
      return;
    }
  }

  await Promise.all([startTimer(projectId, taskId), new Promise((resolve) => setTimeout(resolve, 1000))]);
  await toast.hide();

  await showToast({ title: `Timer started` });

  return;
}

function isTimerRunning(timer: Timer): timer is Required<Timer> {
  return Boolean(timer?.project) && Boolean(timer?.task);
}

function today() {
  return format(new Date(), "yyyy-MM-dd");
}
