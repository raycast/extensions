import ToolCommand from "./components/tool-command";
import { LaunchProps } from "@raycast/api";

export default function Command({
  arguments: args,
}: LaunchProps<{ arguments: { query?: string } }>) {
  return <ToolCommand id="ask-ai" initialQuery={args.query} />;
}
