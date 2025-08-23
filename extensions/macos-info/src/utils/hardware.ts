import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
  SPHardwareDataType: HardwareData[];
}

export type HardwareProperty = keyof Omit<HardwareData, "_name">;

export async function getHardwareInfo(property: HardwareProperty, formatResponse: (value: string) => string) {
  try {
    const { stdout } = await execAsync("/usr/sbin/system_profiler -json SPHardwareDataType");
    const data = JSON.parse(stdout) as SystemProfilerResponse;

    if (!data.SPHardwareDataType || data.SPHardwareDataType.length === 0) {
      throw new Error("No hardware data available");
    }

    const value = data.SPHardwareDataType[0][property];

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
