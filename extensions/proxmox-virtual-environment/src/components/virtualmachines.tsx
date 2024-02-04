import { useEffect, useState } from "react";
import { List, Icon, Color, Toast, showToast, Action, ActionPanel, confirmAlert, popToRoot } from "@raycast/api";
import { ProxmoxAPI } from "../utils/api/proxmox";
import { VirtualMachine } from "../interfaces/virtualmachine";
import { bytesToGBS, secondsToHMS } from "../utils/helpers/conversion";

const virtualMachineStatusColors: Record<string, Color> = {
  running: Color.Green,
  paused: Color.Orange,
  stopped: Color.Red,
};

export function ProxmoxVirtualMachines(): JSX.Element {
  const [virtualMachines, setVirtualMachines] = useState<VirtualMachine[]>();
  const [error, setError] = useState<Error>();
  const instance = new ProxmoxAPI();
  async function getVirtualmachines() {
    let vms;
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Fetching virtual machines",
      });
      vms = await instance.getVirtualMachines();
    } catch (error) {
      setError(new Error("Failed to get virtual machines", { cause: error }));
    }
    showToast({
      style: Toast.Style.Success,
      title: "Fetched virtual machines",
    });
    setVirtualMachines(vms);
  }
  async function VirtualMachinePowerAction(vm: VirtualMachine, action: string, dangerous: boolean = false) {
    if (dangerous) {
      if (
        !(await confirmAlert({
          title: `Are you sure you want to perform action ${action} on ${vm.name}'?`,
          icon: { source: Icon.Warning, tintColor: Color.Red },
        }))
      ) {
        return;
      }
    }
    await showToast({
      style: Toast.Style.Animated,
      title: `${vm.name}: ${action}`,
    });
    const result = await instance.performVirtualMachinePowerAction(vm, action);
    if (result?.exitstatus == "OK") {
      await showToast({
        style: Toast.Style.Success,
        title: `${vm.name}: ${action} was successfully completed`,
      });
      popToRoot();
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: `${vm.name}: ${action} failed`,
        message: result?.exitstatus,
      });
    }
  }
  useEffect(() => {
    getVirtualmachines();
  }, []);
  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: error.message,
      });
    }
  }, [error]);

  return (
    <List
      isLoading={virtualMachines === undefined && error === undefined}
      isShowingDetail={virtualMachines !== undefined && virtualMachines?.length !== 0}
      searchBarPlaceholder="Search name, id, tags or node"
    >
      {error !== undefined ? (
        <List.EmptyView icon={Icon.Warning} title={error.message} description={`${error.cause}`} />
      ) : (
        <></>
      )}
      {virtualMachines?.length === 0 ? (
        <List.EmptyView
          title="No Virtual Machines Found"
          description="Instance has no virtual machines"
          icon={{ source: "icons/proxmox.png" }}
        />
      ) : (
        virtualMachines?.map((virtualmachine: VirtualMachine) => (
          <List.Item
            icon={{
              source: !virtualmachine.template ? "icons/virtualmachine.svg" : "icons/template.svg",
              tintColor:
                virtualmachine.qmpstatus == "running" || virtualmachine.qmpstatus == "paused"
                  ? Color.PrimaryText
                  : Color.SecondaryText,
            }}
            key={`${virtualmachine.node}-${virtualmachine.name}`}
            title={virtualmachine.name}
            keywords={[`${virtualmachine.vmid}`, virtualmachine.node, ...virtualmachine.tags.split(";")]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Navigation">
                  <Action.OpenInBrowser title="Open In Proxmox Web UI" url={virtualmachine.url} />
                </ActionPanel.Section>
                {!virtualmachine.template ? (
                  <ActionPanel.Section title="Power Actions">
                    {!["running", "paused"].includes(virtualmachine.qmpstatus) ? (
                      <Action
                        title="Start"
                        icon={{ source: "icons/start.svg", tintColor: Color.PrimaryText }}
                        onAction={() => VirtualMachinePowerAction(virtualmachine, "start")}
                      ></Action>
                    ) : (
                      <>
                        <Action
                          title="Shutdown"
                          icon={{ source: "icons/poweroff.svg", tintColor: Color.PrimaryText }}
                          onAction={() => VirtualMachinePowerAction(virtualmachine, "shutdown", true)}
                        />
                        <Action
                          title="Stop"
                          icon={{ source: "icons/stop.svg", tintColor: Color.PrimaryText }}
                          onAction={() => VirtualMachinePowerAction(virtualmachine, "stop", true)}
                        />
                        <Action
                          title="Reboot"
                          icon={{ source: "icons/swap.svg", tintColor: Color.PrimaryText }}
                          onAction={() => VirtualMachinePowerAction(virtualmachine, "reboot", true)}
                        />
                        {virtualmachine.qmpstatus != "paused" ? (
                          <>
                            <Action
                              title="Pause"
                              icon={{ source: "icons/pause.svg", tintColor: Color.PrimaryText }}
                              onAction={() => VirtualMachinePowerAction(virtualmachine, "pause", true)}
                            />
                            <Action
                              title="Hibernate"
                              icon={{ source: "icons/hibernate.svg", tintColor: Color.PrimaryText }}
                              onAction={() => VirtualMachinePowerAction(virtualmachine, "hibernate", true)}
                            />
                          </>
                        ) : (
                          <Action
                            title="Resume"
                            icon={{ source: "icons/start.svg", tintColor: Color.PrimaryText }}
                            onAction={() => VirtualMachinePowerAction(virtualmachine, "resume")}
                          />
                        )}
                      </>
                    )}
                  </ActionPanel.Section>
                ) : (
                  <></>
                )}
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={virtualmachine.qmpstatus}
                        color={virtualMachineStatusColors[virtualmachine.qmpstatus]}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="ID" text={`${virtualmachine.vmid}`} />
                    <List.Item.Detail.Metadata.Label
                      title="Node"
                      text={virtualmachine.node}
                      icon={{ source: "icons/node.svg", tintColor: Color.PrimaryText }}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Uptime"
                      text={virtualmachine.uptime ? secondsToHMS(virtualmachine.uptime) : ""}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Tags">
                      {virtualmachine.tags ? (
                        virtualmachine.tags
                          .split(";")
                          .map((tag) => (
                            <List.Item.Detail.Metadata.TagList.Item
                              icon={{ source: "icons/tags.svg", tintColor: Color.PrimaryText }}
                              key={tag}
                              text={tag}
                            />
                          ))
                      ) : (
                        <></>
                      )}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="CPU"
                      text={`${virtualmachine.cpus}`}
                      icon={{ source: "icons/cpu.svg", tintColor: Color.PrimaryText }}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Memory"
                      text={bytesToGBS(virtualmachine.memory)}
                      icon={{ source: "icons/memory.svg", tintColor: Color.PrimaryText }}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Bootable Disk"
                      text={bytesToGBS(virtualmachine.disk)}
                      icon={{ source: "icons/disk.svg", tintColor: Color.PrimaryText }}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="QEMU Version" text={`${virtualmachine.qemuVersion}`} />
                    <List.Item.Detail.Metadata.Label
                      title="QEMU Machine Type"
                      text={`${virtualmachine.runningMachineType}`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))
      )}
    </List>
  );
}
