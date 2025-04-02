import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "hardware",
    property: "os_loader_version",
    formatValue: (value) => `Your Mac's OS loader version is ${value}`,
    errorTitle: "Failed to get OS loader version",
    unknownValue: "Unknown OS loader version",
  });
}
