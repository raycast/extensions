import { Action, ActionPanel, Form, Icon, LaunchProps, popToRoot, showToast } from "@raycast/api";
import { useInstance, useMasto } from "./hooks/masto";
import { useForm } from "@raycast/utils";
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
  const { data: instance, isLoading } = useInstance(masto);

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
      message(value) {
        if (!value) return "A message is required.";

        // FIXME: Should account for characters_reserved_per_url
        const maxLen = instance?.configuration.statuses.maxCharacters ?? 500;
        if (value.length > maxLen) return `A message should be shorter than ${maxLen} characters.`;
      },
    },
    initialValues: {
      ...draftValues,
      message: launchContext?.replyTo && `@${launchContext.replyTo.account.acct}`,
      visibility: launchContext?.replyTo?.visibility,
    },
  });

  return (
    <Form
      isLoading={!masto || isLoading}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Post" icon={Icon.Bubble} onSubmit={handleSubmit} />
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
      <Form.TextArea title="Message" autoFocus {...itemProps.message} />
      {/* @ts-expect-error - The type safety is covered by validator and fixed items. */}
      <Form.Dropdown title="Visibility" {...itemProps.visibility}>
        <Form.Dropdown.Item key="public" value="public" title="Public" icon={Icon.Globe} />
        <Form.Dropdown.Item key="unlisted" value="unlisted" title="Unlisted" icon={Icon.LockUnlocked} />
        <Form.Dropdown.Item key="private" value="private" title="Private" icon={Icon.Lock} />
        <Form.Dropdown.Item key="direct" value="direct" title="Mentioned Only" icon={Icon.AtSymbol} />
      </Form.Dropdown>
    </Form>
  );
}
