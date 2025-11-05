import { ActionPanel, Action, List, Icon, closeMainWindow, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";

import { VM, VMState, VMAction } from "./types";
import { findVMs, openVM, runVMAction } from "./actions";
import { stateToDescription, iconForVM } from "./utils";

export default function Command() {
  const state = findVMs();

  return (
    <List isLoading={state.isLoading} enableFiltering={true} searchBarPlaceholder="Search virtual machines...">
      <List.Section title="All Virtual Machines" subtitle={state.vms.length + ""}>
        {state.vms.map((vm) => (
          <VMItem key={vm.id} vm={vm} />
        ))}
      </List.Section>
    </List>
  );
}

function VMItem({ vm }: { vm: VM }) {
  return (
    <List.Item
      title={vm.name}
      subtitle={stateToDescription(vm.state)}
      icon={iconForVM(vm)}
      keywords={[vm.description]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {vm.state == VMState.Running && (
              <>
                <Action title="Open" icon={Icon.Window} onAction={() => openVM(vm)} />
                <Action title="Suspend" icon={Icon.Pause} onAction={() => runVMAction(vm, VMAction.Suspend)} />
                <Action title="Reset" icon={Icon.ArrowClockwise} onAction={() => runVMAction(vm, VMAction.Reset)} />
                <Action title="Force Stop" icon={Icon.Power} onAction={() => runVMAction(vm, VMAction.ForceStop)} />
              </>
            )}
            {vm.state == VMState.Suspended && (
              <>
                <Action title="Resume" icon={Icon.Play} onAction={() => runVMAction(vm, VMAction.Resume)} />
                <Action
                  title="Start then Force Stop"
                  icon={Icon.Power}
                  onAction={() => {
                    closeMainWindow();
                    exec(`prlctl start ${vm.id} && sleep 5 && prlctl stop ${vm.id} --kill`, (error: Error | null) => {
                      if (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to Start then Force Stop",
                          message: error.message,
                        });
                      }
                    });
                  }}
                />
              </>
            )}
            {vm.state == VMState.Stopped && (
              <Action title="Start" icon={Icon.Play} onAction={() => runVMAction(vm, VMAction.Start)} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
