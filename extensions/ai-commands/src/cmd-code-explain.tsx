import { CommandAnswer } from "./lib/settings/enum";
import { handleNoViewCommand } from "./lib/ui/AnswerView/function";

export default async function Command() {
  await handleNoViewCommand(CommandAnswer.CODE_EXPLAIN);
}
