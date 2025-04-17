import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "hardware",
    property: "machine_model",
    formatValue: (value) => `Your Mac's model is ${value}`,
    errorTitle: "Failed to get machine model",
    unknownValue: "Unknown machine model",
  });
}
