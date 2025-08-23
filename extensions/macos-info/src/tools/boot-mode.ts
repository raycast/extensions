import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "software",
    property: "boot_mode",
    formatValue: (value) => `Your Mac's boot mode is ${value}`,
    errorTitle: "Failed to get boot mode",
    unknownValue: "Unknown boot mode",
  });
}
