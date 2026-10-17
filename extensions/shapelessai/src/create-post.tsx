import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Keyboard,
  Toast,
  open,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { accountLabel, createPost, listConnections } from "./api";

type Values = {
  connectionId: string;
  postText: string;
  when: string;
  scheduledAt: Date | null;
};

export default function Command() {
  const { data: accounts, isLoading, revalidate } = usePromise(listConnections);
  const { handleSubmit, itemProps, values } = useForm<Values>({
    initialValues: { when: "queue" },
    validation: {
      connectionId: (v) => (v ? undefined : "Pick an account"),
      postText: (v) => (v?.trim() ? undefined : "Write the post"),
    },
    async onSubmit(v) {
      if (v.when === "at" && !v.scheduledAt) {
        await showToast({ style: Toast.Style.Failure, title: "Pick a time" });
        return;
      }
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Sending to ShapelessAI",
      });
      try {
        const post = await createPost({
          connectionId: v.connectionId,
          postText: v.postText,
          scheduledAt:
            v.when === "at" && v.scheduledAt
              ? v.scheduledAt.toISOString()
              : undefined,
          publishNow: v.when === "now",
        });
        toast.style = Toast.Style.Success;
        toast.title = post.status === "published" ? "Posted" : "Scheduled";
        toast.message = post.scheduledAt
          ? new Date(post.scheduledAt).toLocaleString()
          : undefined;
        await popToRoot();
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.title = "Not sent";
        toast.message = (e as Error).message;
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Post" onSubmit={handleSubmit} />
          <Action
            title="Connect an Account"
            onAction={() => open("https://shapelessai.com/settings")}
          />
          <Action
            title="Reload Accounts"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Account" {...itemProps.connectionId}>
        {(accounts ?? []).map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={accountLabel(c)} />
        ))}
      </Form.Dropdown>
      <Form.TextArea title="Text" {...itemProps.postText} />
      <Form.Dropdown title="When" {...itemProps.when}>
        <Form.Dropdown.Item value="queue" title="Next free slot in the queue" />
        <Form.Dropdown.Item value="at" title="At a set time" />
        <Form.Dropdown.Item value="now" title="Now" />
      </Form.Dropdown>
      {values.when === "at" ? (
        <Form.DatePicker title="Schedule At" {...itemProps.scheduledAt} />
      ) : null}
    </Form>
  );
}
