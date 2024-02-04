import { useEffect, useState } from "react";
import { List, Color, Icon, Toast, showToast, Action, ActionPanel, confirmAlert, popToRoot } from "@raycast/api";
import { ProxmoxAPI } from "../utils/api/proxmox";
import { LXCContainer } from "../interfaces/lxccontainer";
import { bytesToGBS, secondsToHMS } from "../utils/helpers/conversion";

const linuxContainerStatusColors: Record<string, Color> = {
  running: Color.Green,
  paused: Color.Orange,
  stopped: Color.Red,
};
export function ProxmoxLinuxContainers(): JSX.Element {
  const [linuxContainers, setLinuxContainers] = useState<LXCContainer[]>();
  const [error, setError] = useState<Error>();
  const instance = new ProxmoxAPI();
  async function getLinuxContainers() {
    let containers;
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Fetching LXC containers",
      });
      containers = await instance.getLXCContainers();
    } catch (error) {
      setError(new Error("Failed to get LXC", { cause: error }));
    }
    showToast({
      style: Toast.Style.Success,
      title: "Fetched LXC containers",
    });
    setLinuxContainers(containers);
  }
  async function LinuxContainerPowerAction(lxc: LXCContainer, action: string, dangerous: boolean = false) {
    if (dangerous) {
      if (
        !(await confirmAlert({
          title: `Are you sure you want to perform action ${action} on ${lxc.name}'?`,
          icon: { source: Icon.Warning, tintColor: Color.Red },
        }))
      ) {
        return;
      }
    }
    await showToast({
      style: Toast.Style.Animated,
      title: `${lxc.name}: ${action}`,
    });
    const result = await instance.performLinuxContainerPowerAction(lxc, action);
    if (result?.exitstatus == "OK") {
      await showToast({
        style: Toast.Style.Success,
        title: `${lxc.name}: ${action} was successfully completed`,
      });
      popToRoot();
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: `${lxc.name}: ${action} failed`,
        message: result?.exitstatus,
      });
    }
  }
  useEffect(() => {
    getLinuxContainers();
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
      isLoading={linuxContainers === undefined && error === undefined}
      isShowingDetail={linuxContainers !== undefined && linuxContainers?.length !== 0}
      searchBarPlaceholder="Search name, id, tags or node"
    >
      {error !== undefined ? (
        <List.EmptyView icon={Icon.Warning} title={error.message} description={`${error.cause}`} />
      ) : (
        <></>
      )}
      {linuxContainers?.length === 0 ? (
        <List.EmptyView
          title="No LXC Containers Found"
          description="Instance has no LXC containers"
          icon={Icon.SpeechBubbleImportant}
        />
      ) : (
        linuxContainers?.map((lxc: LXCContainer) => (
          <List.Item
            icon={{
              source: !lxc.template ? "icons/lxc.svg" : "icons/template.svg",
              tintColor: lxc.status == "running" ? Color.PrimaryText : Color.SecondaryText,
            }}
            key={`${lxc.node}-${lxc.name}`}
            title={lxc.name}
            keywords={[`${lxc.vmid}`, lxc.node, ...lxc.tags.split(";")]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Navigation">
                  <Action.OpenInBrowser title="Open In Proxmox Web UI" url={lxc.url} />
                </ActionPanel.Section>
                {!lxc.template ? (
                  <ActionPanel.Section title="Power Actions">
                    {!["running", "paused"].includes(lxc.qmpstatus) ? (
                      <Action
                        title="Start"
                        icon={{ source: "icons/start.svg", tintColor: Color.PrimaryText }}
                        onAction={() => LinuxContainerPowerAction(lxc, "start")}
                      ></Action>
                    ) : (
                      <>
                        <Action
                          title="Shutdown"
                          icon={{ source: "icons/poweroff.svg", tintColor: Color.PrimaryText }}
                          onAction={() => LinuxContainerPowerAction(lxc, "shutdown", true)}
                        />
                        <Action
                          title="Stop"
                          icon={{ source: "icons/stop.svg", tintColor: Color.PrimaryText }}
                          onAction={() => LinuxContainerPowerAction(lxc, "stop", true)}
                        />
                        <Action
                          title="Reboot"
                          icon={{ source: "icons/swap.svg", tintColor: Color.PrimaryText }}
                          onAction={() => LinuxContainerPowerAction(lxc, "reboot", true)}
                        />
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
                        text={lxc.status}
                        color={linuxContainerStatusColors[lxc.status]}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="ID" text={`${lxc.vmid}`} />
                    <List.Item.Detail.Metadata.Label
                      title="Node"
                      text={lxc.node}
                      icon={{ source: "icons/node.svg", tintColor: Color.PrimaryText }}
                    />
                    <List.Item.Detail.Metadata.Label title="Uptime" text={lxc.uptime ? secondsToHMS(lxc.uptime) : ""} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Tags">
                      {lxc.tags ? (
                        lxc.tags
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
                      text={`${lxc.cpus}`}
                      icon={{ source: "icons/cpu.svg", tintColor: Color.PrimaryText }}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Memory"
                      text={bytesToGBS(lxc.memory)}
                      icon={{ source: "icons/memory.svg", tintColor: Color.PrimaryText }}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Swap Usage"
                      text={`${bytesToGBS(lxc.swapUtil)} / ${bytesToGBS(lxc.swap)}`}
                      icon={{ source: "icons/swap.svg", tintColor: Color.PrimaryText }}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Bootable Disk"
                      text={bytesToGBS(lxc.disk)}
                      icon={{ source: "icons/disk.svg", tintColor: Color.PrimaryText }}
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
