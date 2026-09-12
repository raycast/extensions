import { rebootVm, resumeVm, shutdownVm, startVm, stopVm, suspendVm } from "@/api";

export const ALL_ACTIONS = {
  start: {
    title: "Start",
    labels: {
      doing: "Starting",
      ended: "Started",
    },
    func: startVm,
    needConfirm: false,
  },
  shutdown: {
    title: "Shutdown",
    labels: {
      doing: "Shutting down",
      ended: "Shutdown",
    },
    func: shutdownVm,
  },
  stop: {
    title: "Stop",
    labels: {
      doing: "Stopping",
      ended: "Stopped",
    },
    func: stopVm,
  },
  reboot: {
    title: "Reboot",
    labels: {
      doing: "Rebooting",
      ended: "Rebooted",
    },
    func: rebootVm,
  },
  resume: {
    title: "Resume",
    labels: {
      doing: "Resuming",
      ended: "Resumed",
    },
    func: resumeVm,
  },
  suspend: {
    title: "Pause",
    labels: {
      doing: "Pausing",
      ended: "Paused",
    },
    func: suspendVm,
  },
};
