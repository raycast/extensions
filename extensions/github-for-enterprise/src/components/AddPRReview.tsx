import { ADD_PR_REVIEW, SUBMIT_PR_REVIEW } from "@/queries/pull-requests";
import { fetcher } from "@/utils";
import { ActionPanel, Form, showToast, Action, Toast, useNavigation } from "@raycast/api";
import { useSWRConfig } from "swr";

export default function AddPRReview({ id, title }: any) {
  const { mutate } = useSWRConfig();
  const { pop } = useNavigation();

  type FormValue = {
    body: string;
  };

  async function addReview(values: FormValue) {
    const { body } = values;

    showToast(Toast.Style.Animated, "Submitting review");

    try {
      const { addPullRequestReview } = await fetcher({
        document: ADD_PR_REVIEW,
        variables: {
          id,
          body,
        },
      });

      await fetcher({
        document: SUBMIT_PR_REVIEW,
        variables: {
          pullRequestId: id,
          body,
          pullRequestReviewId: addPullRequestReview.pullRequestReview.id,
          event: "COMMENT",
        },
      });

      mutate("prs");
      mutate("prs-open");
      showToast(Toast.Style.Success, "Review added successfully");
      pop();
    } catch (error: any) {
      showToast(Toast.Style.Failure, "Failed to add review", error instanceof Error ? error.message : error.toString());
    }
  }

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Review" onSubmit={addReview} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="body" title="Comment" placeholder="Leave a comment" />
    </Form>
  );
}
