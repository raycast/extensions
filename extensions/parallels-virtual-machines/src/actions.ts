import { useExec } from "@raycast/utils";
import { closeMainWindow, showToast, Toast } from "@raycast/api";

import { exec } from "child_process";
import { useMemo } from "react";
import { runAppleScript } from "run-applescript";

import { VM, VMAction, SearchState } from "./types";
import { parseVM } from "./utils";

export { findVMs, openVM, runVMAction };

function findVMs(): SearchState {
  const { isLoading, data } = useExec("/usr/local/bin/prlctl", ["list", "--all", "--full", "--json", "--info"], {
    onError: showCommandError,
  });
  const results = useMemo<unknown[]>(() => JSON.parse(data || "[]"), [data]);
  return {
    vms: results.map(parseVM),
    isLoading,
  };
}

function openVM(vm: VM): void {
  closeMainWindow();
  try {
    runAppleScript(`tell application "${vm.name}"\n activate\n end tell`);
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: "Could not open virtual machine",
      message: "Unable to run AppleScript to launch VM, has the VM application been removed or renamed?",
    });
  }
}

function runVMAction(vm: VM, action: VMAction): void {
  closeMainWindow();
  switch (action) {
    case VMAction.Resume:
      exec(`prlctl resume ${vm.id}`);
      break;
    case VMAction.Start:
      exec(`prlctl start ${vm.id}`);
      break;
    case VMAction.Suspend:
      exec(`prlctl suspend ${vm.id}`);
      break;
    case VMAction.Stop:
      exec(`prlctl stop ${vm.id}`);
      break;
  }
}

function showCommandError(error: Error): void {
  console.log(error);
  showToast({
    style: Toast.Style.Failure,
    title: "Could not access virtual machines",
    message: "You must have Parallels Pro to use this extension",
  });
}
