import { Action, ActionPanel, Color, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import type { MutatePromise } from "@raycast/utils";
import { showFailureToast } from "@raycast/utils";
import type { PveVm, VmAction } from "@/types";
import { PveVmStatus, PveVmTypes } from "@/types";
import { ALL_ACTIONS } from "@/utils/const";
import { formatBrowserUrl } from "@/utils/format";

type VmActionPanelProps = {
  vm: PveVm;
  revalidate: () => void;
  mutate: MutatePromise<PveVm[] | undefined>;
};

export const VmActionPanel = ({ vm, revalidate, mutate }: VmActionPanelProps) => {
  const handleAction = async (vm: PveVm, { title, labels, func, needConfirm = true }: VmAction) => {
    const confirm =
      !needConfirm ||
      (await confirmAlert({
        title: `${title} VM`,
        message: `Are you sure you want to ${title} ${vm.name}?`,
      }));

    if (!confirm) {
      return;
    }

    const toast = await showToast({
      title: `${title} VM`,
      message: `${labels.doing} ${vm.name}...`,
      style: Toast.Style.Animated,
    });

    try {
      await mutate(func(vm));
    } catch (e) {
      await showFailureToast(e, {
        title: `Failed to ${title} ${vm.name}`,
      });
      return;
    }

    toast.style = Toast.Style.Success;
    toast.message = `${labels.ended} ${vm.name}`;
  };

  return (
    <ActionPanel>
      <ActionPanel.Section title={vm.name}>
        {vm.status === PveVmStatus.paused && (
          <Action
            title={ALL_ACTIONS.resume.title}
            icon={{ source: Icon.Play, tintColor: Color.Green }}
            onAction={() => handleAction(vm, ALL_ACTIONS.resume)}
          />
        )}
        {(vm.status === PveVmStatus.running || vm.status === PveVmStatus.paused) && (
          <>
            <Action
              title={ALL_ACTIONS.shutdown.title}
              icon={{ source: Icon.Power, tintColor: Color.Yellow }}
              onAction={() => handleAction(vm, ALL_ACTIONS.shutdown)}
            />
            <Action
              title={ALL_ACTIONS.reboot.title}
              icon={{ source: Icon.Repeat, tintColor: Color.Blue }}
              onAction={() => handleAction(vm, ALL_ACTIONS.reboot)}
            />
            {vm.type === PveVmTypes.qemu && (
              <Action
                title={ALL_ACTIONS.suspend.title}
                icon={Icon.Pause}
                onAction={() => handleAction(vm, ALL_ACTIONS.suspend)}
              />
            )}
            <Action
              title={ALL_ACTIONS.stop.title}
              icon={{ source: Icon.Stop, tintColor: Color.Red }}
              onAction={() => handleAction(vm, ALL_ACTIONS.stop)}
            />
          </>
        )}
        {vm.status === PveVmStatus.stopped && (
          <Action
            title={ALL_ACTIONS.start.title}
            icon={{ source: Icon.Play, tintColor: Color.Green }}
            onAction={() => handleAction(vm, ALL_ACTIONS.start)}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Browser">
        <Action.OpenInBrowser
          url={formatBrowserUrl(`#v1:0:=${vm.type}/${vm.vmid}`)}
          title="Open Dashboard"
          icon={Icon.Globe}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="List">
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={revalidate}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
