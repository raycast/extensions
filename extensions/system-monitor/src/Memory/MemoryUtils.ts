import { MemoryInterface } from "../Interfaces";
import { execf } from "../utils";

export const getTopRamProcess = async (): Promise<string[][]> => {
  const output = await execf("/usr/bin/top", ["-l", "1", "-o", "mem", "-n", "5", "-stats", "command,mem"]);
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
  const [pHwPagesize, pMemTotal, pVmPagePageableInternalCount, pVmPagePurgeableCount, vmStatOutput] = await Promise.all(
    [
      execf("/usr/sbin/sysctl", ["-n", "hw.pagesize"]),
      execf("/usr/sbin/sysctl", ["-n", "hw.memsize"]),
      execf("/usr/sbin/sysctl", ["-n", "vm.page_pageable_internal_count"]),
      execf("/usr/sbin/sysctl", ["-n", "vm.page_purgeable_count"]),
      execf("/usr/bin/vm_stat"),
    ],
  );

  const hwPagesize = parseFloat(pHwPagesize);
  const memTotal = parseFloat(pMemTotal) / 1024 / 1024;
  const pagesApp = parseFloat(pVmPagePageableInternalCount) - parseFloat(pVmPagePurgeableCount);

  const vmLines = vmStatOutput.split("\n");
  const wiredLine = vmLines.find((l) => l.includes("wired"));
  const pagesWired = parseFloat(wiredLine?.match(/(\d+)/g)?.pop() ?? "0");
  const compressedLine = vmLines.find((l) => l.includes("occupied"));
  const pagesCompressed = parseFloat(compressedLine?.match(/(\d+)/g)?.pop() ?? "0");

  const memUsed = ((pagesApp + pagesWired + pagesCompressed) * hwPagesize) / 1024 / 1024;

  return { memTotal, memUsed };
};
