import { Action, ActionPanel, Form, Icon, LaunchProps, popToRoot, showToast } from "@raycast/api";
import { useInstance, useMasto } from "./hooks/masto";
import { useForm } from "@raycast/utils";
import { mastodon } from "masto";
import { stripHtml } from "string-strip-html";

interface Draft {
  cw?: string;
  message: string;
  visibility: "public" | "unlisted" | "private" | "direct";
  date?: Date;
}

type Status = mastodon.v1.Status;

interface LaunchContext {
  status?: Status;
  replyTo?: Status;
  action?: "post" | "edit";
}

export default function Post({
  draftValues,
  launchContext,
}: LaunchProps<{ draftValues: Draft; launchContext: LaunchContext }>) {
  const masto = useMasto();
  const { data: instance, isLoading } = useInstance(masto);
  const isEdit = launchContext?.action === "edit";
  const contextStatus = launchContext?.replyTo ?? launchContext?.status;

  const { handleSubmit, itemProps, values } = useForm<Draft>({
    async onSubmit({ message, visibility, cw, date }) {
      if (launchContext?.action === "edit" && launchContext.status)
        await masto?.v1.statuses.update(launchContext.status.id, {
          inReplyToId: launchContext.status.inReplyToId,
          status: message,
          visibility,
          spoilerText: cw,
        });
      else
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
      message: launchContext?.replyTo
        ? `@${launchContext.replyTo.account.acct}`
        : launchContext?.status?.text ?? undefined,
      cw: contextStatus?.spoilerText,
      visibility: contextStatus?.visibility,
    },
  });

  return (
    <Form
      isLoading={!masto || isLoading}
      enableDrafts={!launchContext?.replyTo || isEdit}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Edit" : "Post"}
            icon={isEdit ? Icon.Pencil : Icon.Bubble}
            onSubmit={handleSubmit}
          />
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
