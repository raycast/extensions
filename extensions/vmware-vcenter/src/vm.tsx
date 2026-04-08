import {
  Vm,
  VmPowerState,
  NetworkSummary,
  VMGuestPowerAction,
  VMPowerAction,
  StoragePoliciesSummary,
  VmStoragePolicyComplianceStatus,
  VmGuestNetworkingInterfacesInfo,
  VMInfo,
  VMStoragePolicyComplianceInfo,
  VmStoragePolicyInfo,
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
import {
  GetServerNames,
  GetCachedVMs,
  GetServerConfig,
  GetCachedNetworkSummary,
  GetCachedStoragePolicies,
  RemoveServerConfig,
} from "./api/function";
import { Shortcut } from "./api/shortcut";
import * as React from "react";
import {
  List,
  Toast,
  Icon,
  Action,
  ActionPanel,
  showToast,
  Color,
  Cache,
  getPreferenceValues,
  open,
  getApplications,
} from "@raycast/api";
import { runPowerShellScript, usePromise } from "@raycast/utils";
import ServerView from "./api/ServerView";
import { vCenter } from "./api/vCenter";

const pref = getPreferenceValues();
if (!pref.certificate) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const cache = new Cache();

export default function Command(): JSX.Element {
  const {
    data: ServerNames,
    revalidate: RevalidateServerNames,
    isLoading: IsLoadingServerNames,
  } = usePromise(GetServerNames);
  const SelectedServerName = React.useRef<string>("");

  const [VMs, SetVMs]: [Vm[], React.Dispatch<React.SetStateAction<Vm[]>>] = React.useState([] as Vm[]);
  const [IsLoadingVMs, SetIsLoadingVMs]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);

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
   * Load VMs List.
   */
  async function LoadVMs(serverNames: string[], useCache = true): Promise<void> {
    SetIsLoadingVMs(true);

    const now = Date.now();

    /* Set Cache Expiration to 1h */
    const cacheExpiration = now + 60 * 60 * 1000;

    /* Set Server Names with Data Expired */
    let serverNamesCacheExpired = Array.of<string>();

    /* Load Data from Cache */
    const dataCache = Array.of<Vm>();
    for (const serverName of serverNames) {
      const value = GetCachedVMs(serverName);
      if (value) {
        dataCache.push(...value);
        /* Validate Cache Expiration */
        const expiration = value.at(-1)?.cache_expiration;
        if (!expiration || now > expiration) serverNamesCacheExpired.push(serverName);
      } else {
        serverNamesCacheExpired.push(serverName);
      }
    }

    /* If useCache setVMs with Cached Data */
    if (useCache) {
      SetVMs(dataCache);
    } else {
      serverNamesCacheExpired = serverNames;
    }

    /* Skip Load Data from API if all data are fresh */
    if (serverNamesCacheExpired.length === 0) {
      SetIsLoadingVMs(false);
      return;
    }

    /* Load Data from API */
    let dataFresh = Array.of<Vm>();
    const fetchVM = async (server: string) => {
      const output = Array.of<Vm>();

      /* Init vCenter Client */
      const serverConfig = await GetServerConfig(server);
      const client = new vCenter(serverConfig.server, serverConfig.username, serverConfig.password);

      /* Get VMs */
      try {
        const dataVmList = await client.ListVM();

        const fetchDetail = async (vm: Vm, delay: number) => {
          const id = vm.summary.vm;
          await new Promise((resolve) => setTimeout(resolve, delay));
          vm.vm_info = await client.GetVM(id).catch((error) => {
            console.warn(`Server: '${server}, Vm: '${vm.summary.name}', ${error}'`);
            return undefined;
          });
          vm.storage_policy_info = await client.GetVMStoragePolicy(id).catch((error) => {
            console.warn(`Server: '${server}, Vm: '${vm.summary.name}', ${error}'`);
            return undefined;
          });
          vm.storage_policy_compliance_info = await client.GetVMStoragePolicyCompliance(id).catch((error) => {
            console.warn(`Server: '${server}, Vm: '${vm.summary.name}', ${error}'`);
            return undefined;
          });
          vm.interfaces_info = await client.GetVMGuestNetworkingInterfaces(id).catch((error) => {
            console.warn(`Server: '${server}, Vm: '${vm.summary.name}', ${error}'`);
            return undefined;
          });
          return vm;
        };

        /* Get VMs Info, StoragePolicy, StoragePolicyCompliance and NetworkingINterfaces */
        const delayMs = 500;
        const delayBatch = 40;
        const promises = Array.of<Promise<Vm>>();
        if (dataVmList)
          for (const [index, dataVm] of dataVmList.entries()) {
            const vm: Vm = { server: server, summary: dataVm, cache_expiration: cacheExpiration };
            promises.push(fetchDetail(vm, Math.trunc((index / delayBatch) * delayMs)));
          }
        const responses = await Promise.allSettled(promises);
        for (const resp of responses) if (resp.status === "fulfilled") output.push(resp.value);
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: `${server} - Get VMs:`, message: `${error}` });
        throw error;
      }
      return output;
    };
    const promises = await Promise.allSettled(serverNamesCacheExpired.map((name) => fetchVM(name)));
    for (const resp of promises) if (resp.status === "fulfilled") dataFresh = [...dataFresh, ...resp.value];

    /* Merge Cache and Fresh Data */
    let dataMerged = Array.of<Vm>();
    for (const server of serverNames) {
      if (serverNamesCacheExpired.findIndex((value) => value === server) !== -1) {
        const data = dataFresh.filter((value) => value.server === server);
        if (data.length > 0) {
          dataMerged = [...dataMerged, ...data];
          continue;
        }
      }
      dataMerged = [...dataMerged, ...dataCache.filter((value) => value.server === server)];
    }

    /* SetVMs and Save to Cache */
    SetVMs(dataMerged);
    SetIsLoadingVMs(false);
    for (const server of serverNames) {
      cache.set(`vm_${server}_vms`, JSON.stringify(dataMerged.filter((value) => value.server === server)));
    }
  }

  /**
   * Preload Networks from cache and when api data is received replace data and save to cache.
   * @returns {Promise<void>}
   */
  async function LoadNetworks(serverNames: string[]): Promise<void> {
    SetIsLoadingNetworks(true);

    /* Load Data from Cache */
    const dataCache = new Map<string, NetworkSummary[]>();
    for (const server of serverNames) {
      const data = GetCachedNetworkSummary(server);
      if (data) dataCache.set(server, data);
    }

    /* Load Data from API */
    const dataFresh = new Map<string, NetworkSummary[]>();
    const fetchNetwork = async (server: string) => {
      const output = Array.of<[string, NetworkSummary[]]>();

      /* Init vCenter Client */
      const serverConfig = await GetServerConfig(server);
      const client = new vCenter(serverConfig.server, serverConfig.username, serverConfig.password);

      /* Fetch Data */
      try {
        const data = await client.ListNetwork();
        if (data) output.push([server, data]);
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: `${server} - Get Networks:`, message: `${error}` });
      }

      return output;
    };
    const promises = await Promise.allSettled(serverNames.map((server) => fetchNetwork(server)));
    for (const resp of promises) {
      if (resp.status === "fulfilled") {
        const data = resp.value.at(0);
        if (data) dataFresh.set(data[0], data[1]);
      }
    }

    /* Merge Cache and Fresh Data */
    const dataMerged = new Map<string, NetworkSummary[]>();
    for (const server of serverNames) {
      /* Get Fresh Data if defined */
      if (dataFresh.has(server)) {
        const value = dataFresh.get(server);
        if (value) {
          dataMerged.set(server, value);
          continue;
        }
      }
      /* Cache Fallback */
      if (dataCache.has(server)) {
        const value = dataCache.get(server);
        if (value) dataMerged.set(server, value);
      }
    }

    /* SetNetworks and Save to Cache */
    SetNetworks(dataMerged);
    SetIsLoadingNetworks(false);
    for (const server of serverNames) {
      if (dataFresh.has(server)) {
        const value = dataFresh.get(server);
        if (value) cache.set(`vm_${server}_networks`, JSON.stringify(value));
      }
    }
  }

  /**
   * Preload Storage Policies from cache and when api data is received replace data and save to cache.
   * @returns {Promise<void>}
   */
  async function LoadStoragePolicies(serverNames: string[]): Promise<void> {
    SetIsLoadingStoragePolicies(true);

    /* Load Data from Cache */
    const dataCache = new Map<string, StoragePoliciesSummary[]>();
    for (const server of serverNames) {
      const data = GetCachedStoragePolicies(server);
      if (data) dataCache.set(server, data);
    }

    /* Load Data from API */
    const dataFresh = new Map<string, StoragePoliciesSummary[]>();
    const fetchStoragePolicy = async (server: string) => {
      const output = Array.of<[string, StoragePoliciesSummary[]]>();

      /* Init vCenter Client */
      const serverConfig = await GetServerConfig(server);
      const client = new vCenter(serverConfig.server, serverConfig.username, serverConfig.password);

      /* Fetch Data */
      try {
        const data = await client.GetStoragePolicy();
        if (data) output.push([server, data]);
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: `${server} - Get StoragePolicy:`, message: `${error}` });
      }

      return output;
    };
    const promises = await Promise.allSettled(serverNames.map((server) => fetchStoragePolicy(server)));
    for (const resp of promises) {
      if (resp.status === "fulfilled") {
        const data = resp.value.at(0);
        if (data) dataFresh.set(data[0], data[1]);
      }
    }

    /* Merge Cache and Fresh Data */
    const dataMerged = new Map<string, StoragePoliciesSummary[]>();
    for (const server of serverNames) {
      /* Get Fresh Data if defined */
      if (dataFresh.has(server)) {
        const value = dataFresh.get(server);
        if (value) {
          dataMerged.set(server, value);
          continue;
        }
      }
      /* Cache Fallback */
      if (dataCache.has(server)) {
        const value = dataCache.get(server);
        if (value) dataCache.set(server, value);
      }
    }

    /* SetNetworks and Save to Cache */
    SetStoragePolicies(dataMerged);
    SetIsLoadingStoragePolicies(false);
    for (const server of serverNames) {
      if (dataFresh.has(server)) {
        const value = dataFresh.get(server);
        if (value) cache.set(`vm_${server}_storage_policies`, JSON.stringify(value));
      }
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

  /* Load Data fro given VM */
  async function LoadVM(vm: Vm): Promise<void> {
    SetIsLoadingVMs(true);
    /* Init vCenter Client */
    const serverConfig = await GetServerConfig(vm.server);
    const client = new vCenter(serverConfig.server, serverConfig.username, serverConfig.password);

    /* Load Data */
    const id = vm.summary.vm;
    const promises = await Promise.allSettled([
      client.GetVM(id),
      client.GetVMStoragePolicy(id),
      client.GetVMStoragePolicyCompliance(id),
      client.GetVMGuestNetworkingInterfaces(id),
    ]);
    for (const [index, response] of promises.entries()) {
      if (response.status === "fulfilled") {
        if (index === 0) {
          vm.vm_info = response.value as VMInfo;
        } else if (index === 1) {
          vm.storage_policy_info = response.value as VmStoragePolicyInfo;
        } else if (index === 2) {
          vm.storage_policy_compliance_info = response.value as VMStoragePolicyComplianceInfo;
        } else if (index === 3) {
          vm.interfaces_info = response.value as VmGuestNetworkingInterfacesInfo[];
        }
      } else {
        await showToast({ style: Toast.Style.Success, title: vm.summary.name, message: response.reason });
      }
    }
    SetIsLoadingVMs(false);
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
      [VMGuestPowerAction.STANDBUY, `Suspending`],
    ]);
    const MessageGuestActionFinished: Map<VMGuestPowerAction, string> = new Map([
      [VMGuestPowerAction.REBOOT, `Rebooted`],
      [VMGuestPowerAction.SHUTDOWN, `Powered Off`],
      [VMGuestPowerAction.STANDBUY, `Suspended`],
    ]);
    await showToast({
      style: Toast.Style.Animated,
      title: vm.summary.name,
      message: MessageGuestActionStarted.get(action),
    });
    try {
      const config = await GetServerConfig(vm.server);
      const client = new vCenter(config.server, config.username, config.password);
      await client.VMGuestPower(vm.summary.vm, action);
      await showToast({
        style: Toast.Style.Success,
        title: vm.summary.name,
        message: MessageGuestActionFinished.get(action),
      });
    } catch (error) {
      if (error instanceof Error)
        await showToast({
          style: Toast.Style.Failure,
          title: vm.summary.name,
          message: `Error: ${error.message}`,
        });
      console.error(error);
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
    await showToast({ style: Toast.Style.Animated, title: vm.summary.name, message: MessageActionStarted.get(action) });
    try {
      const config = await GetServerConfig(vm.server);
      const client = new vCenter(config.server, config.username, config.password);
      await client.VMPower(vm.summary.vm, action);
      await showToast({
        style: Toast.Style.Success,
        title: vm.summary.name,
        message: MessageActionFinished.get(action),
      });
    } catch (error) {
      if (error instanceof Error)
        await showToast({
          style: Toast.Style.Failure,
          title: vm.summary.name,
          message: `Error: ${error.message}`,
        });
      console.error(error);
    }
  }

  /**
   * Open an RDP Session.
   * @param {VmGuestNetworkingInterfacesInfo} infs
   */
  async function VMOpenRdp(infs: VmGuestNetworkingInterfacesInfo[]): Promise<void> {
    showToast({ style: Toast.Style.Animated, title: "Starting RDP Session" });

    // Array with All IP
    let ips: string[] = [];
    infs.forEach((inf) => {
      if (!inf.ip) return;
      ips = inf.ip.ip_addresses.filter((ip) => ip.ip_address).map((ip) => ip.ip_address);
    });

    // Get First IPv4
    const ip = ips.find((ip) =>
      ip.match(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)
    );

    // Open Rdp Connection
    if (process.platform === "darwin") {
      /* Urls by App */
      const urls: Record<string, string> = {
        "com.2X.Client.Mac": `tuxclient://?Command=LaunchApp&ConnType=2&Server=${ip}`,
        "com.microsoft.rdc.macos": `rdp://full%20address=s%3A${ip}`,
      };

      /* Get Installed App */
      let apps;
      try {
        apps = await getApplications();
      } catch (error) {
        if (error instanceof Error) {
          showToast({ style: Toast.Style.Failure, title: "Error Getting Installed Apps", message: error.message });
        }
        return;
      }

      /* Filter App List */
      apps = apps.filter((a) => a.bundleId && a.bundleId in urls);
      if (apps.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error with RDP Session",
          message: "Install 'Windows App' or 'Parallels Client' for this feature",
        });
        return;
      }

      /* Open RDP Session */
      for (const [app, url] of Object.entries(urls)) {
        if (apps.findIndex((v) => v.bundleId === app) !== -1) {
          try {
            await open(url);
            showToast({ style: Toast.Style.Success, title: "RDP Session Started" });
            break;
          } catch (error) {
            if (error instanceof Error) {
              showToast({ style: Toast.Style.Failure, title: "Error with RDP Session", message: error.message });
            }
          }
        }
      }
    } else if (process.platform === "win32") {
      await runPowerShellScript(`Start-Process mstsc /v:${ip}`).catch((err) => {
        showToast({ style: Toast.Style.Failure, title: "Error with RDP Session", message: err.message });
      });
      showToast({ style: Toast.Style.Success, title: "RDP Session Started" });
    }
  }

  /**
   * Generate Console Ticket. If the ticket can't be generated it fallback to standard vmrc url requiring authentication.
   * @param {Vm} vm.
   */
  async function VMOpenConsole(vm: Vm): Promise<void> {
    await showToast({ style: Toast.Style.Animated, title: vm.summary.name, message: "Requesting Console Ticket" });
    try {
      const config = await GetServerConfig(vm.server);
      const client = new vCenter(config.server, config.username, config.password);
      try {
        const ticket = await client.VMCreateConsoleTickets(vm.summary.vm);
        if (ticket) open(ticket.ticket);
      } catch (error) {
        console.warn(`Error Generating Console Ticket for '${vm.summary.vm}`, error);
        open(`vmrc://${client.GetFqdn()}/?moid=${vm.summary.vm}`);
      }
      await showToast({ style: Toast.Style.Animated, title: vm.summary.name, message: "Open Console Connection" });
    } catch (error) {
      if (error instanceof Error)
        await showToast({ style: Toast.Style.Failure, title: vm.summary.name, message: `Error: ${error}` });
      console.error(error);
    }
  }

  /**
   * Function to call when selected server name change on searchBarAccessory.
   * @param {string} server - Server Name.
   * @returns {Promise<void>}
   */
  async function onChangeSelectedServerName(server?: string, useCache = true): Promise<void> {
    if (!ServerNames || !server) return;

    /* Exit if Selected Item is unchanged and Update useRef Object */
    if (useCache && SelectedServerName.current === server) return;
    SelectedServerName.current = server;

    /* Set serverNames */
    let serverNames = Array.of<string>();
    if (server === "All") {
      serverNames = ServerNames.filter((value) => value !== "All");
    } else {
      serverNames.push(server);
    }

    /* Clear Data */
    if (useCache) SetVMs([]);
    SetNetworks(new Map());
    SetStoragePolicies(new Map());

    /* Load Data */
    await Promise.allSettled([
      LoadVMs(serverNames, useCache).catch(() => {}),
      LoadNetworks(serverNames).catch(() => {}),
      LoadStoragePolicies(serverNames).catch(() => {}),
    ]);
  }

  /**
   * Delete Selected Server from LocalStorage.
   * @returns {Promise<void>}
   */
  async function DeleteSelectedServer(): Promise<void> {
    if (!SelectedServerName.current) return;
    try {
      await RemoveServerConfig(SelectedServerName.current);
      RevalidateServerNames();
    } catch (error) {
      if (error instanceof Error)
        await showToast({
          style: Toast.Style.Failure,
          title: `Error on deleting server '${SelectedServerName.current}'`,
          message: error.message,
        });
      console.error(error);
    }
  }

  /**
   * Search Bar Accessory
   */
  function GetSearchBar(server: string[]): JSX.Element {
    return (
      <List.Dropdown storeValue={true} tooltip="VMware Server" onChange={onChangeSelectedServerName}>
        {server.map((value) => (
          <List.Dropdown.Item title={value} value={value} />
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
    if (SelectedServerName.current === "All") a.push({ tag: vm.server, icon: Icon.Building });
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
            shortcut={Shortcut.ToggleQuickLook}
          />
          {!IsLoadingVMs && (
            <React.Fragment>
              <Action title="Refresh" icon={Icon.Repeat} onAction={() => LoadVM(vm)} shortcut={Shortcut.Refresh} />
              <Action
                title="Refresh All"
                icon={Icon.Repeat}
                onAction={() => onChangeSelectedServerName(SelectedServerName.current, false)}
                shortcut={Shortcut.RefreshAll}
              />
            </React.Fragment>
          )}
          <Action
            title="Open Console"
            icon={{ source: "icons/vm/console.svg" }}
            onAction={() => VMOpenConsole(vm)}
            shortcut={Shortcut.Open}
          />
          {vm.interfaces_info && (
            <Action
              title="Open Rdp"
              icon={{ source: Icon.Binoculars }}
              onAction={() => VMOpenRdp(vm.interfaces_info!)}
              shortcut={Shortcut.OpenWith}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Name"
            icon={Icon.Clipboard}
            content={vm.summary.name as string}
            shortcut={Shortcut.CopyName}
          />
          {vm.interfaces_info && vm.interfaces_info.at(0)?.ip?.ip_addresses.at(0)?.ip_address && (
            <Action.CopyToClipboard
              title="Copy Ip"
              icon={Icon.Clipboard}
              content={vm.interfaces_info.at(0)?.ip?.ip_addresses.at(0)?.ip_address as string}
              shortcut={Shortcut.CopyPath}
            />
          )}
          {vm.vm_info && (
            <ActionPanel.Section title="Power">
              {vm.vm_info.power_state === VmPowerState.POWERED_ON && (
                <React.Fragment>
                  <ActionPanel.Submenu
                    title="Power Off"
                    icon={VMPowerActionIcons.get(VMPowerAction.STOP)}
                    shortcut={Shortcut.TogglePower}
                  >
                    <Action
                      title={`Yes, Power Off "${vm.summary.name}"`}
                      icon={VMPowerActionIcons.get(VMPowerAction.STOP)}
                      onAction={() => VMAction(vm, VMPowerAction.STOP)}
                    />
                    <Action title="No" icon={Icon.XMarkCircle} />
                  </ActionPanel.Submenu>
                  <ActionPanel.Submenu
                    title="Suspend"
                    icon={VMPowerActionIcons.get(VMPowerAction.SUSPEND)}
                    shortcut={Shortcut.Suspend}
                  >
                    <Action
                      title={`Yes, Suspend "${vm.summary.name}"`}
                      icon={VMPowerActionIcons.get(VMPowerAction.SUSPEND)}
                      onAction={() => VMAction(vm, VMPowerAction.SUSPEND)}
                    />
                    <Action title="No" icon={Icon.XMarkCircle} />
                  </ActionPanel.Submenu>
                  <ActionPanel.Submenu
                    title="Reset"
                    icon={VMPowerActionIcons.get(VMPowerAction.RESET)}
                    shortcut={Shortcut.Reset}
                  >
                    <Action
                      title={`Yes, Reset "${vm.summary.name}"`}
                      icon={VMPowerActionIcons.get(VMPowerAction.RESET)}
                      onAction={() => VMAction(vm, VMPowerAction.RESET)}
                    />
                    <Action title="No" icon={Icon.XMarkCircle} />
                  </ActionPanel.Submenu>
                  {vm.interfaces_info && (
                    <React.Fragment>
                      <ActionPanel.Submenu
                        title="Restart Guest Os"
                        icon={VMGuestPowerActionIcons.get(VMGuestPowerAction.REBOOT)}
                        shortcut={Shortcut.GuestRestart}
                      >
                        <Action
                          title={`Yes, Restart Guest Os "${vm.summary.name}`}
                          icon={VMGuestPowerActionIcons.get(VMGuestPowerAction.REBOOT)}
                          onAction={() => VMGuestAction(vm, VMGuestPowerAction.REBOOT)}
                        />
                        <Action title="No" icon={Icon.XMarkCircle} />
                      </ActionPanel.Submenu>
                      <ActionPanel.Submenu
                        title="Shut Down Guest Os"
                        icon={VMGuestPowerActionIcons.get(VMGuestPowerAction.SHUTDOWN)}
                        shortcut={Shortcut.GuestShutdown}
                      >
                        <Action
                          title={`Yes, Shut Down Guest Os "${vm.summary.name}"`}
                          icon={VMGuestPowerActionIcons.get(VMGuestPowerAction.SHUTDOWN)}
                          onAction={() => VMGuestAction(vm, VMGuestPowerAction.SHUTDOWN)}
                        />
                        <Action title="No" icon={Icon.XMarkCircle} />
                      </ActionPanel.Submenu>
                    </React.Fragment>
                  )}
                </React.Fragment>
              )}
              {(vm.vm_info.power_state === VmPowerState.POWERED_OFF ||
                vm.vm_info.power_state === VmPowerState.SUSPENDED) && (
                <React.Fragment>
                  <ActionPanel.Submenu
                    title="Power On"
                    icon={VMPowerActionIcons.get(VMPowerAction.START)}
                    shortcut={Shortcut.TogglePower}
                  >
                    <Action
                      title={`"Yes, Power On "${vm.summary.name}"`}
                      icon={VMPowerActionIcons.get(VMPowerAction.START)}
                      onAction={() => VMAction(vm, VMPowerAction.START)}
                    />
                    <Action title="No" icon={Icon.XMarkCircle} />
                  </ActionPanel.Submenu>
                </React.Fragment>
              )}
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="vCenter Server">
            {!IsLoadingServerNames && !IsLoadingVMs && !IsLoadingNetworks && !IsLoadingStoragePolicies && (
              <React.Fragment>
                <Action
                  title="Add Server"
                  icon={Icon.NewDocument}
                  onAction={() => {
                    SetShowServerView(true);
                  }}
                />
                <Action
                  title="Edit Server"
                  icon={Icon.Pencil}
                  onAction={() => SelectedServerName.current !== "All" && SetShowServerViewEdit(true)}
                />
                <Action
                  title="Delete Server"
                  icon={Icon.DeleteDocument}
                  onAction={() => SelectedServerName.current !== "All" && DeleteSelectedServer}
                />
              </React.Fragment>
            )}
          </ActionPanel.Section>
        </ActionPanel>
      );

    return (
      <ActionPanel title="vCenter VM">
        {!IsLoadingVMs && (
          <Action
            title="Refresh All"
            icon={Icon.Repeat}
            onAction={() => onChangeSelectedServerName(SelectedServerName.current)}
            shortcut={Shortcut.RefreshAll}
          />
        )}
        <ActionPanel.Section title="vCenter Server">
          {!IsLoadingServerNames && !IsLoadingVMs && !IsLoadingNetworks && !IsLoadingStoragePolicies && (
            <React.Fragment>
              <Action
                title="Add Server"
                icon={Icon.NewDocument}
                onAction={() => {
                  SetShowServerView(true);
                }}
              />
              <Action
                title="Edit Server"
                icon={Icon.Pencil}
                onAction={() => SelectedServerName.current !== "All" && SetShowServerViewEdit(true)}
              />
              <Action
                title="Delete Server"
                icon={Icon.DeleteDocument}
                onAction={() => SelectedServerName.current !== "All" && DeleteSelectedServer}
              />
            </React.Fragment>
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

  const [ShowServerView, SetShowServerView] = React.useState(false);
  const [ShowServerViewEdit, SetShowServerViewEdit] = React.useState(false);

  if (ShowServerView)
    return <ServerView SetShowView={SetShowServerView} RevalidateServerNames={RevalidateServerNames} />;
  if (ShowServerViewEdit)
    return <ServerView SetShowView={SetShowServerViewEdit} ServerSelected={SelectedServerName.current} />;

  return (
    <List
      isLoading={IsLoadingVMs || IsLoadingNetworks || IsLoadingStoragePolicies}
      isShowingDetail={showDetail}
      actions={GetVMAction()}
      searchBarAccessory={ServerNames && GetSearchBar(ServerNames)}
      throttle={true}
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
