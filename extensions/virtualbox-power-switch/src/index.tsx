import { ActionPanel, List, Action, Icon, Color, Alert, confirmAlert } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { VM } from "./types";
import { useState } from "react";
import { parseFromStdout } from "./utils";

export default function Command() {
  const {
    isLoading: loadingAllVMs,
    data: allVMs,
    revalidate: revalidateAllVMs,
  } = useExec("VBoxManage", ["list", "vms"], {
    parseOutput: parseFromStdout,
  });

  const {
    isLoading: loadingRunningVMs,
    data: runningVMs,
    revalidate: revalidateRunningVMs,
  } = useExec("VBoxManage", ["list", "runningvms"], {
    parseOutput: parseFromStdout,
  });

  const [execArgs, setExecArgs] = useState<string[]>([]);
  useExec("VBoxManage", execArgs, {
    onData: execArgs.includes("unregistervm") ? revalidateAllVMs : revalidateRunningVMs,
  });

  function turnOn(vm: VM) {
    setExecArgs(["startvm", vm.uuid]);
  }

  function turnOff(vm: VM) {
    setExecArgs(["controlvm", vm.uuid, "poweroff"]);
  }

  async function deleteVM(vm: VM) {
    const alertOptions: Alert.Options = {
      title: "Delete VM",
      message:
        "Are you sure you want to delete this virtual machine?\nNote: All associated files will also be deleted.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(alertOptions)) setExecArgs(["unregistervm", "--delete", vm.uuid]);
  }

  function isRunning(vm: VM) {
    return !!runningVMs?.find((runningVM) => runningVM.uuid === vm.uuid);
  }

  const runningTag = {
    value: "Running",
    color: Color.Green,
  };
  const notRunningTag = {
    value: "Not Running",
    color: Color.Red,
  };

  return (
    <List isLoading={loadingAllVMs || loadingRunningVMs}>
      {allVMs?.map((vm) => {
        const vmRunning = isRunning(vm);
        return (
          <List.Item
            key={vm.uuid}
            icon={Icon.ComputerChip}
            title={vm.name}
            actions={
              <ActionPanel>
                {vmRunning ? (
                  <Action title="Turn Off" onAction={() => turnOff(vm)} />
                ) : (
                  <>
                    <Action title="Turn On" onAction={() => turnOn(vm)} />
                    <Action title="Delete VM" style={Action.Style.Destructive} onAction={() => deleteVM(vm)} />
                  </>
                )}
              </ActionPanel>
            }
            accessories={loadingRunningVMs ? [] : [{ tag: vmRunning ? runningTag : notRunningTag }]}
          />
        );
      })}
    </List>
  );
}
