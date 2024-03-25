import { ActionPanel, List, Action, Icon, Image, Color, showToast, Toast, confirmAlert } from "@raycast/api";
import { PveVm, PveVmStatus, rebootVm, shutdownVm, startVm, stopVm, useVmList } from "./api";
import { MutatePromise } from "@raycast/utils";
import VmDetail from "./components/VmDetail";
import { useState } from "react";

function getStatusIcon(status: PveVmStatus): Image {
  switch (status) {
    case PveVmStatus.running:
      return {
        source: Icon.Play,
        tintColor: Color.Green,
      };
    case PveVmStatus.stopped:
      return {
        source: Icon.Stop,
        tintColor: Color.SecondaryText,
      };
    case PveVmStatus.paused:
      return {
        source: Icon.Pause,
        tintColor: Color.Yellow,
      };
    default:
      return {
        source: Icon.QuestionMark,
      };
  }
}

function VmActionPannel({
  vm,
  revalidate,
  mutate,
}: {
  vm: PveVm;
  revalidate: () => void;
  mutate: MutatePromise<PveVm[] | undefined>;
}) {
  const handleAction = async ({
    labels,
    action,
    needConfirm = true,
  }: {
    labels: {
      start: string;
      doing: string;
      ended: string;
    };
    action: () => Promise<unknown>;
    needConfirm?: boolean;
  }) => {
    const confirm =
      !needConfirm ||
      (await confirmAlert({
        title: `${labels.start} VM`,
        message: `Are you sure you want to ${labels.start} ${vm.name}?`,
      }));

    if (!confirm) {
      return;
    }

    const toast = await showToast({
      title: `${labels.start} VM`,
      message: `${labels.doing} ${vm.name}...`,
      style: Toast.Style.Animated,
    });

    await mutate(action());

    toast.style = Toast.Style.Success;
    toast.message = `${labels.ended} ${vm.name}`;
  };

  const allActions = {
    start: {
      labels: {
        start: "Start",
        doing: "Starting",
        ended: "Started",
      },
      action: () => startVm(vm),
      needConfirm: false,
    },
    shutdown: {
      labels: {
        start: "Shutdown",
        doing: "Shutting down",
        ended: "Shutdown",
      },
      action: () => shutdownVm(vm),
    },
    stop: {
      labels: {
        start: "Stop",
        doing: "Stopping",
        ended: "Stopped",
      },
      action: () => stopVm(vm),
    },
    reboot: {
      labels: {
        start: "Reboot",
        doing: "Rebooting",
        ended: "Rebooted",
      },
      action: () => rebootVm(vm),
    },
  };

  return (
    <ActionPanel title={vm.name}>
      {vm.status === "running" && (
        <>
          <Action
            title="Shutdown"
            icon={{ source: Icon.Power, tintColor: Color.Yellow }}
            onAction={() => handleAction(allActions.shutdown)}
          />
          <Action
            title="Reboot"
            icon={{ source: Icon.Repeat, tintColor: Color.Blue }}
            onAction={() => handleAction(allActions.reboot)}
          />
          <Action
            title="Stop"
            icon={{ source: Icon.Stop, tintColor: Color.Red }}
            onAction={() => handleAction(allActions.stop)}
          />
        </>
      )}
      {vm.status === "stopped" && (
        <Action
          title="Start"
          icon={{ source: Icon.Play, tintColor: Color.Green }}
          onAction={() => handleAction(allActions.start)}
        />
      )}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={revalidate}
      />
    </ActionPanel>
  );
}

function VmTypeDropdown(props: { onChange: (value: string) => void }) {
  const TYPES = ["All", "QEMU", "LXC"];

  return (
    <List.Dropdown tooltip="VM Types" onChange={props.onChange}>
      {TYPES.map((type) => (
        <List.Dropdown.Item key={type} title={type} value={type.toLowerCase()} />
      ))}
    </List.Dropdown>
  );
}

export default function Command() {
  const { isLoading, data, revalidate, mutate } = useVmList();
  const [type, setType] = useState<string>("all");

  const filteredData =
    data?.filter((vm) => {
      if (type === "all") {
        return true;
      }

      return vm.type === type;
    }) ?? [];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
      searchBarAccessory={<VmTypeDropdown onChange={setType} />}
    >
      {filteredData.map((vm) => (
        <List.Item
          key={vm.id}
          icon={getStatusIcon(vm.status)}
          title={vm.name}
          actions={<VmActionPannel vm={vm} mutate={mutate} revalidate={revalidate} />}
          keywords={[vm.vmid.toString()]}
          detail={<VmDetail vm={vm} />}
          accessories={[{ text: vm.id }]}
        />
      ))}
    </List>
  );
}
