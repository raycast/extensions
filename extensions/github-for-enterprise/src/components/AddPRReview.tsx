import { ADD_PR_REVIEW, SUBMIT_PR_REVIEW } from "@/queries/pull-requests";
import { fetcher } from "@/utils";
import { ActionPanel, Form, FormValues, showToast, SubmitFormAction, ToastStyle, useNavigation } from "@raycast/api";
import React from "react";
import { useSWRConfig } from "swr";

export default function AddPRReview({ id, title }: any) {
  const { mutate } = useSWRConfig();
  const { pop } = useNavigation();

  async function addReview(values: FormValues) {
    const { body } = values;

    showToast(ToastStyle.Animated, "Submitting review");

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
      showToast(ToastStyle.Success, "Review added successfully");
      pop();
    } catch (error: any) {
      showToast(ToastStyle.Failure, "Failed to add review", error instanceof Error ? error.message : error.toString());
    }
  }

  return (
    <Form
      navigationTitle={title}
      onSubmit={addReview}
      actions={
        <ActionPanel>
          <SubmitFormAction title="Add Review" onSubmit={addReview} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="body" title="Comment" placeholder="Leave a comment" />
    </Form>
  );
}
