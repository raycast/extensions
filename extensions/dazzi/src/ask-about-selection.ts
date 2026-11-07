import { getSelectedFinderItems, LaunchProps, showToast, Toast } from "@raycast/api";
import { askArgs, validateQuestion } from "./lib/dazzi";
import { runLauncher } from "./lib/launch";

/** Ask Dazzi about the files selected in Finder: they are attached to the question in a new AI Search tab. */
export default async function Command(props: LaunchProps<{ arguments: Arguments.AskAboutSelection }>): Promise<void> {
  const check = validateQuestion(props.arguments.question);
  if (!check.ok) {
    await showToast({
      style: Toast.Style.Failure,
      title: check.reason === "empty" ? "Type a question" : "The question is too long",
    });
    return;
  }
  const items = await getSelectedFinderItems().catch(() => []);
  if (items.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "Select files in Finder first" });
    return;
  }
  const count = items.length;
  await runLauncher(
    askArgs(
      check.question,
      items.map((item) => item.path),
    ),
    `Asked Dazzi about ${count} item${count === 1 ? "" : "s"}`,
  );
}
