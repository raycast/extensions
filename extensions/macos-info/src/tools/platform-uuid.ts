import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "hardware",
    property: "platform_UUID",
    formatValue: (value) => `Your Mac's platform UUID is ${value}`,
    errorTitle: "Failed to get platform UUID",
    unknownValue: "Unknown platform UUID",
  });
}
