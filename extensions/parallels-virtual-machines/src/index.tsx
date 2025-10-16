import { ActionPanel, Action, List } from "@raycast/api";

import { VM, VMState, VMAction } from "./types";
import { findVMs, openVM, runVMAction } from "./actions";
import { stateToDescription, iconForVM } from "./utils";

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
            {vm.state == VMState.Running && <Action title="Open" onAction={() => openVM(vm)} />}
            {vm.state == VMState.Suspended && (
              <Action title="Resume" onAction={() => runVMAction(vm, VMAction.Resume)} />
            )}
            {vm.state == VMState.Stopped && <Action title="Start" onAction={() => runVMAction(vm, VMAction.Start)} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {vm.state == VMState.Running && (
              <Action title="Suspend" onAction={() => runVMAction(vm, VMAction.Suspend)} />
            )}
            {vm.state == VMState.Suspended && (
              <Action title="Resume" onAction={() => runVMAction(vm, VMAction.Resume)} />
            )}
            {vm.state == VMState.Stopped && <Action title="Start" onAction={() => runVMAction(vm, VMAction.Start)} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
