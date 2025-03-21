import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "software",
    property: "local_host_name",
    formatValue: (value) => `Your Mac's local host name is ${value}`,
    errorTitle: "Failed to get local host name",
    unknownValue: "Unknown local host name",
  });
}
