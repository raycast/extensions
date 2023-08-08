import { ActionPanel, Detail, List, Action, Icon, Color } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { VM } from "./types";
import { useState } from "react";
import { parseFromStdout } from "./utils";

export default function Command() {
  const { isLoading: loadingAllVMs, data: allVMs } = useExec("VBoxManage", ["list", "vms"], {
    parseOutput: parseFromStdout,
  });

  const {
    isLoading: loadingRunningVMs,
    data: runningVMs,
    revalidate,
  } = useExec("VBoxManage", ["list", "runningvms"], {
    parseOutput: parseFromStdout,
  });

  const [execArgs, setExecArgs] = useState<string[]>([]);
  useExec("VBoxManage", execArgs, { onData: revalidate });

  function turnOn(vm: VM) {
    setExecArgs(["startvm", vm.uuid]);
  }

  function turnOff(vm: VM) {
    setExecArgs(["controlvm", vm.uuid, "poweroff"]);
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
                  <Action title="Turn On" onAction={() => turnOn(vm)} />
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
