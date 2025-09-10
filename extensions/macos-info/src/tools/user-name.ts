import { createTool, ToolResult } from "../utils/tool";

export default function tool(): Promise<ToolResult> {
  return createTool({
    type: "software",
    property: "user_name",
    formatValue: (value) => `The current user is ${value}`,
    errorTitle: "Failed to get user name",
    unknownValue: "Unknown user name",
  });
}
