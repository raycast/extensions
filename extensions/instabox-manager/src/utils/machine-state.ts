import { Color, Icon, Image } from "@raycast/api";
import { Machine, MachineState, Operation } from "../types";

export type StateGroup = "running" | "busy" | "paused" | "stopped" | "error";

const STATES: Record<MachineState, { label: string; color: Color; group: StateGroup }> = {
  running: { label: "Running", color: Color.Green, group: "running" },
  creating: { label: "Creating", color: Color.Blue, group: "busy" },
  starting: { label: "Starting", color: Color.Blue, group: "busy" },
  resuming: { label: "Resuming", color: Color.Blue, group: "busy" },
  suspending: { label: "Pausing", color: Color.Orange, group: "busy" },
  stopping: { label: "Stopping", color: Color.Orange, group: "busy" },
  deleting: { label: "Deleting", color: Color.Red, group: "busy" },
  suspended: { label: "Paused", color: Color.Yellow, group: "paused" },
  stopped: { label: "Stopped", color: Color.SecondaryText, group: "stopped" },
  error: { label: "Error", color: Color.Red, group: "error" },
  deleted: { label: "Deleted", color: Color.SecondaryText, group: "stopped" },
};

export const STATE_GROUPS: { group: StateGroup; title: string }[] = [
  { group: "running", title: "Running" },
  { group: "busy", title: "In Progress" },
  { group: "paused", title: "Paused" },
  { group: "stopped", title: "Stopped" },
  { group: "error", title: "Error" },
];

export function stateInfo(machine: Machine) {
  const info = STATES[machine.state] ?? { label: machine.state, color: Color.SecondaryText, group: "stopped" };
  // A machine with an active operation accepts no other change until it finishes.
  return isBusy(machine) ? { ...info, group: "busy" as StateGroup } : info;
}

export function stateIcon(machine: Machine): Image.ImageLike {
  const { color } = stateInfo(machine);
  return isBusy(machine)
    ? { source: Icon.CircleProgress50, tintColor: color }
    : { source: Icon.CircleFilled, tintColor: color };
}

export function isBusy(machine: Machine) {
  return machine.operationId !== null || STATES[machine.state]?.group === "busy";
}

/** Paused by InstaBox after being idle; using it (exec, SSH) wakes it up again. */
export function isIdlePaused(machine: Machine) {
  return machine.state === "suspended" && !!machine.autoSuspendedAt;
}

export function canExec(machine: Machine) {
  return !isBusy(machine) && (machine.state === "running" || isIdlePaused(machine));
}

const OPERATION_LABELS: Record<Operation["type"], string> = {
  create: "Creating",
  start: "Starting",
  stop: "Stopping",
  suspend: "Pausing",
  resume: "Resuming",
  delete: "Deleting",
};

export function operationProgress(operation: Operation) {
  const phase = operation.phase?.replace(/_/g, " ");
  if (operation.state === "queued") return "Queued…";
  return phase ? `${OPERATION_LABELS[operation.type]}: ${phase}…` : `${OPERATION_LABELS[operation.type]}…`;
}
