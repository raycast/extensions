import { Proxmox, proxmoxApi } from "proxmox-api";
import { getPreferenceValues } from "@raycast/api";
import { ProxmoxPreferences } from "../../interfaces/preferences";
import { Node } from "../../interfaces/node";
import { VirtualMachine } from "../../interfaces/virtualmachine";
import { LXCContainer } from "../../interfaces/lxccontainer";
import { Storage } from "../../interfaces/storage";

export class ProxmoxAPI {
  preferences = getPreferenceValues<ProxmoxPreferences>();
  instance = proxmoxApi({
    host: this.preferences.instance,
    tokenID: this.preferences.tokenId,
    tokenSecret: this.preferences.tokenSecret,
  });
  public async getNodes() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = `${+!this.preferences.unsafeTls}`;
    const fetchedNodes = await this.instance.nodes.$get();
    const nodes: Node[] = fetchedNodes.map((n: Proxmox.nodesIndex) => {
      const node = {} as Node;
      node.cpu = n["cpu"];
      node.level = node["level"] ? node["level"] : "";
      node.cpu = n["maxcpu"];
      node.cpuUtil = n["cpu"];
      node.mem = n["maxmem"];
      node.memUtil = n["mem"];
      node.status = n["status"];
      node.name = n["node"];
      node.uptime = n["uptime"];
      return node;
    });
    return nodes.sort((a, b) => a.name.localeCompare(b.name));
  }
  public async getVirtualMachines() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = `${+!this.preferences.unsafeTls}`;
    const fetchedNodes = await this.instance.nodes.$get();
    const virtualMachines: VirtualMachine[] = [];
    for (const fetchedNode of fetchedNodes) {
      const fetchedVirtualMachines = await this.instance.nodes.$(fetchedNode.node).qemu.$get({ full: true });
      for (const fetchedVM of fetchedVirtualMachines) {
        const vm = {} as VirtualMachine;
        const vmConfig = await this.instance.nodes.$(fetchedNode["node"]).qemu.$(fetchedVM["vmid"]).config.$get();
        vm.name = fetchedVM.name ? fetchedVM.name : "";
        vm.node = fetchedNode.node;
        vm.status = fetchedVM.status;
        vm.qmpstatus = fetchedVM["qmpstatus"] ? fetchedVM["qmpstatus"] : "";
        vm.vmid = fetchedVM["vmid"];
        vm.uptime = fetchedVM["uptime"] ? fetchedVM["uptime"] : 0;
        vm.cpus = fetchedVM["cpus"];
        vm.memory = fetchedVM["maxmem"] ? fetchedVM["maxmem"] : 0;
        vm.disk = fetchedVM["maxdisk"] ? fetchedVM["maxdisk"] : 0;
        vm.tags = fetchedVM["tags"] ? fetchedVM["tags"] : "";
        vm.runningMachineType = fetchedVM["running-machine"] ? fetchedVM["running-machine"] : "";
        vm.url = encodeURI(`https://${this.preferences.instance}/#v1:0:=qemu/${vm.vmid}`);
        vm.qemuVersion = fetchedVM["running-qemu"] ? fetchedVM["running-qemu"] : "";
        vm.template = vmConfig["template"] ? vmConfig["template"] : false;
        virtualMachines.push(vm);
      }
    }
    return virtualMachines.sort((a, b) => a.name?.localeCompare(b.name));
  }
  public async getLXCContainers() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = `${+!this.preferences.unsafeTls}`;
    const fetchedNodes = await this.instance.nodes.$get();
    const linuxContainers: LXCContainer[] = [];
    for (const fetchedNode of fetchedNodes) {
      const fetchedLinuxContainers = await this.instance.nodes.$(fetchedNode.node).lxc.$get();
      for (const fetchedLXC of fetchedLinuxContainers) {
        const lxc = {} as LXCContainer;
        const lxcConfig = await this.instance.nodes.$(fetchedNode["node"]).lxc.$(fetchedLXC["vmid"]).config.$get();
        lxc.name = fetchedLXC["name"] ? fetchedLXC["name"] : "";
        lxc.node = fetchedNode["node"];
        lxc.status = fetchedLXC["status"];
        lxc.qmpstatus = fetchedLXC["status"];
        lxc.vmid = fetchedLXC["vmid"];
        lxc.uptime = fetchedLXC["uptime"] ? fetchedLXC["uptime"] : 0;
        lxc.cpus = fetchedLXC["cpus"];
        lxc.memory = fetchedLXC["maxmem"] ? fetchedLXC["maxmem"] : 0;
        lxc.swap = fetchedLXC["maxswap"] ? fetchedLXC["maxswap"] : 0;
        lxc.swapUtil = fetchedLXC["swap"] ? fetchedLXC["swap"] : 0;
        lxc.disk = fetchedLXC["maxdisk"] ? fetchedLXC["maxdisk"] : 0;
        lxc.tags = fetchedLXC["tags"] ? fetchedLXC["tags"] : "";
        lxc.template = lxcConfig["template"] ? lxcConfig["template"] : false;
        lxc.url = encodeURI(`https://${this.preferences.instance}/#v1:0:=lxc/${lxc.vmid}`);
        linuxContainers.push(lxc);
      }
    }
    return linuxContainers.sort((a, b) => a.name?.localeCompare(b.name));
  }
  public async getStorage() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = `${+!this.preferences.unsafeTls}`;
    const fetchedNodes = await this.instance.nodes.$get();
    let proxmoxStorage: Storage[] = [];
    for (const fetchedNode of fetchedNodes) {
      const fetchedStorageList = await this.instance.nodes.$(fetchedNode.node).storage.$get();
      for (const fetchedNodeStorage of fetchedStorageList) {
        const storage = {} as Storage;
        storage.name = fetchedNodeStorage.storage;
        storage.node = fetchedNode.node;
        storage.type = fetchedNodeStorage["type"];
        storage.content = fetchedNodeStorage["content"];
        storage.active = fetchedNodeStorage["active"] ? true : false;
        storage.enabled = fetchedNodeStorage["enabled"] ? true : false;
        storage.shared = fetchedNodeStorage["shared"] ? true : false;
        storage.size = fetchedNodeStorage["total"] ? fetchedNodeStorage["total"] : 0;
        storage.used = fetchedNodeStorage["used"] ? fetchedNodeStorage["used"] : 0;
        storage.utilization = fetchedNodeStorage["used_fraction"] ? fetchedNodeStorage["used_fraction"] : 0;
        proxmoxStorage.push(storage);
      }
    }
    // NOTE: Filter storage that doesn't return size, we assume it is not consumable
    // Example: Local storage that is not present on all nodes in the cluster
    proxmoxStorage = proxmoxStorage.filter((s: Storage) => s.size != 0);
    return proxmoxStorage.sort((a, b) => a.name?.localeCompare(b.name));
  }
  async waitForTaskCompletion(node: string, task: string, interval: number = 2000) {
    let taskInProgress: boolean = true;
    let taskResult;
    while (taskInProgress) {
      await new Promise((resolve) => setTimeout(resolve, interval));
      taskResult = await this.instance.nodes.$(node).tasks.$(task).status.$get();
      taskInProgress = taskResult["status"] == "running" ? true : false;
    }
    return taskResult;
  }
  public async performVirtualMachinePowerAction(vm: VirtualMachine, action: string) {
    let powerActionProxmoxTask: string = "";
    console.log(action);
    switch (action) {
      case "start":
        powerActionProxmoxTask = await this.instance.nodes.$(vm.node).qemu.$(vm.vmid).status.start.$post();
        break;
      case "shutdown":
        powerActionProxmoxTask = await this.instance.nodes.$(vm.node).qemu.$(vm.vmid).status.shutdown.$post();
        break;
      case "stop":
        powerActionProxmoxTask = await this.instance.nodes.$(vm.node).qemu.$(vm.vmid).status.stop.$post();
        break;
      case "reboot":
        powerActionProxmoxTask = await this.instance.nodes.$(vm.node).qemu.$(vm.vmid).status.reboot.$post();
        break;
      case "pause":
        powerActionProxmoxTask = await this.instance.nodes.$(vm.node).qemu.$(vm.vmid).status.suspend.$post();
        break;
      case "resume":
        powerActionProxmoxTask = await this.instance.nodes.$(vm.node).qemu.$(vm.vmid).status.resume.$post();
        break;
      case "hibernate":
        powerActionProxmoxTask = await this.instance.nodes
          .$(vm.node)
          .qemu.$(vm.vmid)
          .status.suspend.$post({ todisk: true });
        break;
    }
    console.log(powerActionProxmoxTask);
    const proxmoxTaskResult = this.waitForTaskCompletion(vm.node, powerActionProxmoxTask);
    return proxmoxTaskResult;
  }
  public async performLinuxContainerPowerAction(lxc: LXCContainer, action: string) {
    let powerActionProxmoxTask: string = "";
    console.log(action);
    switch (action) {
      case "start":
        powerActionProxmoxTask = await this.instance.nodes.$(lxc.node).lxc.$(lxc.vmid).status.start.$post();
        break;
      case "shutdown":
        powerActionProxmoxTask = await this.instance.nodes.$(lxc.node).lxc.$(lxc.vmid).status.shutdown.$post();
        break;
      case "stop":
        powerActionProxmoxTask = await this.instance.nodes.$(lxc.node).lxc.$(lxc.vmid).status.stop.$post();
        break;
      case "reboot":
        powerActionProxmoxTask = await this.instance.nodes.$(lxc.node).lxc.$(lxc.vmid).status.reboot.$post();
        break;
      case "pause":
        powerActionProxmoxTask = await this.instance.nodes.$(lxc.node).lxc.$(lxc.vmid).status.suspend.$post();
        break;
      case "resume":
        powerActionProxmoxTask = await this.instance.nodes.$(lxc.node).lxc.$(lxc.vmid).status.resume.$post();
        break;
    }
    const proxmoxTaskResult = this.waitForTaskCompletion(lxc.node, powerActionProxmoxTask);
    return proxmoxTaskResult;
  }
}
