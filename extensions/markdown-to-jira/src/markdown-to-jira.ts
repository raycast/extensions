import { showHUD, Clipboard, getSelectedText, showToast, Toast } from "@raycast/api";
import jira2md from "jira2md";

export default async function main() {
  try {
    const markdown = await getSelectedText();
    const jiraMarkup = jira2md.to_jira(markdown);

    await Clipboard.paste(jiraMarkup);
    await Clipboard.copy(jiraMarkup);

    await showHUD("Successfully converted Markdown to Jira markup!");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to convert Markdown to Jira markup",
      message: String(error),
    });
  }
}
