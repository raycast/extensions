import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "software",
    property: "system_integrity",
    formatValue: (value) => `Your Mac's system integrity status is ${value}`,
    errorTitle: "Failed to get system integrity status",
    unknownValue: "Unknown system integrity status",
  });
}
