import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "hardware",
    property: "model_number",
    formatValue: (value) => `Your Mac's model number is ${value}`,
    errorTitle: "Failed to get model number",
    unknownValue: "Unknown model number",
  });
}
