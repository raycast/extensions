import { LaunchProps } from "@raycast/api";
import ToolCommand from "./components/tool-command";
import ManageTools from "./manage-tools";

export default function Command({
  arguments: args,
}: LaunchProps<{ arguments: { tool?: string; query?: string } }>) {
  return args.tool ? (
    <ToolCommand id={args.tool} initialQuery={args.query} />
  ) : (
    <ManageTools />
  );
}
