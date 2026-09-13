import { Color, Icon, type Image } from "@raycast/api";

import type { OpenOutcome, RegisteredVM, VMState } from "./registered-vms";

export type VMStatePresentation = Readonly<{
  label: string;
  color: Color;
}>;

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

export function iconForVM(vm: Pick<RegisteredVM, "os">): Image {
  const os = (vm.os ?? "").toLowerCase();
  let tintColor = Color.Purple;

  if (os.includes("fedora")) {
    tintColor = Color.Blue;
  } else if (os.includes("ubuntu")) {
    tintColor = Color.Orange;
  } else if (os.includes("debian")) {
    tintColor = Color.Red;
  } else if (os.includes("kali")) {
    tintColor = Color.Blue;
  } else if (os.includes("centos")) {
    tintColor = Color.Purple;
  } else if (["mac", "os x", "osx", "darwin", "macos"].some((name) => os.includes(name))) {
    tintColor = Color.PrimaryText;
  } else if (os.includes("windows") || os.includes("win")) {
    tintColor = Color.Blue;
  } else if (["redhat", "mint", "opensuse", "manjaro", "arch", "linux", "lin"].some((name) => os.includes(name))) {
    tintColor = Color.Green;
  }

  return { source: Icon.ComputerChip, tintColor };
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
