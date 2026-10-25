import type { PveTask } from "@/types";
import { ALL_ACTIONS } from "@/utils/const";

const POWER_ACTION_TITLES = Object.fromEntries(
  Object.entries(ALL_ACTIONS).flatMap(([action, { title }]) => [
    [`qm${action}`, title],
    [`vz${action}`, title],
  ]),
);

const TASK_TITLES: Record<string, string> = {
  ...POWER_ACTION_TITLES,
  qmreset: "Reset",
  qmcreate: "Create",
  qmdestroy: "Destroy",
  qmclone: "Clone",
  qmigrate: "Migrate",
  qmconfig: "Configure",
  vzcreate: "Create",
  vzdestroy: "Destroy",
  vzmigrate: "Migrate",
  vzdump: "Backup",
  qmrestore: "Restore",
  vzrestore: "Restore",
  vncproxy: "Console",
  vncshell: "Shell",
  termproxy: "Console",
  spiceproxy: "Console",
  aptupdate: "Update Package Database",
  startall: "Start All",
  stopall: "Stop All",
};

export function getTaskTitle(task: Pick<PveTask, "type" | "id">): string {
  const title = TASK_TITLES[task.type] ?? task.type;
  return task.id ? `${title} ${task.id}` : title;
}

/** Task lists leave out the status and end time of a task that still runs */
export function isTaskRunning(task: Pick<PveTask, "status" | "endtime">): boolean {
  return task.status === undefined && task.endtime === undefined;
}
