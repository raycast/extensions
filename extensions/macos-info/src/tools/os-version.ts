import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "software",
    property: "os_version",
    formatValue: (value: string) => `Your macOS version is ${value}`,
    errorTitle: "Failed to get macOS version",
    unknownValue: "Unknown macOS version",
  });
}
