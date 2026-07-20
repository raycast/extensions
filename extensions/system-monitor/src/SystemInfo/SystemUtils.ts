import { DiskInterface } from "../Interfaces";
import { execf } from "../utils";

export async function calculateDiskStorage() {
  const output = await execf("/bin/df", ["-kP"]);
  const lines = output.split("\n").slice(1); // skip header

  return lines
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      // df -kP columns: Filesystem, 1024-blocks, Used, Available, Capacity, Mounted on
      const mount = parts.slice(5).join(" ");
      const sizeKB = parseInt(parts[1], 10);
      const availKB = parseInt(parts[3], 10);
      return { mount, sizeKB, availKB };
    })
    .filter((d) => d.mount === "/" || d.mount.startsWith("/Volumes"))
    .map((d) => {
      const diskName = d.mount === "/" ? "Macintosh HD" : d.mount.split("/").pop();
      const totalSize = (d.sizeKB / 1024 / 1024).toFixed(2);
      const totalAvailableStorage = (d.availKB / 1024 / 1024).toFixed(2);
      const usedStorage = (+totalSize - +totalAvailableStorage).toFixed(2);

      return { diskName, totalSize, totalAvailableStorage, usedStorage } as DiskInterface;
    });
}

export async function getSerialNumber() {
  const output = await execf("/usr/sbin/system_profiler", ["SPHardwareDataType"]);
  const dataMatch = output.match(/Serial Number \(system\): (.+)/);

  return dataMatch ? dataMatch[1] : null;
}

export async function getOSInfo() {
  const output = await execf("/usr/bin/sw_vers");
  const versionMatch = output.match(/ProductVersion:\s*(.+)/);
  const release = versionMatch ? versionMatch[1].trim() : "Unknown";
  const major = parseInt(release.split(".")[0], 10);
  const codenames: Record<number, string> = {
    15: "Sequoia",
    14: "Sonoma",
    13: "Ventura",
    12: "Monterey",
    11: "Big Sur",
    10: "Catalina",
  };
  return { codename: codenames[major] ?? release, release };
}
