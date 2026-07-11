import { useExec } from "@raycast/utils";
import { closeMainWindow, showToast, Toast } from "@raycast/api";

import { execFile } from "child_process";
import { useMemo } from "react";
import { runAppleScript, showFailureToast } from "@raycast/utils";

import { VM, VMAction, SearchState } from "./types";
import { parseVM } from "./utils";

export { findVMs, openVM, runVMAction, shutPrl };

function findVMs(): SearchState {
  const { isLoading, data } = useExec("/usr/local/bin/prlctl", ["list", "--all", "--full", "--json", "--info"], {
    onError: showCommandError,
  });
  const results = useMemo<Record<string, string>[]>(() => JSON.parse(data || "[]"), [data]);
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
  (async () => {
    try {
      switch (action) {
        case VMAction.Resume:
          await execPrlctl(["resume", vm.id]);
          break;
        case VMAction.Start:
          await execPrlctl(["start", vm.id]);
          break;
        case VMAction.Suspend:
          await execPrlctl(["suspend", vm.id]);
          break;
        case VMAction.Stop:
          await execPrlctl(["stop", vm.id]);
          break;
        case VMAction.ForceStop:
          await execPrlctl(["stop", vm.id, "--kill"]);
          break;
        case VMAction.Reset:
          await execPrlctl(["reset", vm.id]);
          break;
      }
    } catch (error) {
      console.error(error);
      await showFailureToast(error, {
        message: "Failed to perform VM action",
      });
    }
  })();
}

function showCommandError(error: Error): void {
  console.log(error);
  showToast({
    style: Toast.Style.Failure,
    title: "Could not access virtual machines",
    message: "You must have Parallels Pro or Business/Enterprise Editions to use this extension",
  });
}

function shutPrl(): Promise<void> {
  closeMainWindow();
  return execPrlsrvctl(["shutdown", "-f"]);
}

function execPrlctl(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("/usr/local/bin/prlctl", args, (error, stdout, stderr) => {
      if (error) {
        console.error(`prlctl ${args.join(" ")}\nstdout: ${stdout}\nstderr: ${stderr}\n`, error);
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function execPrlsrvctl(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("/usr/local/bin/prlsrvctl", args, (error, stdout, stderr) => {
      if (error) {
        console.error(`prlsrvctl ${args.join(" ")}\nstdout: ${stdout}\nstderr: ${stderr}\n`, error);
        reject(error);
        return;
      }
      resolve();
    });
  });
}
