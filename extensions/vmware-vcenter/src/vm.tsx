import { vCenter } from "./api/vCenter";
import {
  VMInfo,
  VMSummary,
  VmPowerState,
  VmStoragePolicyInfo,
  NetworkSummary,
  VMGuestPowerAction,
  VMPowerAction,
  StoragePoliciesSummary,
  VMStoragePolicyComplianceInfo,
  VmStoragePolicyComplianceStatus,
  VmGuestNetworkingInterfacesInfo,
} from "./api/types";
import {
  PowerModeIcons,
  PowerModeIconsMetadata,
  PowerModeTextMetadata,
  VMGuestPowerActionIcons,
  VMPowerActionIcons,
  VMStoragePolicyComplianceText,
  VMStoragePolicyComplianceColor,
  VMStoragePolicyComplianceIcon,
  OsTextMetadata,
  OsIconsMetadata,
} from "./api/ui";
import * as React from "react";
import { List, Toast, getPreferenceValues, Icon, Action, ActionPanel, showToast, Color } from "@raycast/api";

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const preferences = getPreferenceValues();
const vCenterApi = new vCenter(preferences.vcenter_fqdn, preferences.vcenter_username, preferences.vcenter_password);

export default function Command(): JSX.Element {
  const [isLoading, setIsLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [showDetail, setShowDetail]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [selectedVM, setSelectedVM]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [VMs, setVMs]: [VMSummary[], React.Dispatch<React.SetStateAction<VMSummary[]>>] = React.useState(
    [] as VMSummary[]
  );
  const [VMsInfo, setVMsInfo]: [Map<string, VMInfo>, React.Dispatch<React.SetStateAction<Map<string, VMInfo>>>] =
    React.useState(new Map());
  const [VMsGuestNetworkingInterfaces, setVMsGuestNetworkingInterfaces]: [
    Map<string, VmGuestNetworkingInterfacesInfo[]>,
    React.Dispatch<React.SetStateAction<Map<string, VmGuestNetworkingInterfacesInfo[]>>>
  ] = React.useState(new Map());
  const [VMsStoragePolicy, setVMsStoragePolicy]: [
    Map<string, VmStoragePolicyInfo>,
    React.Dispatch<React.SetStateAction<Map<string, VmStoragePolicyInfo>>>
  ] = React.useState(new Map());
  const [VMsStoragePolicyCompliance, setVMsStoragePolicyCompliance]: [
    Map<string, VMStoragePolicyComplianceInfo>,
    React.Dispatch<React.SetStateAction<Map<string, VMStoragePolicyComplianceInfo>>>
  ] = React.useState(new Map());
  const Networks: React.MutableRefObject<NetworkSummary[]> = React.useRef([]);
  const StoragePolicies: React.MutableRefObject<StoragePoliciesSummary[]> = React.useRef([]);

  function GetNetworkName(network: string): string {
    const filter = Networks.current.filter((net) => net.network === network);
    if (filter.length > 0) return filter[0].name;
    return network;
  }

  async function VMGuestAction(vm: string, action: VMGuestPowerAction): Promise<void> {
    const MessageGuestActionStarted: Map<VMGuestPowerAction, string> = new Map([
      [VMGuestPowerAction.REBOOT, `Rebooting`],
      [VMGuestPowerAction.SHUTDOWN, `Shuting Down`],
      [VMGuestPowerAction.STANDBUY, `is Suspending`],
    ]);
    const MessageGuestActionFinished: Map<VMGuestPowerAction, string> = new Map([
      [VMGuestPowerAction.REBOOT, `Rebooted`],
      [VMGuestPowerAction.SHUTDOWN, `Powered Off`],
      [VMGuestPowerAction.STANDBUY, `Suspended`],
    ]);

    await showToast({
      style: Toast.Style.Animated,
      title: `${VMsInfo.get(vm)?.name}`,
      message: `${MessageGuestActionStarted.get(action)}`,
    });
    await vCenterApi
      .VMGuestPower(vm, action)
      .then(
        async () =>
          await showToast({
            style: Toast.Style.Success,
            title: `${VMsInfo.get(vm)?.name}`,
            message: `${MessageGuestActionFinished.get(action)}`,
          })
      )
      .catch(
        async (error) =>
          await showToast({ style: Toast.Style.Failure, title: `${VMsInfo.get(vm)?.name}`, message: `${error}` })
      );
  }

  async function VMAction(vm: string, action: VMPowerAction): Promise<void> {
    const MessageActionStarted: Map<VMPowerAction, string> = new Map([
      [VMPowerAction.RESET, `Rebooting`],
      [VMPowerAction.START, `Starting`],
      [VMPowerAction.STOP, `Shuting Down`],
      [VMPowerAction.SUSPEND, `Suspending`],
    ]);
    const MessageActionFinished: Map<VMPowerAction, string> = new Map([
      [VMPowerAction.RESET, `Rebooted`],
      [VMPowerAction.START, `Powered On`],
      [VMPowerAction.STOP, `Powered Off`],
      [VMPowerAction.SUSPEND, `Suspended`],
    ]);

    await showToast({
      style: Toast.Style.Animated,
      title: `${VMsInfo.get(vm)?.name}`,
      message: `${MessageActionStarted.get(action)}`,
    });
    await vCenterApi
      .VMPower(vm, action)
      .then(
        async () =>
          await showToast({
            style: Toast.Style.Success,
            title: `${VMsInfo.get(vm)?.name}`,
            message: `${MessageActionFinished.get(action)}`,
          })
      )
      .catch(
        async (error) =>
          await showToast({ style: Toast.Style.Failure, title: `${VMsInfo.get(vm)?.name}`, message: `${error}` })
      );
  }

  function GetVMAction(vm: string): JSX.Element {
    return (
      <ActionPanel title="vCenter VM">
        <Action
          title="Show Detail"
          icon={Icon.Eye}
          onAction={() => {
            setShowDetail((prevState) => !prevState);
          }}
        />
        <Action.OpenInBrowser
          title="Open on vCenter Web"
          url={`https://${preferences.vcenter_fqdn}/ui/app/vm;nav=v/urn:vmomi:VirtualMachine:${vm}:${
            VMsInfo.get(vm)?.identity?.instance_uuid
          }/summary`}
          shortcut={{ modifiers: ["cmd"], key: "b" }}
        />
        <Action.Open
          title="Open Console"
          icon={{ source: "icons/vm/console.svg" }}
          target={`vmrc://${preferences.vcenter_fqdn}/?moid=${vm}`}
          shortcut={{ modifiers: ["cmd"], key: "y" }}
        />
        <ActionPanel.Section title="Power">
          <Action
            title="Power On"
            icon={VMPowerActionIcons.get(VMPowerAction.START)}
            onAction={() => VMAction(vm, VMPowerAction.START)}
          />
          <Action
            title="Power Off"
            icon={VMPowerActionIcons.get(VMPowerAction.STOP)}
            onAction={() => VMAction(vm, VMPowerAction.STOP)}
          />
          <Action
            title="Suspend"
            icon={VMPowerActionIcons.get(VMPowerAction.SUSPEND)}
            onAction={() => VMAction(vm, VMPowerAction.SUSPEND)}
          />
          <Action
            title="Reset"
            icon={VMPowerActionIcons.get(VMPowerAction.RESET)}
            onAction={() => VMAction(vm, VMPowerAction.RESET)}
          />
          <Action
            title="Shut Down Guest OS"
            icon={VMGuestPowerActionIcons.get(VMGuestPowerAction.SHUTDOWN)}
            onAction={() => VMGuestAction(vm, VMGuestPowerAction.SHUTDOWN)}
          />
          <Action
            title="Restart Guest OS"
            icon={VMGuestPowerActionIcons.get(VMGuestPowerAction.REBOOT)}
            onAction={() => VMGuestAction(vm, VMGuestPowerAction.REBOOT)}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  function GetVmDetail(vm: string): JSX.Element {
    const vminfo = VMsInfo.get(vm);

    if (!vminfo) return <List.Item.Detail></List.Item.Detail>;

    const cdroms = Object.values(vminfo.cdroms);
    const diskids = Object.keys(vminfo.disks);
    let diskstotal = 0;
    const nics = Object.values(vminfo.nics);

    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Name" text={vminfo.name} />
            <List.Item.Detail.Metadata.Label
              title="Power State"
              icon={PowerModeIconsMetadata.get(vminfo.power_state as VmPowerState)}
              text={PowerModeTextMetadata.get(vminfo.power_state as VmPowerState)}
            />
            <List.Item.Detail.Metadata.Label
              title="OS"
              icon={OsIconsMetadata.get(vminfo.guest_OS as string)}
              text={OsTextMetadata.get(vminfo.guest_OS as string)}
            />
            <List.Item.Detail.Metadata.Label title="Boot" text={`${vminfo.boot.type}`} />
            <List.Item.Detail.Metadata.Label title="Cpu" icon={Icon.ComputerChip} text={`${vminfo.cpu.count} cores`} />
            <List.Item.Detail.Metadata.Label
              title="Memory"
              icon={Icon.MemoryChip}
              text={`${vminfo.memory.size_MiB / 1024} GB`}
            />
            {cdroms.length > 0 &&
              cdroms.map((cdrom) => {
                if (cdrom.backing.iso_file)
                  return (
                    <List.Item.Detail.Metadata.Label
                      title={`${cdrom.label}`}
                      key={`${cdrom.label}`}
                      icon={Icon.Cd}
                      text={cdrom.backing.iso_file}
                    />
                  );
              })}
            <List.Item.Detail.Metadata.Separator />
            {diskids.map((id) => {
              diskstotal = diskstotal + (vminfo.disks[id].capacity as number);
              const storagePolicyFiltered = StoragePolicies.current.filter(
                (policy) => policy.policy === VMsStoragePolicy.get(vm)?.disks[id]
              );
              return (
                <React.Fragment>
                  <List.Item.Detail.Metadata.Label
                    key={`${vminfo.disks[id].label} Capacity`}
                    title={`${vminfo.disks[id].label} Capacity`}
                    icon={Icon.HardDrive}
                    text={`${((vminfo.disks[id].capacity as number) / 1e9).toFixed(0)} GiB`}
                  />
                  {(VMsStoragePolicy.has(vm) || VMsStoragePolicyCompliance.has(vm)) && (
                    <List.Item.Detail.Metadata.TagList title="Storage Policy">
                      {VMsStoragePolicy.has(vm) && (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={`Storage Policy: ${VMsStoragePolicy.get(vm)?.disks[id]}`}
                          text={`${storagePolicyFiltered.length > 0 && storagePolicyFiltered[0].name}`}
                          color={Color.Blue}
                          icon={Icon.CodeBlock}
                        />
                      )}
                      {VMsStoragePolicyCompliance.has(vm) && (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={`Storage Policy Compliance: ${VMsStoragePolicyCompliance.get(vm)?.disks[id].status}`}
                          text={`${VMStoragePolicyComplianceText.get(
                            VMsStoragePolicyCompliance.get(vm)?.disks[id].status as VmStoragePolicyComplianceStatus
                          )}`}
                          icon={`${VMStoragePolicyComplianceIcon.get(
                            VMsStoragePolicyCompliance.get(vm)?.disks[id].status as VmStoragePolicyComplianceStatus
                          )}`}
                          color={
                            VMStoragePolicyComplianceColor.get(
                              VMsStoragePolicyCompliance.get(vm)?.disks[id].status as VmStoragePolicyComplianceStatus
                            ) as Color
                          }
                        />
                      )}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  <List.Item.Detail.Metadata.Separator />
                </React.Fragment>
              );
            })}
            {diskids.length > 1 && (
              <React.Fragment>
                <List.Item.Detail.Metadata.Label
                  key="Total Disks Capacity"
                  title="Total Disks Capacity"
                  icon={Icon.HardDrive}
                  text={`${(diskstotal / 1e9).toFixed(0)} GiB`}
                />
                <List.Item.Detail.Metadata.Separator />
              </React.Fragment>
            )}
            {nics.map((nic) => {
              const guestNetworkingInterfaces = VMsGuestNetworkingInterfaces.get(vm)?.filter(
                (nicGuest) => nicGuest.mac_address === nic.mac_address
              );
              return (
                <React.Fragment>
                  <List.Item.Detail.Metadata.Label
                    key={nic.label}
                    title={`${nic.label}`}
                    icon={Icon.Network}
                    text={`${GetNetworkName(nic.backing.network)}`}
                  />
                  {guestNetworkingInterfaces && guestNetworkingInterfaces.length > 0 && (
                    <List.Item.Detail.Metadata.TagList title="IPs">
                      {guestNetworkingInterfaces &&
                        guestNetworkingInterfaces.length > 0 &&
                        guestNetworkingInterfaces[0].ip?.ip_addresses.map((ip) => {
                          return (
                            <List.Item.Detail.Metadata.TagList.Item
                              key={`${ip.ip_address}`}
                              text={`${ip.ip_address}`}
                            />
                          );
                        })}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  <List.Item.Detail.Metadata.Separator />
                </React.Fragment>
              );
            })}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  React.useEffect(() => {
    if (selectedVM) {
      setIsLoading(true);
      if (!VMsInfo.has(selectedVM)) {
        vCenterApi
          .GetVM(selectedVM)
          .then((vm) => {
            if (vm)
              setVMsInfo((prevState) => {
                prevState.set(selectedVM, vm);
                return new Map([...prevState]);
              });
          })
          .catch(async (error) => {
            await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
          });
      }
      if (!VMsGuestNetworkingInterfaces.has(selectedVM) && showDetail) {
        vCenterApi
          .GetVMGuestNetworkingInterfaces(selectedVM)
          .then((interfaces) => {
            if (interfaces)
              setVMsGuestNetworkingInterfaces((prevState) => {
                prevState.set(selectedVM, interfaces);
                return new Map([...prevState]);
              });
          })
          .catch(async (error) => {
            await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
          });
      }
      if (!VMsStoragePolicy.has(selectedVM) && showDetail) {
        vCenterApi
          .GetVMStoragePolicy(selectedVM)
          .then((policy) => {
            if (policy)
              if (policy)
                setVMsStoragePolicy((prevState) => {
                  prevState.set(selectedVM, policy);
                  return new Map([...prevState]);
                });
          })
          .catch(async (error) => {
            await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
          });
      }
      if (!VMsStoragePolicyCompliance.has(selectedVM) && showDetail) {
        vCenterApi
          .GetVMStoragePolicyCompliance(selectedVM)
          .then((policy) => {
            if (policy)
              if (policy)
                setVMsStoragePolicyCompliance((prevState) => {
                  prevState.set(selectedVM, policy);
                  return new Map([...prevState]);
                });
          })
          .catch(async (error) => {
            await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
          });
      }
      setIsLoading(false);
    }
  }, [selectedVM, showDetail]);

  React.useEffect(() => {
    setIsLoading(true);
    vCenterApi
      .ListVM()
      .then((vms) => {
        if (vms) {
          setVMs([...vms]);
        }
      })
      .catch(async (error) => {
        await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
      });
    vCenterApi
      .GetNetworks()
      .then((networks) => {
        if (networks) {
          Networks.current = networks;
        }
      })
      .catch(async (error) => {
        await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
      });
    vCenterApi
      .GetStoragePolicy()
      .then((policies) => {
        if (policies) {
          StoragePolicies.current = policies;
        }
      })
      .catch(async (error) => {
        await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
      });
    setIsLoading(false);
  }, []);

  if (!VMs && !Networks.current && !StoragePolicies.current) return <List isLoading={isLoading}></List>;

  return (
    <List
      isLoading={isLoading}
      onSelectionChange={(id: string | null) => {
        setSelectedVM(id as string);
      }}
      isShowingDetail={showDetail}
    >
      {!isLoading &&
        VMs.map((vm) => (
          <List.Item
            key={vm.vm}
            id={vm.vm}
            title={vm.name}
            icon={PowerModeIcons.get(vm.power_state)}
            detail={GetVmDetail(vm.vm)}
            actions={GetVMAction(vm.vm)}
          />
        ))}
    </List>
  );
}
