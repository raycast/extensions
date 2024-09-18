import { MemoryInterface } from "../Interfaces";
import { execp } from "../utils";

export const getTopRamProcess = async (): Promise<string[][]> => {
  const output = await execp("/usr/bin/top -l 1 -o mem -n 5 -stats command,mem");
  const processList = output.trim().split("\n").slice(12, 17);
  const modProcessList: string[][] = [];

  processList.forEach((value) => {
    enum MemoryTypes {
      G = "Gb",
      M = "Mb",
    }

    const temp: string[] = value.trim().split(" ");
    const processName = temp.slice(0, -1).join(" ");
    const processMemory = temp[temp.length - 1].slice(0, -1);
    const processMemoryType = temp[temp.length - 1].slice(-1) as keyof typeof MemoryTypes;

    modProcessList.push([processName, `${processMemory} ${MemoryTypes[processMemoryType] || MemoryTypes.M}`]);
  });

  return modProcessList;
};

export const getMemoryUsage = async (): Promise<MemoryInterface> => {
  const pHwPagesize = await execp("/usr/sbin/sysctl -n hw.pagesize");
  const hwPagesize: number = parseFloat(pHwPagesize);
  const pMemTotal = await execp("/usr/sbin/sysctl -n hw.memsize");
  const memTotal: number = parseFloat(pMemTotal) / 1024 / 1024;
  const pVmPagePageableInternalCount = await execp("/usr/sbin/sysctl -n vm.page_pageable_internal_count");
  const pVmPagePurgeableCount = await execp("/usr/sbin/sysctl -n vm.page_purgeable_count");
  const pagesApp: number = parseFloat(pVmPagePageableInternalCount) - parseFloat(pVmPagePurgeableCount);
  const pPagesWired = await execp("/usr/bin/vm_stat | awk '/ wired/ { print $4 }'");
  const pagesWired: number = parseFloat(pPagesWired);
  const pPagesCompressed = await execp("/usr/bin/vm_stat | awk '/ occupied/ { printf $5 }'");
  const pagesCompressed: number = parseFloat(pPagesCompressed) || 0;
  const memUsed = ((pagesApp + pagesWired + pagesCompressed) * hwPagesize) / 1024 / 1024;

  return {
    memTotal: memTotal,
    memUsed: memUsed,
  };
};
