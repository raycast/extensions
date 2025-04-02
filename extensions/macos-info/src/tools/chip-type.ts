import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "hardware",
    property: "chip_type",
    formatValue: (value) => `Your Mac has a ${value} chip`,
    errorTitle: "Failed to get chip type",
    unknownValue: "Unknown chip type",
  });
}
