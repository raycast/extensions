import { Action, ActionPanel, Form, LaunchProps, popToRoot, showToast } from "@raycast/api";
import { useMasto } from "./hooks/masto";
import { FormValidation, useForm } from "@raycast/utils";
import { mastodon } from "masto";

interface Status {
  cw?: string;
  message: string;
  visibility: "public" | "unlisted" | "private" | "direct";
  date?: Date;
}

interface LaunchContext {
  replyTo?: mastodon.v1.Status;
}

export default function Post({
  draftValues,
  launchContext,
}: LaunchProps<{ draftValues: Status; launchContext: LaunchContext }>) {
  const masto = useMasto();

  const { handleSubmit, itemProps, values } = useForm<Status>({
    async onSubmit({ message, visibility, cw, date }) {
      await masto?.v1.statuses.create({
        inReplyToId: launchContext?.replyTo?.id,
        status: message,
        visibility,
        spoilerText: cw,
        scheduledAt: date?.toISOString(),
      });
      showToast({ title: date ? "Successfully scheduled." : "Successfully posted!" });
      popToRoot({ clearSearchBar: true });
    },
    validation: {
      visibility(value) {
        return ["public", "unlisted", "private", "direct"].includes(value ?? "") ? undefined : "Panic";
      },
      message: FormValidation.Required,
    },
    initialValues: {
      ...draftValues,
      message: launchContext?.replyTo && `@${launchContext.replyTo.account.acct}`,
      visibility: launchContext?.replyTo?.visibility
    }
  });

  return (
    <Form
      isLoading={!masto}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Post" onSubmit={handleSubmit} />
          <Action.PickDate
            title="Schedule Post"
            onChange={(date) => {
              if (!date) return;
              handleSubmit({ ...values, date });
            }}
          />
        </ActionPanel>
      }
    >
      {!!launchContext?.replyTo && <Form.Description title="Replying to" text={launchContext.replyTo.account.acct} />}
      <Form.TextField title="CW" {...itemProps.cw} />
      <Form.TextArea title="Message" {...itemProps.message} />
      {/* @ts-expect-error - The type safety is covered by validator and fixed items. */}
      <Form.Dropdown title="Visibility" {...itemProps.visibility}>
        <Form.Dropdown.Item key="public" value="public" title="Public" />
        <Form.Dropdown.Item key="unlisted" value="unlisted" title="Unlisted" />
        <Form.Dropdown.Item key="private" value="private" title="Private" />
        <Form.Dropdown.Item key="direct" value="direct" title="Mentioned Only" />
      </Form.Dropdown>
    </Form>
  );
}
