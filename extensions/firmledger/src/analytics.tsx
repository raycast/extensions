import { Icon } from "@raycast/api";
import { ToolAction } from "./components/actions";
import { ToolResult } from "./components/ToolResult";

export default function Command() {
  return (
    <ToolResult
      toolName="get_analytics"
      extraActions={<ToolAction tool="get_analytics" form title="Analytics for One Listing…" icon={Icon.BarChart} />}
    />
  );
}
