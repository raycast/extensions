import {
  ActionPanel,
  List,
  Action,
  Icon,
  Image,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";
import {
  PveVm,
  PveVmStatus,
  PveVmTypes,
  rebootVm,
  shutdownVm,
  startVm,
  stopVm,
  resumeVm,
  suspendVm,
  useVmList,
} from "./api";
import { MutatePromise, showFailureToast } from "@raycast/utils";
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

interface VmAction {
  title: string;
  labels: {
    doing: string;
    ended: string;
  };
  func: (vm: PveVm) => Promise<unknown>;
  needConfirm?: boolean;
}

const ALL_ACTIONS = {
  start: {
    title: "Start",
    labels: {
      doing: "Starting",
      ended: "Started",
    },
    func: startVm,
    needConfirm: false,
  },
  shutdown: {
    title: "Shutdown",
    labels: {
      doing: "Shutting down",
      ended: "Shutdown",
    },
    func: shutdownVm,
  },
  stop: {
    title: "Stop",
    labels: {
      doing: "Stopping",
      ended: "Stopped",
    },
    func: stopVm,
  },
  reboot: {
    title: "Reboot",
    labels: {
      doing: "Rebooting",
      ended: "Rebooted",
    },
    func: rebootVm,
  },
  resume: {
    title: "Resume",
    labels: {
      doing: "Resuming",
      ended: "Resumed",
    },
    func: resumeVm,
  },
  suspend: {
    title: "Pause",
    labels: {
      doing: "Pausing",
      ended: "Paused",
    },
    func: suspendVm,
  },
};

function VmActionPannel({
  vm,
  revalidate,
  mutate,
}: {
  vm: PveVm;
  revalidate: () => void;
  mutate: MutatePromise<PveVm[] | undefined>;
}) {
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
    <ActionPanel title={vm.name}>
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

function getMockData(): PveVm[] {
  const baseVmList = [
    {
      type: PveVmTypes.lxc,
      name: "Alpine",
      status: PveVmStatus.running,
    },
    {
      type: PveVmTypes.lxc,
      name: "Arch",
      status: PveVmStatus.stopped,
    },
    {
      type: PveVmTypes.qemu,
      name: "Debian 12",
      status: PveVmStatus.running,
    },
    {
      type: PveVmTypes.qemu,
      name: "Ubuntu 24",
      status: PveVmStatus.paused,
    },
    {
      type: PveVmTypes.qemu,
      name: "Windows 11",
      status: PveVmStatus.stopped,
    },
  ];

  const MAX_MEM = 4 * 1024 * 1024 * 1024;
  const MAX_DISK = 50 * 1024 * 1024 * 1024;
  const MAX_IO = 100 * 1024 * 1024;

  return baseVmList.map((vm, index) => {
    const id = index + 100;

    return {
      ...vm,
      id: `${vm.type}/${id}`,
      vmid: id,
      cpu: Math.random() * 1,
      maxcpu: 2,
      mem: Math.random() * MAX_MEM,
      maxmem: MAX_MEM,
      disk: Math.random() * MAX_DISK,
      maxdisk: MAX_DISK,
      diskread: Math.random() * MAX_IO,
      diskwrite: Math.random() * MAX_IO,
      netin: Math.random() * MAX_IO,
      netout: Math.random() * MAX_IO,
      node: "pve",
      uptime: Math.round(Math.random() * 1000),
    };
  });
}

const USE_MOCK_DATA = process.env.NODE_ENV === "development";

export default function Command() {
  const { isLoading, data, error, revalidate, mutate } = useVmList();

  if (error)
    return (
      <Detail
        markdown="Something went wrong, check your preferences."
        actions={
          <ActionPanel>
            <Action title="Open Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );

  const [type, setType] = useState<string>("all");

  // it's not safe to use hooks inside a condition, but it's fine for dev
  const dataToUse = USE_MOCK_DATA ? useState(getMockData)[0] : data;
  const filteredData =
    dataToUse?.filter((vm) => {
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
          icon={{ ...getStatusIcon(vm.status), tooltip: vm.status }}
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
