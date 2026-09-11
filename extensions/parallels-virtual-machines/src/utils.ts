import { Image } from "@raycast/api";

import { VM, VMState } from "./types";

export { parseVM, stateFromText, stateToDescription, iconForVM };

function parseVM(data: Record<string, string>): VM {
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
  const raw = vm.os || "";
  const os = raw.toLowerCase();

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
  } else if (
    os.includes("mac") ||
    os.includes("os x") ||
    os.includes("osx") ||
    os.includes("darwin") ||
    os.includes("macos")
  ) {
    icon = "macos";
  } else if (os.includes("windows") || os.includes("win")) {
    if (os.includes("11")) {
      icon = "win-11";
    } else if (os.includes("10")) {
      icon = "win-10";
    } else {
      icon = "win-other";
    }
  } else if (["redhat", "mint", "opensuse", "manjaro", "arch", "linux", "lin"].some((k) => os.includes(k))) {
    icon = "linux";
  }

  return { source: `osicons/${icon}.png` };
}
