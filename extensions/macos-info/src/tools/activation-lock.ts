import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "hardware",
    property: "activation_lock_status",
    formatValue: (value) => `Your Mac's activation lock status is ${value}`,
    errorTitle: "Failed to get activation lock status",
    unknownValue: "Unknown activation lock status",
  });
}
