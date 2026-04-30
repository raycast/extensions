import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { requestChanges } from "../github/actions";
import { PullRequest } from "../github/types/pr";
import { Preferences } from "./types";

export function RequestChangesForm({
  pr,
  repoName,
  preferences,
  onSubmit,
}: {
  pr: PullRequest;
  repoName: string;
  preferences: Preferences;
  onSubmit: () => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { body: string }) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Requesting changes..." });
    try {
      await requestChanges(preferences.githubEnterpriseUrl, preferences.githubToken, repoName, pr.number, values.body);
      toast.style = Toast.Style.Success;
      toast.title = "Changes requested";
      onSubmit();
      pop();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to request changes";
      toast.message = String(err);
    }
  }

  return (
    <Form
      navigationTitle={`Request Changes — #${pr.number}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Review" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Pull Request" text={`${pr.title} (#${pr.number})`} />
      <Form.TextArea id="body" title="Comment" placeholder="Describe the changes needed..." enableMarkdown />
    </Form>
  );
}
