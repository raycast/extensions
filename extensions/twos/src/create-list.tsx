import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { api } from "./api";

interface Values {
  title: string;
  emoji: string;
}

export default function CreateList() {
  async function handleSubmit(values: Values) {
    if (!values.title.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a title" });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating…",
    });
    try {
      const body: Record<string, unknown> = { title: values.title };
      if (values.emoji) body.emoji = values.emoji;
      await api("/lists", { method: "POST", body: JSON.stringify(body) });
      toast.style = Toast.Style.Success;
      toast.title = "List created";
      await popToRoot();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't create list";
      toast.message = String(e);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.PlusCircle} title="Create List" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Groceries" autoFocus />
      <Form.TextField id="emoji" title="Emoji" placeholder="🛒 (optional)" />
    </Form>
  );
}
