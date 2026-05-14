import { type PveVm, PveVmStatus, PveVmTypes } from "@/types";

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
