import { exec } from "child_process";
import { promisify } from "util";
import { ExecError, MemoryInterface } from "../Interfaces";

const execp = promisify(exec);

const getTopRamProcess = async (): Promise<string[][]> => {
  try {
    const output = await execp("/usr/bin/top -l 1 -o mem -n 5 -stats command,mem");
    const processList = output.stdout.trim().split("\n").slice(12, 17);
    const modProcessList: string[][] = [];
    processList.forEach((value) => {
      let temp: string[] = value.trim().split(" ");
      temp = [temp.slice(0, -1).join(" "), temp[temp.length - 1].slice(0, -1) + " MB"];
      modProcessList.push(temp);
    });
    return modProcessList;
  } catch (err) {
    const execErr = err as ExecError;
    throw execErr;
  }
};

const getFreeDiskSpace = async (): Promise<string> => {
  try {
    const output = await execp(
      `/usr/sbin/system_profiler SPStorageDataType | grep Free | sed -n 2p | awk '{print $2 " " $3}'`
    );
    const freeDiskSpace = output.stdout.trim();
    return freeDiskSpace;
  } catch (err) {
    const execErr = err as ExecError;
    throw execErr;
  }
};

const getTotalDiskSpace = async (): Promise<string> => {
  try {
    const output = await execp(
      `/usr/sbin/system_profiler SPStorageDataType | grep Capacity | sed -n 2p | awk '{print $2 " " $3}'`
    );
    const totalDiskSpace = output.stdout.trim();
    return totalDiskSpace;
  } catch (err) {
    const execErr = err as ExecError;
    throw execErr;
  }
};

const getMemoryUsage = async (): Promise<MemoryInterface> => {
  try {
    const pHwPagesize = await execp("/usr/sbin/sysctl -n hw.pagesize");
    const hwPagesize: number = parseFloat(pHwPagesize.stdout.trim());
    const pMemTotal = await execp("/usr/sbin/sysctl -n hw.memsize");
    const memTotal: number = parseFloat(pMemTotal.stdout.trim()) / 1024 / 1024;
    const pVmPagePageableInternalCount = await execp("/usr/sbin/sysctl -n vm.page_pageable_internal_count");
    const pVmPagePurgeableCount = await execp("/usr/sbin/sysctl -n vm.page_purgeable_count");
    const pagesApp: number =
      parseFloat(pVmPagePageableInternalCount.stdout.trim()) - parseFloat(pVmPagePurgeableCount.stdout.trim());
    const pPagesWired = await execp("/usr/bin/vm_stat | awk '/ wired/ { print $4 }'");
    const pagesWired: number = parseFloat(pPagesWired.stdout.trim());
    const pPagesCompressed = await execp("/usr/bin/vm_stat | awk '/ occupied/ { printf $5 }'");
    const pagesCompressed: number = parseFloat(pPagesCompressed.stdout.trim()) || 0;
    const memUsed = ((pagesApp + pagesWired + pagesCompressed) * hwPagesize) / 1024 / 1024;

    return {
      memTotal: memTotal,
      memUsed: memUsed,
    };
  } catch (err) {
    const execErr = err as ExecError;

    throw execErr;
  }
};

export { getTopRamProcess, getFreeDiskSpace, getTotalDiskSpace, getMemoryUsage };
