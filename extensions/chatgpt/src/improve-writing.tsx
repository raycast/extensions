import CommandView from "./views/command/command-view";
import { IMPROVE_WRITING_COMMAND_ID } from "./hooks/useCommand";
import { LaunchProps } from "@raycast/api";

export default function ImproveWriting(props: LaunchProps) {
  return <CommandView {...props} launchContext={{ commandId: IMPROVE_WRITING_COMMAND_ID }} />;
}
