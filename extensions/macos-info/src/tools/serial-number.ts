import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "hardware",
    property: "serial_number",
    formatValue: (value) => `Your Mac's serial number is ${value}`,
    errorTitle: "Failed to get serial number",
    unknownValue: "Unknown serial number",
  });
}
