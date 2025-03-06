import {
  Vm,
  VmPowerState,
  NetworkSummary,
  VMGuestPowerAction,
  VMPowerAction,
  StoragePoliciesSummary,
  VmStoragePolicyComplianceStatus,
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
import { GetServer, GetSelectedServer, GetServerLocalStorage, CacheMergeVMs } from "./api/function";
import * as React from "react";
import {
  List,
  Toast,
  Icon,
  Action,
  ActionPanel,
  showToast,
  Color,
  LocalStorage,
  Cache,
  getPreferenceValues,
  open,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import ServerView from "./api/ServerView";
import { vCenter } from "./api/vCenter";

const pref = getPreferenceValues();
if (!pref.certificate) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const cache = new Cache();

export default function Command(): JSX.Element {
  const { data: Server, revalidate: RevalidateServer, isLoading: IsLoadingServer } = usePromise(GetServer);
  const {
    data: ServerLocalStorage,
    revalidate: RevalidateServerLocalStorage,
    isLoading: IsLoadingServerLocalStorage,
  } = usePromise(GetServerLocalStorage);
  const {
    data: ServerSelected,
    revalidate: RevalidateServerSelected,
    isLoading: IsLoadingServerSelected,
  } = usePromise(GetSelectedServer);

  const [VMs, SetVMs]: [Vm[], React.Dispatch<React.SetStateAction<Vm[]>>] = React.useState([] as Vm[]);
  const [IsLoadingVMs, SetIsLoadingVMs]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);
  const CacheVMs: React.MutableRefObject<Map<string, Date>> = React.useRef(new Map());
  const [SelectedVM, SetSelectedVM]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");

  const [Networks, SetNetworks]: [
    Map<string, NetworkSummary[]>,
    React.Dispatch<React.SetStateAction<Map<string, NetworkSummary[]>>>
  ] = React.useState(new Map());
  const [IsLoadingNetworks, SetIsLoadingNetworks]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);

  const [StoragePolicies, SetStoragePolicies]: [
    Map<string, StoragePoliciesSummary[]>,
    React.Dispatch<React.SetStateAction<Map<string, StoragePoliciesSummary[]>>>
  ] = React.useState(new Map());
  const [IsLoadingStoragePolicies, SetIsLoadingStoragePolicies]: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>
  ] = React.useState(false);

  const [showDetail, setShowDetail]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);

  /**
   * Preload VMs from cache and when api data is received merge cache and api data and save to cache.
   * @returns {Promise<void>}
   */
  async function GetVMs(): Promise<void> {
    if (Server && ServerSelected) {
      SetIsLoadingVMs(true);

      let cached: Vm[] | undefined;
      const cachedj = cache.get(`vm_${ServerSelected}_vms`);
      if (cachedj) cached = JSON.parse(cachedj);
      if (VMs.length === 0 && cached) SetVMs(cached);

      let s: Map<string, vCenter> = Server;
      if (ServerSelected !== "All") s = new Map([...s].filter(([k]) => k === ServerSelected));

      const vms: Vm[] = [];
      await Promise.all(
        [...s].map(async ([k, s]) => {
          const vmSummary = await s.ListVM().catch(async (err) => {
            await showToast({ style: Toast.Style.Failure, title: `${k} - Get VMs:`, message: `${err}` });
          });
          if (vmSummary) vms.push(...CacheMergeVMs(k, cached, vmSummary));
        })
      );

      if (vms.length > 0) {
        SetVMs(vms);
        cache.set(`vm_${ServerSelected}_vms`, JSON.stringify(vms));
      }

      SetIsLoadingVMs(false);
    }
  }

  /**
   * Preload Networks from cache and when api data is received replace data and save to cache.
   * @returns {Promise<void>}
   */
  async function GetNetworks(): Promise<void> {
    if (Server && ServerSelected) {
      SetIsLoadingNetworks(true);

      if ([...Networks.keys()].length === 0) {
        const cached = cache.get(`vm_${ServerSelected as string}_networks`);
        if (cached) SetNetworks(new Map(Object.entries(JSON.parse(cached))));
      }

      let s: Map<string, vCenter> = Server;
      if (ServerSelected !== "All") s = new Map([...s].filter(([k]) => k === ServerSelected));

      const networks: Map<string, NetworkSummary[]> = new Map();
      await Promise.all(
        [...s].map(async ([k, s]) => {
          const o = await s.ListNetwork().catch(async (err) => {
            await showToast({ style: Toast.Style.Failure, title: `${k} - Get Networks:`, message: `${err}` });
          });
          if (o) networks.set(k, o);
        })
      );
      if ([...networks.keys()].length > 0) {
        SetNetworks(networks);
        cache.set(`vm_${ServerSelected as string}_networks`, JSON.stringify(Object.fromEntries(networks)));
      }

      SetIsLoadingNetworks(false);
    }
  }

  /**
   * Preload Storage Policies from cache and when api data is received replace data and save to cache.
   * @returns {Promise<void>}
   */
  async function GetStoragePolicies(): Promise<void> {
    if (Server && ServerSelected) {
      SetIsLoadingStoragePolicies(true);

      if ([...StoragePolicies.keys()].length === 0) {
        const cached = cache.get(`vm_${ServerSelected as string}_storage_policies`);
        if (cached) SetStoragePolicies(new Map(Object.entries(JSON.parse(cached))));
      }

      let s: Map<string, vCenter> = Server;
      if (ServerSelected !== "All") s = new Map([...s].filter(([k]) => k === ServerSelected));

      const storagePolicies: Map<string, StoragePoliciesSummary[]> = new Map();
      await Promise.all(
        [...s].map(async ([k, s]) => {
          const o = await s.GetStoragePolicy().catch(async (err) => {
            await showToast({ style: Toast.Style.Failure, title: `${k} - 'Get Storage':`, message: `${err}` });
          });
          if (o) storagePolicies.set(k, o);
        })
      );

      if ([...storagePolicies.keys()].length > 0) {
        SetStoragePolicies(storagePolicies);
        cache.set(
          `vm_${ServerSelected as string}_storage_policies`,
          JSON.stringify(Object.fromEntries(storagePolicies))
        );
      }

      SetIsLoadingStoragePolicies(false);
    }
  }

  /**
   * Get Network Name.
   * @param {string} server - vCenter Server Name.
   * @param {string} network - Network Identifier.
   * @returns
   */
  function GetNetworkName(server: string, network: string): string {
    if (Networks && Networks.has(server)) {
      const filter = Networks.get(server)?.filter((net) => net.network === network);
      if (filter && filter.length > 0) return filter[0].name;
    }
    return network;
  }

  /**
   * Perform Power Action on VM Using Guest Tools.
   * @param {Vm} vm.
   * @param {VMGuestPowerAction} action - action to perform.
   */
  async function VMGuestAction(vm: Vm, action: VMGuestPowerAction): Promise<void> {
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
    if (!Server || !Server.has(vm.server)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "vCenter Server is Undefined",
      });
      return;
    }
    const s = Server.get(vm.server);
    if (s) {
      await showToast({
        style: Toast.Style.Animated,
        title: `${vm.summary.name}`,
        message: `${MessageGuestActionStarted.get(action)}`,
      });
      await s
        .VMGuestPower(vm.summary.vm, action)
        .then(
          async () =>
            await showToast({
              style: Toast.Style.Success,
              title: `${vm.summary.name}`,
              message: `${MessageGuestActionFinished.get(action)}`,
            })
        )
        .catch(
          async (error) =>
            await showToast({ style: Toast.Style.Failure, title: `${vm.summary.name}`, message: `${error}` })
        );
    }
  }

  /**
   * Update Vm info if 'showDetail' is true and vm data is not present or outdated (not updated in the last 5 minutes).
   * @param {(string|null)} id - vm identifier.
   * @param {boolean} [forced=true] - set to true for force update ignoring 'showDetail'.
   * @returns {Promise<void>}
   */
  async function GetVmInfo(id: string | null, forced = false): Promise<void> {
    if (id) SetSelectedVM(id);
    if (id && (showDetail || forced) && Server) {
      const now = new Date();
      const lastUpdate = CacheVMs.current.get(id);
      if (forced || !lastUpdate || lastUpdate.getTime() - now.getTime() < -300000) {
        SetIsLoadingVMs(true);
        const ids = id.split("_");
        const s = Server.get(ids[0]);
        const v = ids[1];
        if (s) {
          const vm_info = await s.GetVM(v).catch(async (err) => {
            await showToast({ style: Toast.Style.Failure, title: `${ids[0]}`, message: `${err}` });
          });
          const interfaces_info = await s.GetVMGuestNetworkingInterfaces(v).catch(async (err) => {
            await showToast({ style: Toast.Style.Failure, title: `${ids[0]}`, message: `${err}` });
          });
          const storage_policy_info = await s.GetVMStoragePolicy(v).catch(async (err) => {
            await showToast({ style: Toast.Style.Failure, title: `${ids[0]}`, message: `${err}` });
          });
          const storage_policy_compliance_info = await s.GetVMStoragePolicyCompliance(v).catch(async (err) => {
            await showToast({ style: Toast.Style.Failure, title: `${ids[0]}`, message: `${err}` });
          });
          SetVMs((prev) => {
            const i = prev.findIndex((vm) => vm.server === ids[0] && vm.summary.vm === v);
            if (i > -1) {
              if (vm_info) prev[i].vm_info = vm_info;
              if (interfaces_info) prev[i].interfaces_info = interfaces_info;
              if (storage_policy_info) prev[i].storage_policy_info = storage_policy_info;
              if (storage_policy_compliance_info)
                prev[i].storage_policy_compliance_info = storage_policy_compliance_info;
            }
            cache.set(`vm_${ServerSelected}_vms`, JSON.stringify(prev));
            return [...prev];
          });
          SetIsLoadingVMs(false);
          CacheVMs.current.set(id, now);
        }
      }
    }
  }

  /**
   * Perform Power Action on VM.
   * @param {Vm} vm.
   * @param {VMPowerAction} action - action to perform.
   */
  async function VMAction(vm: Vm, action: VMPowerAction): Promise<void> {
    const MessageActionStarted: Map<VMPowerAction, string> = new Map([
      [VMPowerAction.RESET, `Rebooting`],
      [VMPowerAction.START, `Starting`],
      [VMPowerAction.STOP, `Shutting Down`],
      [VMPowerAction.SUSPEND, `Suspending`],
    ]);
    const MessageActionFinished: Map<VMPowerAction, string> = new Map([
      [VMPowerAction.RESET, `Rebooted`],
      [VMPowerAction.START, `Powered On`],
      [VMPowerAction.STOP, `Powered Off`],
      [VMPowerAction.SUSPEND, `Suspended`],
    ]);
    if (!Server || !Server.has(vm.server)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "vCenter Server is Undefined",
      });
      return;
    }
    const s = Server.get(vm.server);
    if (s) {
      await showToast({
        style: Toast.Style.Animated,
        title: `${vm.summary.name}`,
        message: `${MessageActionStarted.get(action)}`,
      });
      await s
        .VMPower(vm.summary.vm, action)
        .then(
          async () =>
            await showToast({
              style: Toast.Style.Success,
              title: `${vm.summary.name}`,
              message: `${MessageActionFinished.get(action)}`,
            })
        )
        .catch(
          async (error) =>
            await showToast({ style: Toast.Style.Failure, title: `${vm.summary.name}`, message: `${error}` })
        );
    }
  }

  /**
   * Generate Console Ticket. If the ticket can't be generated it fallback to standard vmrc url requiring authentication.
   * @param {Vm} vm.
   */
  async function VMOpenConsole(vm: Vm): Promise<void> {
    if (!Server || !Server.has(vm.server)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "vCenter Server is Undefined",
      });
      return;
    }
    const s = Server.get(vm.server);
    if (s) {
      await showToast({
        style: Toast.Style.Animated,
        title: `${vm.summary.name}`,
        message: `Requesting Console Ticket`,
      });
      await s
        .VMCreateConsoleTickets(vm.summary.vm)
        .then(async (ticket) => {
          if (ticket) {
            await showToast({
              style: Toast.Style.Success,
              title: `${vm.summary.name}`,
              message: `Console Ticket Generated`,
            });
            console.log(ticket.ticket);
            open(ticket.ticket);
          }
        })
        .catch(async (error) => {
          await showToast({ style: Toast.Style.Failure, title: `${vm.summary.name}`, message: `${error}` });
          open(`vmrc://${Server.get(vm.server)?.GetFqdn()}/?moid=${vm.summary.vm}`);
        });
    }
  }

  /**
   * Change Selected Server and save state on LocalStorage.
   * @param {string} value - Server Name.
   * @returns {Promise<void>}
   */
  async function ChangeSelectedServer(value: string): Promise<void> {
    await LocalStorage.setItem("server_selected", value);
    SetVMs([]);
    SetNetworks(new Map());
    SetStoragePolicies(new Map());
    RevalidateServerSelected();
  }

  /**
   * Delete Selected Server from LocalStorage.
   * @returns {Promise<void>}
   */
  async function DeleteSelectedServer(): Promise<void> {
    if (Server && [...Server.keys()].length > 1) {
      const OldServer = await GetServerLocalStorage();
      if (OldServer) {
        const NewServer = OldServer.filter((c) => {
          return c.name !== ServerSelected;
        });
        const NewServerSelected = NewServer[0].name;
        await LocalStorage.setItem("server", JSON.stringify(NewServer));
        await LocalStorage.setItem("server_selected", NewServerSelected);
      }
    } else if (Server) {
      await LocalStorage.removeItem("server");
      await LocalStorage.removeItem("server_selected");
    }
    RevalidateServer();
    RevalidateServerLocalStorage();
    RevalidateServerSelected();
  }

  /**
   * Search Bar Accessory
   * @param {Map<string, vCenter>} server.
   * @returns {JSX.Element}
   */
  function GetSearchBar(server: Map<string, vCenter>): JSX.Element {
    const keys = [...server.keys()];
    if (keys.length > 1) keys.unshift("All");
    return (
      <List.Dropdown
        tooltip="Available Server"
        onChange={ChangeSelectedServer}
        defaultValue={ServerSelected ? ServerSelected : undefined}
      >
        {keys.map((s) => (
          <List.Dropdown.Item title={s} value={s} />
        ))}
      </List.Dropdown>
    );
  }

  /**
   * Additional Keywords for search.
   * @param {Vm} vm.
   * @returns {string[]} Array of search keywords
   */
  function GetVmKeywords(vm: Vm): string[] {
    const k: string[] = [];
    if (vm.vm_info?.guest_OS) k.push(vm.vm_info.guest_OS);
    if (vm.interfaces_info)
      vm.interfaces_info.forEach((i) => {
        if (i.ip) i.ip.ip_addresses.forEach((a) => k.push(a.ip_address));
      });
    return k;
  }

  /**
   * Accessory List.
   * @param {Vm} vm.
   * @returns {List.Item.Accessory[]}
   */
  function GetVmAccessory(vm: Vm): List.Item.Accessory[] {
    const a: List.Item.Accessory[] = [];
    if (ServerSelected === "All") a.push({ tag: vm.server, icon: Icon.Building });
    if (vm.vm_info?.guest_OS) a.push({ icon: OsIconsMetadata.get(vm.vm_info.guest_OS as string) });
    return a;
  }

  /**
   * Action Menu.
   * @param {Vm} vm.
   * @returns {JSX.Element}
   */
  function GetVMAction(vm?: Vm): JSX.Element {
    if (vm)
      return (
        <ActionPanel title="vCenter VM">
          <Action
            title={showDetail ? "Hide Detail" : "Show Detail"}
            icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
            onAction={() => {
              setShowDetail((prevState) => !prevState);
            }}
          />
          {!IsLoadingVMs && (
            <Action
              title="Refresh"
              icon={Icon.Repeat}
              onAction={() => GetVmInfo(SelectedVM, true)}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          {vm.vm_info && Server && Server.has(vm.server) && (
            <Action.OpenInBrowser
              title="Open on vCenter Web"
              url={`https://${Server.get(vm.server)?.GetFqdn()}/ui/app/vm;nav=v/urn:vmomi:VirtualMachine:${
                vm.summary.vm
              }:${vm.vm_info.identity?.instance_uuid}/summary`}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          )}
          {Server && Server.has(vm.server) && (
            <Action
              title="Open Console"
              icon={{ source: "icons/vm/console.svg" }}
              onAction={() => VMOpenConsole(vm)}
              shortcut={{ modifiers: ["cmd"], key: "y" }}
            />
          )}
          {vm.interfaces_info &&
            vm.interfaces_info.length > 0 &&
            vm.interfaces_info[0].ip?.ip_addresses &&
            vm.interfaces_info[0].ip.ip_addresses.length > 0 && (
              <Action.Open
                title="Open Rdp"
                icon={{ source: Icon.Binoculars }}
                target={`rdp://full%20address=s%3A${vm.interfaces_info[0].ip?.ip_addresses[0].ip_address}`}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
              />
            )}
          <Action.CopyToClipboard
            title="Copy Name"
            icon={Icon.Clipboard}
            content={vm.summary.name as string}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          {vm.interfaces_info && vm.interfaces_info.length > 0 && (
            <Action.CopyToClipboard
              title="Copy IP"
              icon={Icon.Clipboard}
              content={vm.interfaces_info[0].ip?.ip_addresses[0].ip_address as string}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          )}
          {Server && Server.has(vm.server) && (
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
          )}
          <ActionPanel.Section title="vCenter Server">
            {!IsLoadingServerLocalStorage && (
              <Action
                title="Add Server"
                icon={Icon.NewDocument}
                onAction={() => {
                  SetShowServerView(true);
                }}
              />
            )}
            {ServerSelected !== "All" &&
              !IsLoadingServerLocalStorage &&
              ServerLocalStorage &&
              !IsLoadingServerSelected &&
              ServerSelected && (
                <Action title="Edit Server" icon={Icon.Pencil} onAction={() => SetShowServerViewEdit(true)} />
              )}
            {ServerSelected !== "All" && (
              <Action title="Delete Server" icon={Icon.DeleteDocument} onAction={DeleteSelectedServer} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      );

    return (
      <ActionPanel title="vCenter VM">
        {!IsLoadingVMs && (
          <Action title="Refresh" icon={Icon.Repeat} onAction={GetVMs} shortcut={{ modifiers: ["cmd"], key: "r" }} />
        )}
        <ActionPanel.Section title="vCenter Server">
          {!IsLoadingServerLocalStorage && (
            <Action
              title="Add Server"
              icon={Icon.NewDocument}
              onAction={() => {
                SetShowServerView(true);
              }}
            />
          )}
          {ServerSelected !== "All" &&
            !IsLoadingServerLocalStorage &&
            ServerLocalStorage &&
            !IsLoadingServerSelected &&
            ServerSelected && (
              <Action title="Edit Server" icon={Icon.Pencil} onAction={() => SetShowServerViewEdit(true)} />
            )}
          {ServerSelected !== "All" && (
            <Action title="Delete Server" icon={Icon.DeleteDocument} onAction={DeleteSelectedServer} />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  /**
   * Detail Section.
   * @param {string} vm - vm identifier.
   * @returns {JSX.Element}
   */
  function GetVmDetail(vm: Vm): JSX.Element {
    if (!vm.vm_info) return <List.Item.Detail></List.Item.Detail>;

    const cdroms = Object.values(vm.vm_info.cdroms);
    const diskids = Object.keys(vm.vm_info.disks);
    let diskstotal = 0;
    const nics = Object.values(vm.vm_info.nics);

    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Name" text={vm.vm_info.name} />
            <List.Item.Detail.Metadata.Label
              title="Power State"
              icon={PowerModeIconsMetadata.get(vm.vm_info.power_state as VmPowerState)}
              text={PowerModeTextMetadata.get(vm.vm_info.power_state as VmPowerState)}
            />
            <List.Item.Detail.Metadata.Label
              title="OS"
              icon={OsIconsMetadata.get(vm.vm_info.guest_OS as string)}
              text={OsTextMetadata.get(vm.vm_info.guest_OS as string)}
            />
            <List.Item.Detail.Metadata.Label title="Boot" text={`${vm.vm_info.boot.type}`} />
            <List.Item.Detail.Metadata.Label
              title="Cpu"
              icon={Icon.ComputerChip}
              text={`${vm.vm_info.cpu.count} cores`}
            />
            <List.Item.Detail.Metadata.Label
              title="Memory"
              icon={Icon.MemoryChip}
              text={`${vm.vm_info.memory.size_MiB / 1024} GB`}
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
              if (vm.vm_info) diskstotal = diskstotal + (vm.vm_info.disks[id].capacity as number);
              const storagePolicyFiltered =
                StoragePolicies && StoragePolicies.get(vm.server)
                  ? StoragePolicies.get(vm.server)?.filter((policy) =>
                      vm.storage_policy_info ? policy.policy === vm.storage_policy_info.disks[id] : false
                    )
                  : [];
              return (
                <React.Fragment>
                  {vm.vm_info && (
                    <List.Item.Detail.Metadata.Label
                      key={`${vm.vm_info.disks[id].label} Capacity`}
                      title={`${vm.vm_info.disks[id].label} Capacity`}
                      icon={Icon.HardDrive}
                      text={`${((vm.vm_info.disks[id].capacity as number) / 1e9).toFixed(0)} GiB`}
                    />
                  )}
                  {(vm.storage_policy_info || vm.storage_policy_compliance_info) && (
                    <List.Item.Detail.Metadata.TagList title="Storage Policy">
                      {vm.storage_policy_info && storagePolicyFiltered && storagePolicyFiltered.length > 0 && (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={`Storage Policy: ${vm.storage_policy_info.disks[id]}`}
                          text={`${storagePolicyFiltered[0].name}`}
                          color={Color.Blue}
                          icon={Icon.CodeBlock}
                        />
                      )}
                      {vm.storage_policy_compliance_info && vm.storage_policy_compliance_info.disks[id] && (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={`Storage Policy Compliance: ${vm.storage_policy_compliance_info.disks[id].status}`}
                          text={`${VMStoragePolicyComplianceText.get(
                            vm.storage_policy_compliance_info.disks[id].status as VmStoragePolicyComplianceStatus
                          )}`}
                          icon={`${VMStoragePolicyComplianceIcon.get(
                            vm.storage_policy_compliance_info.disks[id].status as VmStoragePolicyComplianceStatus
                          )}`}
                          color={
                            VMStoragePolicyComplianceColor.get(
                              vm.storage_policy_compliance_info.disks[id].status as VmStoragePolicyComplianceStatus
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
              const guestNetworkingInterfaces =
                vm.interfaces_info && vm.interfaces_info.filter((nicGuest) => nicGuest.mac_address === nic.mac_address);
              return (
                <React.Fragment>
                  <List.Item.Detail.Metadata.Label
                    key={nic.label}
                    title={`${nic.label}`}
                    icon={Icon.Network}
                    text={`${GetNetworkName(vm.server, nic.backing.network)}`}
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
    if (Server && !IsLoadingServer && ServerSelected && !IsLoadingServerSelected) {
      GetVMs();
      GetNetworks();
      GetStoragePolicies();
    } else if (Server && !IsLoadingServer && !ServerSelected && !IsLoadingServerSelected) {
      const name = [...Server.keys()][0];
      LocalStorage.setItem("server_selected", name);
      RevalidateServerSelected();
    } else if (!IsLoadingServer && !Server) {
      SetShowServerView(true);
    }
  }, [Server, IsLoadingServer, ServerSelected, IsLoadingServerSelected]);

  React.useEffect(() => {
    if (showDetail === true) GetVmInfo(SelectedVM);
  }, [showDetail]);

  const [ShowServerView, SetShowServerView] = React.useState(false);
  const [ShowServerViewEdit, SetShowServerViewEdit] = React.useState(false);

  React.useEffect(() => {
    if (!ShowServerView || !ShowServerViewEdit) {
      RevalidateServer();
      RevalidateServerLocalStorage();
      RevalidateServerSelected();
    }
  }, [ShowServerView, ShowServerViewEdit]);

  if (ShowServerView) return <ServerView SetShowView={SetShowServerView} Server={ServerLocalStorage} />;
  if (ShowServerViewEdit && ServerLocalStorage && ServerSelected)
    return (
      <ServerView SetShowView={SetShowServerViewEdit} Server={ServerLocalStorage} ServerSelected={ServerSelected} />
    );

  return (
    <List
      isLoading={IsLoadingVMs || IsLoadingNetworks || IsLoadingStoragePolicies}
      isShowingDetail={showDetail}
      actions={GetVMAction()}
      searchBarAccessory={Server && GetSearchBar(Server)}
      throttle={true}
      onSelectionChange={GetVmInfo}
    >
      {VMs.map((vm) => (
        <List.Item
          key={`${vm.server}_${vm.summary.vm}`}
          id={`${vm.server}_${vm.summary.vm}`}
          title={vm.summary.name}
          icon={PowerModeIcons.get(vm.summary.power_state)}
          accessories={GetVmAccessory(vm)}
          keywords={GetVmKeywords(vm)}
          detail={GetVmDetail(vm)}
          actions={GetVMAction(vm)}
        />
      ))}
    </List>
  );
}
