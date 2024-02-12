import { Action, ActionPanel, List } from "@raycast/api";

import { findVMs, openVM, runVMAction } from "./actions";
import { VM, VMAction, VMState } from "./types";
import { iconAction, iconForVM, stateToDescription } from "./utils";

export default function Command() {
  const state = findVMs();

  return (
    <List isLoading={state.isLoading} enableFiltering={true} searchBarPlaceholder="Search virtual machines...">
      <List.Section title="VMs" subtitle={state.vms.length + ""}>
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
              <Action title="Open" icon={{ source: "actions/open.png" }} onAction={() => openVM(vm)} />
            )}
            {vm.state == VMState.Suspended && (
              <Action
                title="Resume"
                icon={iconAction(VMAction.Resume)}
                onAction={() => runVMAction(vm, VMAction.Resume)}
              />
            )}
            {vm.state == VMState.Stopped && (
              <Action
                title="Start"
                icon={iconAction(VMAction.Start)}
                onAction={() => runVMAction(vm, VMAction.Start)}
              />
            )}
            {vm.state == VMState.Running && (
              <Action
                title="Restart"
                icon={iconAction(VMAction.Restart)}
                onAction={() => runVMAction(vm, VMAction.Restart)}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {vm.state == VMState.Running && (
              <Action
                title="Pause"
                icon={iconAction(VMAction.Pause)}
                onAction={() => runVMAction(vm, VMAction.Pause)}
              />
            )}
            {vm.state == VMState.Running && (
              <Action
                title="Suspend"
                icon={iconAction(VMAction.Suspend)}
                onAction={() => runVMAction(vm, VMAction.Suspend)}
              />
            )}
            {vm.state == VMState.Running && (
              <Action
                title="Shutdown"
                icon={iconAction(VMAction.Shutdown)}
                onAction={() => runVMAction(vm, VMAction.Shutdown)}
              />
            )}
            {vm.state == VMState.Running && (
              <Action
                title="Restart"
                icon={iconAction(VMAction.Restart)}
                onAction={() => runVMAction(vm, VMAction.Restart)}
              />
            )}
            {vm.state == VMState.Suspended && (
              <Action title="Resume" onAction={() => runVMAction(vm, VMAction.Resume)} />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Stop" icon={iconAction(VMAction.Stop)} onAction={() => runVMAction(vm, VMAction.Stop)} />
            <Action title="Reset" icon={iconAction(VMAction.Reset)} onAction={() => runVMAction(vm, VMAction.Reset)} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
