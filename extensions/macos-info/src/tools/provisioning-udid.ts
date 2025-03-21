import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "hardware",
    property: "provisioning_UDID",
    formatValue: (value) => `Your Mac's provisioning UDID is ${value}`,
    errorTitle: "Failed to get provisioning UDID",
    unknownValue: "Unknown provisioning UDID",
  });
}
