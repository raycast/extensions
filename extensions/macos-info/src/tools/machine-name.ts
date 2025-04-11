import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "hardware",
    property: "machine_name",
    formatValue: (value) => `Your Mac's name is ${value}`,
    errorTitle: "Failed to get machine name",
    unknownValue: "Unknown machine name",
  });
}
