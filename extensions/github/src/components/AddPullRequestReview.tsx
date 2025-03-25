import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";
import { PullRequestReviewEvent } from "../generated/graphql";
import { getErrorMessage } from "../helpers/errors";

import { PullRequest } from "./PullRequestActions";

type AddPullRequestReviewValues = {
  comment: string;
  event: string;
};

type AddPullRequestReviewProps = {
  pullRequest: PullRequest;
  mutate: () => Promise<void>;
};

export default function AddPullRequestReview({ pullRequest, mutate }: AddPullRequestReviewProps) {
  const { github } = getGitHubClient();

  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<AddPullRequestReviewValues>({
    async onSubmit(values) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Adding Review" });

        await github.addPullRequestReview({
          nodeId: pullRequest.id,
          body: values.comment,
          event: values.event as PullRequestReviewEvent,
        });
        await mutate();

        pop();

        await showToast({
          style: Toast.Style.Success,
          title: "Review added",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to add review",
          message: getErrorMessage(error),
        });
      }
    },
    validation: { comment: FormValidation.Required },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.comment}
        title="Comment"
        placeholder="Add your comments here (markdown is supported)"
        enableMarkdown
      />

      <Form.Dropdown {...itemProps.event} title="Review Type">
        <Form.Dropdown.Item title="Comment" value={PullRequestReviewEvent.Comment} />

        <Form.Dropdown.Item title="Approve" value={PullRequestReviewEvent.Approve} />

        <Form.Dropdown.Item title="Request changes" value={PullRequestReviewEvent.RequestChanges} />
      </Form.Dropdown>
    </Form>
  );
}
