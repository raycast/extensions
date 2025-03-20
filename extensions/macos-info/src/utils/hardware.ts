import { execSync } from "child_process";

interface HardwareData {
  _name: string;
  activation_lock_status: string;
  boot_rom_version: string;
  chip_type: string;
  machine_model: string;
  machine_name: string;
  model_number: string;
  number_processors: string;
  os_loader_version: string;
  physical_memory: string;
  platform_UUID: string;
  provisioning_UDID: string;
  serial_number: string;
}

interface SystemProfilerResponse {
  SPHardwareDataType: [HardwareData];
}

export type HardwareProperty = keyof Omit<HardwareData, "_name">;

export async function getHardwareInfo(property: HardwareProperty, formatResponse: (value: string) => string) {
  try {
    const output = execSync("/usr/sbin/system_profiler -json SPHardwareDataType").toString();
    const data = JSON.parse(output) as SystemProfilerResponse;
    const value = data.SPHardwareDataType[0][property];

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
