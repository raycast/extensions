import { LaunchProps } from "@raycast/api";
import { CommandAnswer } from "./lib/settings/enum";
import { handleNoViewCommand } from "./lib/ui/AnswerView/function";

export default async function Command(props: LaunchProps<{ arguments: Arguments.CmdTranslate }>) {
  await handleNoViewCommand(CommandAnswer.TRANSLATE, {
    source: props.arguments.source,
    target: props.arguments.target,
  });
}
