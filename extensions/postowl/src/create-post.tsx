import { Form, ActionPanel, Action, showToast, Toast, open, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { CreatePostValues } from "./types";
import { FormValidation, useForm } from "@raycast/utils";
import { createDraft, getAccounts, getCurrentUser } from "./postowl";

export default function Command() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [splitContent, setSplitContent] = useState<boolean>(false);
  const { handleSubmit, reset, focus, itemProps } = useForm<CreatePostValues>({
    initialValues: {
      userId: "",
      posts: "",
      accountId: "",
    },
    onSubmit: async (values) => {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating Post",
      });

      try {
        const draft = await createDraft(values, userId, splitContent);

        reset({
          posts: "",
          accountId: "",
          userId: userId,
        });

        focus("posts");

        await showToast({
          style: Toast.Style.Success,
          title: "Created post",
          primaryAction: {
            title: "Open Post",
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            onAction: async (toast) => {
              await toast.hide();
              await open(`https://postowl.com/posts/${draft.id}`);
            },
          },
          secondaryAction: {
            title: "Copy Post URL",
            shortcut: { modifiers: ["cmd", "shift"], key: "c" },
            onAction: async (toast) => {
              await toast.hide();
              await Clipboard.copy(`https://postowl.com/posts/${draft.id}`);
            },
          },
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed creating post",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    validation: {
      posts: FormValidation.Required,
      accountId: FormValidation.Required,
    },
  });

  // Fetch user and accounts when component mounts
  useEffect(() => {
    async function fetchData() {
      try {
        const user = await getCurrentUser();
        const userAccounts = await getAccounts();
        setAccounts(userAccounts);
        setUserId(user.id);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load accounts",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Post" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Dropdown title="Account" {...itemProps.accountId}>
        {accounts.map((account) => (
          <Form.Dropdown.Item
            key={account.account_id}
            value={account.account_id}
            title={account.name || account.username || account.account_id}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea title="Content" placeholder="Aa.." autoFocus {...itemProps.posts} />
      <Form.Checkbox
        title="Threads"
        label="Split content into multiple posts"
        id="splitContent"
        onChange={(value) => setSplitContent(value)}
      />
      <Form.Separator />
      <Form.DatePicker title="Schedule at" {...itemProps.scheduled_for} />
    </Form>
  );
}
