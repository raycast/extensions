import { Action, ActionPanel, Icon, Keyboard, List, Toast, closeMainWindow, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { registeredVMs, type RegisteredVM } from "./registered-vms";
import { errorMessage, iconForVM, openOutcomeTitle, presentVMState } from "./presentation";

async function loadRegisteredVMs(): Promise<readonly RegisteredVM[]> {
  return registeredVMs.snapshot();
}

export default function Command() {
  const { data, error, isLoading, revalidate } = useCachedPromise(loadRegisteredVMs, [], {
    keepPreviousData: true,
    onError: (loadError) => {
      void showToast({
        style: Toast.Style.Failure,
        title: "Could Not Access Virtual Machines",
        message: errorMessage(loadError),
      });
    },
  });
  const vms = data ?? [];

  return (
    <List filtering={{ keepSectionOrder: true }} isLoading={isLoading} searchBarPlaceholder="Search virtual machines…">
      {vms.length === 0 && !isLoading ? (
        <List.EmptyView
          title={error ? "Could Not Load Virtual Machines" : "No Virtual Machines Found"}
          description={
            error ? errorMessage(error) : "Register a non-template virtual machine in Parallels Desktop, then refresh."
          }
          icon={error ? Icon.ExclamationMark : Icon.Window}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Virtual Machines"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="All Virtual Machines" subtitle={String(vms.length)}>
          {vms.map((vm) => (
            <VMItem key={vm.id} vm={vm} revalidate={revalidate} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function VMItem({ vm, revalidate }: { vm: RegisteredVM; revalidate: () => void }) {
  const state = presentVMState(vm.state);
  const keywords = [vm.id, vm.os, vm.description].filter((value): value is string => Boolean(value));

  return (
    <List.Item
      title={vm.name}
      subtitle={vm.description || vm.os}
      icon={iconForVM(vm)}
      keywords={keywords}
      accessories={[{ tag: { value: state.label, color: state.color } }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Open or Switch" icon={Icon.Window} onAction={() => openOrSwitch(vm, revalidate)} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh Virtual Machines"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function openOrSwitch(vm: RegisteredVM, revalidate: () => void): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Opening ${vm.name}…`,
  });

  try {
    await closeMainWindow();
    const outcome = await registeredVMs.openOrSwitch(vm.id);
    toast.style = Toast.Style.Success;
    toast.title = openOutcomeTitle(outcome);
    void revalidate();
  } catch (error) {
    console.error(error);
    toast.style = Toast.Style.Failure;
    toast.title = `Could Not Open ${vm.name}`;
    toast.message = errorMessage(error);
  }
}
