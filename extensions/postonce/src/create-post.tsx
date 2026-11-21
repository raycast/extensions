import { Action, ActionPanel, Form, Icon, LaunchProps, Toast, open, showToast } from "@raycast/api";
import { FormValidation, showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { randomUUID } from "crypto";
import { useRef } from "react";

import { DASHBOARD_URL, createPost, listAccounts } from "./api";
import { accountIcon, accountTitle, isHttpUrl } from "./utils";

interface PostForm {
  content: string;
  accounts: string[];
  mediaUrl: string;
  publishAt: Date | null;
}

export default function Command(props: LaunchProps<{ draftValues: PostForm }>) {
  const { data: accounts = [], isLoading } = useCachedPromise(listAccounts, [], {
    failureToastOptions: { title: "Could not load your PostOnce accounts" },
  });
  const activeAccounts = accounts.filter((account) => account.status === "active");
  // One key per post, so a retried submit never publishes twice
  const idempotencyKey = useRef(randomUUID());

  const { handleSubmit, itemProps, values, reset } = useForm<PostForm>({
    initialValues: props.draftValues || { content: "", accounts: [], mediaUrl: "", publishAt: null },
    async onSubmit(form) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Sending to PostOnce" });
      try {
        const mediaUrl = form.mediaUrl.trim();
        const post = await createPost(
          {
            content: form.content,
            targets: form.accounts.map((account_id) => ({ account_id })),
            ...(mediaUrl ? { media: [{ url: mediaUrl }] } : {}),
            ...(form.publishAt ? { publish_at: form.publishAt.toISOString() } : {}),
          },
          idempotencyKey.current,
        );
        idempotencyKey.current = randomUUID();
        reset({ content: "", accounts: [], mediaUrl: "", publishAt: null });
        toast.style = Toast.Style.Success;
        toast.title = post.publish_at ? "Post scheduled" : "Post sent";
        toast.primaryAction = {
          title: "Open in PostOnce",
          onAction: () => open(`${DASHBOARD_URL}/posts/${post.publish_at ? "scheduled" : "published"}`),
        };
      } catch (error) {
        await showFailureToast(error, { title: "Could not create post" });
      }
    },
    validation: {
      accounts: FormValidation.Required,
      content: (value) => {
        if (!value?.trim() && !values.mediaUrl?.trim()) return "Write a post or add a media URL";
      },
      mediaUrl: (value) => {
        if (value?.trim() && !isHttpUrl(value)) return "Enter an http or https URL";
      },
      publishAt: (value) => {
        if (value && value.getTime() <= Date.now()) return "Pick a time in the future";
      },
    },
  });

  return (
    <Form
      enableDrafts
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={values.publishAt ? "Schedule Post" : "Publish Post"}
            icon={Icon.Upload}
            onSubmit={handleSubmit}
          />
          <Action.OpenInBrowser title="Connect Accounts in PostOnce" url={`${DASHBOARD_URL}/accounts`} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Post"
        placeholder="What do you want to share?"
        info={`${values.content.length} characters`}
        {...itemProps.content}
      />
      <Form.TagPicker title="Accounts" {...itemProps.accounts}>
        {activeAccounts.map((account) => (
          <Form.TagPicker.Item
            key={account.id}
            value={account.id}
            title={accountTitle(account)}
            icon={accountIcon(account)}
          />
        ))}
      </Form.TagPicker>
      <Form.TextField
        title="Media URL"
        placeholder="https://example.com/image.png"
        info="Optional. A public link to an image or video."
        {...itemProps.mediaUrl}
      />
      <Form.DatePicker
        title="Schedule"
        type={Form.DatePicker.Type.DateTime}
        info="Leave empty to publish now."
        {...itemProps.publishAt}
      />
    </Form>
  );
}
