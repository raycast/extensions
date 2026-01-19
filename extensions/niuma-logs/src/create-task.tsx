import {
  getPreferenceValues,
  LaunchProps,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { getApiClient } from "./api";
import { getStrings } from "./i18n";

export default async function CreateTask(
  props: LaunchProps<{ arguments: { title: string } }>,
) {
  const { title } = props.arguments;
  const strings = getStrings();

  const { repo } = getPreferenceValues();
  const client = getApiClient();

  try {
    await showToast({
      title: strings.toasts.recording,
      message: strings.toasts.recordingMessage(title),
      style: Toast.Style.Animated,
    });

    await client.Issues.CreateIssue({
      repo,
      post_issue_form: {
        title,
      } as Parameters<typeof client.Issues.CreateIssue>[0]["post_issue_form"],
    });
    await showHUD(
      strings.hud.create[Math.floor(Math.random() * strings.hud.create.length)],
    );
  } catch (error) {
    await showToast({
      title: strings.toasts.recordingFailed,
      message:
        error instanceof Error ? error.message : strings.toasts.errorUnknown,
      style: Toast.Style.Failure,
    });
  }
}
