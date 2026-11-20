import { LaunchProps } from "@raycast/api";
import { ToolForm } from "./components/ToolForm";
import { ToolResult } from "./components/ToolResult";

export default function Command(props: LaunchProps<{ arguments: { domain?: string } }>) {
  const domain = props.arguments?.domain?.trim();
  if (domain) return <ToolResult toolName="check_domain" args={{ domain }} />;
  return <ToolForm toolName="check_domain" />;
}
