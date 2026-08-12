import {
  getPreferenceValues,
  LaunchProps,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { getApiClient } from "./api";

const hudCreateMessages = [
  "💪 Task recorded successfully, let's get to work!",
  "🍊 Time to take a break - I'll be here when you're ready",
  "💾 Successfully saved, your brain RAM is now freed up",
];
const recordingToast = "Recording task...";
const recordingFailedToast = "Failed to record task...";
const errorUnknownToast = "Unknown error";
const recordingMessage = (title: string) => `🐮 Recording task: ${title}`;

export default async function CreateTask(
  props: LaunchProps<{ arguments: { title: string } }>,
) {
  const { title } = props.arguments;

  const { repo } = getPreferenceValues();
  const client = getApiClient();

  try {
    await showToast({
      title: recordingToast,
      message: recordingMessage(title),
      style: Toast.Style.Animated,
    });

    await client.Issues.CreateIssue({
      repo,
      post_issue_form: {
        title,
      } as Parameters<typeof client.Issues.CreateIssue>[0]["post_issue_form"],
    });
    await showHUD(
      hudCreateMessages[Math.floor(Math.random() * hudCreateMessages.length)],
    );
  } catch (error) {
    await showToast({
      title: recordingFailedToast,
      message: error instanceof Error ? error.message : errorUnknownToast,
      style: Toast.Style.Failure,
    });
  }
}
