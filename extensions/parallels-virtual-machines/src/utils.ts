import { Image } from "@raycast/api";

import { VM, VMState } from "./types";

export { parseVM, stateFromText, stateToDescription, iconForVM };

function parseVM(data: any): VM {
  const id: string = data["ID"];
  const name: string = data["Name"];
  const description: string = data["Description"];
  const os: string = data["OS"];
  const state: VMState = stateFromText(data["State"]);
  return { id, name, description, os, state };
}

function stateFromText(text: string): VMState {
  switch (text) {
    case "stopped":
      return VMState.Stopped;
    case "resuming":
      return VMState.Resuming;
    case "running":
      return VMState.Running;
    case "suspended":
      return VMState.Suspended;
  }
  return VMState.Unknown;
}

function stateToDescription(state: VMState): string {
  switch (state) {
    case VMState.Stopped:
      return "";
    case VMState.Resuming:
      return "Resuming…";
    case VMState.Running:
      return "Running";
    case VMState.Suspended:
      return "Suspended";
    case VMState.Unknown:
      return "";
  }
}

function iconForVM(vm: VM): Image {
  let icon = "other";
  if (["win-11", "win-10", "ubuntu", "fedora", "fedora-core", "debian", "kali", "centos", "macos"].includes(vm.os)) {
    icon = vm.os;
  } else if (vm.os.includes("win") || vm.os.includes("Win")) {
    icon = "win-other";
  } else if (["redhat", "mint", "opensuse", "manjaro", "arch", "linux", "lin"].includes(vm.os)) {
    icon = "linux";
  }
  return { source: `osicons/${icon}.png` };
}
