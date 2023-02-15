import { showHUD, Clipboard, LaunchProps, showToast, Toast } from "@raycast/api";
import { getJiraClient } from "./jira_client";
import { getRocketLink } from "./utils";

interface Issue {
  key: string;
}

export default async function copyRocketLink(props: LaunchProps<{ arguments: Issue }>) {
  const { key } = props.arguments;

  const jiraClient = getJiraClient();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Getting Issue info",
  });

  try {
    const issue = await jiraClient.findIssue(key, "key,summary");

    await Clipboard.copy(getRocketLink(issue));

    await showHUD(`📋 Copied link to issue ${key}`);
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = `${err}`;
    return;
  }
}
