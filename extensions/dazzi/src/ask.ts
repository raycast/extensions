import { LaunchProps, showToast, Toast } from "@raycast/api";
import { askArgs, validateQuestion } from "./lib/dazzi";
import { runLauncher } from "./lib/launch";

/** Ask Dazzi: the question opens in a new AI Search tab of the running (or newly started) Dazzi. */
export default async function Command(props: LaunchProps<{ arguments: Arguments.Ask }>): Promise<void> {
  const check = validateQuestion(props.arguments.question);
  if (!check.ok) {
    await showToast({
      style: Toast.Style.Failure,
      title: check.reason === "empty" ? "Type a question" : "The question is too long",
    });
    return;
  }
  await runLauncher(askArgs(check.question, []), "Asked Dazzi");
}
