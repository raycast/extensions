import { Image } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { IconsColorType } from "./types";

import { VM, VMAction, VMState } from "./types";

export { parseVM, stateFromText, stateToDescription, iconForVM, iconAction };

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
  let colortype = "mono";
  if (parseInt(getPreferenceValues().IconColorType) === IconsColorType.Color) {
    colortype = "colored";
  }

  if (["win-11", "win-10", "ubuntu", "fedora", "fedora-core", "debian", "kali", "centos", "macos"].includes(vm.os)) {
    icon = vm.os;
  } else if (vm.os.includes("win") || vm.os.includes("Win")) {
    icon = "win-other";
  } else if (["redhat", "mint", "opensuse", "manjaro", "arch", "linux", "lin"].includes(vm.os)) {
    icon = "linux";
  }
  return { source: `osicons/${colortype}/${icon}.png` };
}

function iconAction(action: VMAction): Image {
  let image = "other";
  switch (action) {
    case VMAction.Resume:
      image = "play";
      break;
    case VMAction.Start:
      image = "start";
      break;
    case VMAction.Suspend:
      image = "suspend";
      break;
    case VMAction.Stop:
      image = "stop";
      break;
    case VMAction.Restart:
      image = "restart";
      break;
    case VMAction.Reset:
      image = "reset";
      break;
    case VMAction.Pause:
      image = "pause";
      break;
    case VMAction.Shutdown:
      image = "shutdown";
      break;
  }
  return { source: `actions/${image}.png` };
}
