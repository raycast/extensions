import os from "node:os";
import macosRelease from "macos-release";
import { macOSVersion } from "macos-version";
import { exec } from "node:child_process";
import si from "systeminformation";

interface SystemInfo {
  hostname: string;
  chip: string;
  memory: string;
  os: string;
  kernel: string;
  serialNumber: string;
}

const getWindowsBuildNumber = () =>
  new Promise<string>((resolve) => {
    exec('reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion" /v UBR', (error, stdout) => {
      if (error) {
        resolve("");
        return;
      }
      const hexMatch = stdout.match(/0x[0-9a-fA-F]+/);
      if (!hexMatch) {
        resolve("");
        return;
      }
      const ubr = parseInt(hexMatch[0], 16);
      resolve(Number.isFinite(ubr) ? `.${ubr}` : "");
    });
  });

const getMacOSSerial = () =>
  new Promise<string>((resolve) => {
    exec("/usr/sbin/system_profiler SPHardwareDataType", (error, stdout) => {
      if (error) {
        resolve("Unable to retrieve");
        return;
      }
      const serialNumberMatch = stdout.match(/Serial Number \(system\): (.+)/);
      resolve(serialNumberMatch ? serialNumberMatch[1] : "Not available");
    });
  });

/**
 * Get system information
 * @returns {Promise<SystemInfo>} System information including hostname, chip, memory, and OS version
 */
export default async function Command(): Promise<SystemInfo> {
  try {
    if (process.platform === "win32") {
      const [system, memLayout, osInfo, ubr] = await Promise.all([
        si.system(),
        si.memLayout(),
        si.osInfo(),
        getWindowsBuildNumber(),
      ]);
      const memoryBytes = memLayout.reduce((sum, stick) => sum + (stick.size || 0), 0);
      const memoryGb = memoryBytes / 1024 ** 3;
      const distro = osInfo.distro.replace(/^Microsoft /, "");
      return {
        hostname: os.hostname().replace(/\.local/g, ""),
        chip: os.cpus()[0].model.trim(),
        memory: Number.isInteger(memoryGb) ? `${memoryGb} GB` : `${memoryGb.toFixed(2)} GB`,
        os: `${distro} ${osInfo.codename} (Build ${osInfo.build}${ubr})`,
        kernel: osInfo.kernel,
        serialNumber: system.serial || "Not available",
      };
    }

    const serialNumber = await getMacOSSerial();
    return {
      hostname: os.hostname().replace(/\.local/g, ""),
      chip: os.cpus()[0].model,
      memory: (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2) + " GB",
      os: `macOS ${macosRelease().name == "Unknown" ? macOSVersion() : macosRelease().name} (${macOSVersion()})`,
      kernel: os.version().replace("Darwin Kernel", "").trim(),
      serialNumber: serialNumber,
    };
  } catch (error) {
    throw new Error(`Failed to retrieve system information: ${error instanceof Error ? error.message : String(error)}`);
  }
}
