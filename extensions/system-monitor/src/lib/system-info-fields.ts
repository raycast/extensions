import type { HardwareInfo } from "./hardware-info";
import type { OSInfo } from "./os-version";

export interface CopyableField {
  title: string;
  value: string;
}

/** System Info values offered as copy actions; values not collected yet or reported as "Unknown" are left out. */
export function systemInfoCopyFields(hostname: string, hardware?: HardwareInfo, osInfo?: OSInfo): CopyableField[] {
  const fields: { title: string; value?: string }[] = [
    { title: "macOS Version", value: osInfo?.display },
    { title: "Hostname", value: hostname },
    { title: "Model", value: hardware?.modelName },
    { title: "Model Year", value: hardware?.modelYear },
    { title: "Model Identifier", value: hardware?.modelIdentifier },
    { title: "Model Number", value: hardware?.modelNumber },
    { title: "Chip", value: hardware?.chip },
    { title: "GPU", value: hardware?.gpuChipset },
    { title: "Memory", value: hardware?.memory },
    { title: "Serial Number", value: hardware?.serialNumber },
  ];

  return fields.filter((field): field is CopyableField => !!field.value && field.value !== "Unknown");
}
