import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface SoftwareData {
  _name: string;
  boot_mode: string;
  boot_volume: string;
  kernel_version: string;
  local_host_name: string;
  os_version: string;
  secure_vm: string;
  system_integrity: string;
  uptime: string;
  user_name: string;
}

interface SystemProfilerResponse {
  SPSoftwareDataType: SoftwareData[];
}

export type SoftwareProperty = keyof Omit<SoftwareData, "_name">;

export async function getSoftwareInfo(property: SoftwareProperty, formatResponse: (value: string) => string) {
  try {
    const { stdout } = await execAsync("/usr/sbin/system_profiler -json SPSoftwareDataType");
    const data = JSON.parse(stdout) as SystemProfilerResponse;

    if (!data.SPSoftwareDataType || data.SPSoftwareDataType.length === 0) {
      throw new Error("No software data available");
    }

    const value = data.SPSoftwareDataType[0][property];

    if (!value) {
      throw new Error(`No ${property} information available`);
    }

    return {
      answer: formatResponse(value),
      show: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    return {
      answer: `Sorry, I couldn't retrieve ${property}. Error: ${errorMessage}`,
      show: true,
    };
  }
}
