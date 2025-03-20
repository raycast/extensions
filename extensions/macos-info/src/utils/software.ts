import { execSync } from "child_process";

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
  SPSoftwareDataType: [SoftwareData];
}

export type SoftwareProperty = keyof Omit<SoftwareData, "_name">;

export async function getSoftwareInfo(property: SoftwareProperty, formatResponse: (value: string) => string) {
  try {
    const output = execSync("/usr/sbin/system_profiler -json SPSoftwareDataType").toString();
    const data = JSON.parse(output) as SystemProfilerResponse;
    const value = data.SPSoftwareDataType[0][property];

    return {
      answer: formatResponse(value),
      show: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const propertyName = property
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    return {
      answer: `Sorry, I couldn't retrieve your ${propertyName.toLowerCase()}. Error: ${errorMessage}`,
      show: true,
    };
  }
}
