import si from "systeminformation";
import { DiskInterface } from "../Interfaces";
import { promisify } from "util";
import { exec } from "child_process";

const execp = promisify(exec);

export async function calculateDiskStorage() {
  const disks = await si.fsSize();

  return disks
    .filter((disk) => {
      return disk.mount === "/" || disk.mount.startsWith("/Volumes");
    })
    .map((disk) => {
      const diskName = disk.mount === "/" ? "Macintosh HD" : (disk.mount as string).split("/").pop();
      const totalSize = (disk.size / (1024 * 1024 * 1024)).toFixed(2);
      const totalAvailableStorage = (disk.available / (1024 * 1024 * 1024)).toFixed(2);

      return {
        diskName,
        totalSize,
        totalAvailableStorage,
      } as DiskInterface;
    });
}

export async function getSerialNumber() {
  const output = await execp("/usr/sbin/system_profiler SPHardwareDataType");
  const dataMatch = output.stdout.match(/Serial Number \(system\): (.+)/);

  return dataMatch ? dataMatch[1] : null;
}

export async function getOSInfo() {
  const { codename, release } = await si.osInfo();

  return {
    codename,
    release,
  };
}
