import os from "os";
import macosRelease from "macos-release";
import { macOSVersion } from "macos-version";
import { exec } from "child_process";

interface SystemInfo {
  hostname: string;
  chip: string;
  memory: string;
  macOS: string;
  kernel: string;
  serialNumber: string;
}

/**
 * Get system information
 * @returns {Promise<SystemInfo>} System information including hostname, chip, memory, and macOS version
 */
export default async function Command(): Promise<SystemInfo> {
  return new Promise<SystemInfo>((resolve, reject) => {
    try {
      exec("/usr/sbin/system_profiler SPHardwareDataType", (error, stdout) => {
        if (error) {
          resolve({
            hostname: os.hostname().replace(/\.local/g, ""),
            chip: os.cpus()[0].model,
            memory: (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2) + " GB",
            macOS: `macOS ${
              macosRelease().name == "Unknown" ? macOSVersion() : macosRelease().name
            } (${macOSVersion()})`,
            kernel: os.version().replace("Darwin Kernel", "").trim(),
            serialNumber: "Unable to retrieve",
          });
          return;
        }

        const serialNumberMatch = stdout.match(/Serial Number \(system\): (.+)/);
        const serialNumber = serialNumberMatch ? serialNumberMatch[1] : "Not available";

        resolve({
          hostname: os.hostname().replace(/\.local/g, ""),
          chip: os.cpus()[0].model,
          memory: (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2) + " GB",
          macOS: `macOS ${macosRelease().name == "Unknown" ? macOSVersion() : macosRelease().name} (${macOSVersion()})`,
          kernel: os.version().replace("Darwin Kernel", "").trim(),
          serialNumber: serialNumber,
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}
