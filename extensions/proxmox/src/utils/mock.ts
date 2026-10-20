import { type PveServer, type PveServerResult, type PveStorage, type PveVm, PveVmStatus, PveVmTypes } from "@/types";

export const getMockServer = (name: string): PveServer => ({
  id: name,
  name,
  url: `https://${name}.local:8006`,
  tokenId: "root@pam!raycast",
  tokenSecret: "mock-secret",
});

export const getMockPveVmResults = (): PveServerResult<PveVm[]>[] => {
  const vms = getMockPveVmData();

  return [
    { server: getMockServer("pve-01"), data: vms.slice(0, 3) },
    { server: getMockServer("pve-02"), data: vms.slice(3) },
  ];
};

export const getMockPveStorageResults = (): PveServerResult<PveStorage[]>[] => {
  const GiB = 1024 * 1024 * 1024;
  const makeStorage = (
    node: string,
    storage: string,
    plugintype: string,
    content: string,
    disk: number,
    maxdisk: number,
    shared = 0,
  ): PveStorage => ({
    id: `storage/${node}/${storage}`,
    disk,
    maxdisk,
    shared,
    content,
    status: "available",
    plugintype,
    storage,
    node,
  });

  return [
    {
      server: getMockServer("pve-01"),
      data: [
        makeStorage("pve", "local", "dir", "iso,vztmpl,backup", 19 * GiB, 68 * GiB),
        makeStorage("pve", "local-lvm", "lvmthin", "images,rootdir", 121 * GiB, 349 * GiB),
        makeStorage("pve", "backups", "nfs", "backup", 590 * GiB, 2048 * GiB, 1),
      ],
    },
    {
      server: getMockServer("pve-02"),
      data: [
        makeStorage("pve2", "local", "dir", "iso,vztmpl,backup", 9 * GiB, 94 * GiB),
        makeStorage("pve2", "local-lvm", "lvmthin", "images,rootdir", 87 * GiB, 250 * GiB),
      ],
    },
  ];
};

export const getMockPveVmData = (): PveVm[] => {
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
};
