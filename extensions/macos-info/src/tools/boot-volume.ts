import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "software",
    property: "boot_volume",
    formatValue: (value) => `Your Mac's boot volume is ${value}`,
    errorTitle: "Failed to get boot volume",
    unknownValue: "Unknown boot volume",
  });
}
