import { Color, Icon, type Image } from "@raycast/api";

import type { OpenOutcome, RegisteredVM, VMControl, VMState } from "./registered-vms";

export type VMStatePresentation = Readonly<{
  label: string;
  color: Color;
}>;

export type VMControlPresentation = Readonly<{
  title: string;
  icon: Icon;
  progressTitle: (vmName: string) => string;
  successTitle: (vmName: string) => string;
  destructive: boolean;
  confirmationMessage?: (vmName: string) => string;
}>;

const RUNNING_CONTROLS = ["suspend", "reset", "force-stop"] as const satisfies readonly VMControl[];
const SUSPENDED_CONTROLS = ["start-then-force-stop"] as const satisfies readonly VMControl[];
const NO_CONTROLS: readonly VMControl[] = [];

const CONTROL_PRESENTATIONS: Readonly<Record<VMControl, VMControlPresentation>> = {
  suspend: {
    title: "Suspend",
    icon: Icon.Pause,
    progressTitle: (vmName) => `Suspending ${vmName}…`,
    successTitle: (vmName) => `Suspended ${vmName}`,
    destructive: false,
  },
  reset: {
    title: "Reset",
    icon: Icon.ArrowClockwise,
    progressTitle: (vmName) => `Resetting ${vmName}…`,
    successTitle: (vmName) => `Reset ${vmName}`,
    destructive: true,
    confirmationMessage: (vmName) => `Reset ${vmName} immediately? Unsaved work in the virtual machine may be lost.`,
  },
  "force-stop": {
    title: "Force Stop",
    icon: Icon.Power,
    progressTitle: (vmName) => `Force stopping ${vmName}…`,
    successTitle: (vmName) => `Force stopped ${vmName}`,
    destructive: true,
    confirmationMessage: (vmName) => `Force stop ${vmName}? Unsaved work in the virtual machine will be lost.`,
  },
  "start-then-force-stop": {
    title: "Start Then Force Stop",
    icon: Icon.Power,
    progressTitle: (vmName) => `Starting and force stopping ${vmName}…`,
    successTitle: (vmName) => `Force stopped ${vmName}`,
    destructive: true,
    confirmationMessage: (vmName) =>
      `Start and then force stop ${vmName}? Its suspended state and unsaved work will be lost.`,
  },
};

export function presentVMState(state: VMState): VMStatePresentation {
  switch (state) {
    case "running":
      return { label: "Running", color: Color.Green };
    case "suspended":
      return { label: "Suspended", color: Color.Yellow };
    case "stopped":
      return { label: "Stopped", color: Color.SecondaryText };
    case "transitioning":
      return { label: "Transitioning…", color: Color.Orange };
    case "unknown":
      return { label: "Unknown", color: Color.Red };
  }
}

export function controlsForState(state: VMState): readonly VMControl[] {
  if (state === "running") return RUNNING_CONTROLS;
  if (state === "suspended") return SUSPENDED_CONTROLS;
  return NO_CONTROLS;
}

export function presentVMControl(action: VMControl): VMControlPresentation {
  return CONTROL_PRESENTATIONS[action];
}

export function iconForVM(vm: Pick<RegisteredVM, "os">): Image {
  const os = (vm.os ?? "").toLowerCase();
  let icon = "other";

  if (os.includes("fedora")) {
    icon = "fedora";
  } else if (os.includes("ubuntu")) {
    icon = "ubuntu";
  } else if (os.includes("debian")) {
    icon = "debian";
  } else if (os.includes("kali")) {
    icon = "kali";
  } else if (os.includes("centos")) {
    icon = "centos";
  } else if (["mac", "os x", "osx", "darwin", "macos"].some((name) => os.includes(name))) {
    icon = "macos";
  } else if (os.includes("windows") || os.includes("win")) {
    icon = os.includes("11") ? "win-11" : os.includes("10") ? "win-10" : "win-other";
  } else if (["redhat", "mint", "opensuse", "manjaro", "arch", "linux", "lin"].some((name) => os.includes(name))) {
    icon = "linux";
  }

  return { source: `osicons/${icon}.png` };
}

export function openOutcomeTitle(outcome: OpenOutcome): string {
  switch (outcome.action) {
    case "switched":
      return `Switched to ${outcome.vm.name}`;
    case "resumed-and-switched":
      return `Resumed and Switched to ${outcome.vm.name}`;
    case "started-and-switched":
      return `Started and Switched to ${outcome.vm.name}`;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "An unexpected error occurred.";
}
