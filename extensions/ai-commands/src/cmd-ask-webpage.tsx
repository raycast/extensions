import { LaunchProps } from "@raycast/api";
import { CommandAnswer } from "./lib/settings/enum";
import { handleNoViewCommand } from "./lib/ui/AnswerView/function";

export default async function Command(props: LaunchProps<{ arguments: Arguments.CmdAskWebpage }>) {
  await handleNoViewCommand(CommandAnswer.ASK_WEBPAGE, {
    query: props.arguments.query,
  });
}
