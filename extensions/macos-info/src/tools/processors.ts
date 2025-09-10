import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "hardware",
    property: "number_processors",
    formatValue: (value) => `Your Mac has ${value} processors`,
    errorTitle: "Failed to get processor information",
    unknownValue: "Unknown processor information",
  });
}
