import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "software",
    property: "uptime",
    formatValue: (value) => `Your Mac's uptime is ${value}`,
    errorTitle: "Failed to get uptime",
    unknownValue: "Unknown uptime",
  });
}
