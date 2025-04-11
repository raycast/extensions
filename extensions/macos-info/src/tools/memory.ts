import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "hardware",
    property: "physical_memory",
    formatValue: (value) => `Your Mac has ${value} of physical memory`,
    errorTitle: "Failed to get physical memory",
    unknownValue: "Unknown physical memory",
  });
}
