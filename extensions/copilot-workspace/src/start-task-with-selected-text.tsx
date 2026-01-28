import { LaunchProps, getSelectedText, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { validateRepo } from "./validate-repo";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.StartTaskWithSelectedText }>,
) {
  const repo = props.arguments.repo || "githubnext/workspace-blank";

  if (!validateRepo(repo)) {
    await showFailureToast(
      "Please provide a valid repository name in the format owner/repo",
    );
    return;
  }

  try {
    const selectedText = await getSelectedText();

    if (!selectedText) {
      throw new Error();
    }

    open(
      `https://copilot-workspace.githubnext.com/${repo}?task=${encodeURIComponent(
        selectedText,
      )}`,
    );
  } catch (error) {
    open(`https://copilot-workspace.githubnext.com/${repo}`);
  }
}
