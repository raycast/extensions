import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "software",
    property: "kernel_version",
    formatValue: (value) => `Your Mac's kernel version is ${value}`,
    errorTitle: "Failed to get kernel version",
    unknownValue: "Unknown kernel version",
  });
}
