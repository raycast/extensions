import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "hardware",
    property: "boot_rom_version",
    formatValue: (value) => `Your Mac's Boot ROM version is ${value}`,
    errorTitle: "Failed to get Boot ROM version",
    unknownValue: "Unknown Boot ROM version",
  });
}
