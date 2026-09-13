import { LaunchProps } from "@raycast/api";
import { CommandAnswer } from "./lib/settings/enum";
import { handleNoViewCommand } from "./lib/ui/AnswerView/function";

export default async function Command(props: LaunchProps<{ arguments: Arguments.CmdAskSelectedText }>) {
  await handleNoViewCommand(CommandAnswer.ASK_SELECTED_TEXT, {
    query: props.arguments.query,
  });
}
