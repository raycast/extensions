import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "software",
    property: "secure_vm",
    formatValue: (value) => `Your Mac's secure VM status is ${value}`,
    errorTitle: "Failed to get secure VM status",
    unknownValue: "Unknown secure VM status",
  });
}
