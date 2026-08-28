import { Action, ActionPanel, Form, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { api, TwosList } from "./api";

interface Values {
  list_id: string;
  text: string;
  type: string;
  url: string;
}

export default function AddThing() {
  const [lists, setLists] = useState<TwosList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ lists: TwosList[] }>("/lists");
        setLists(data.lists || []);
      } catch (e) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't load lists",
          message: String(e),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(values: Values) {
    if (!values.list_id) {
      await showToast({ style: Toast.Style.Failure, title: "Pick a list" });
      return;
    }
    if (!values.text.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Enter some text" });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding…",
    });
    try {
      const body: Record<string, unknown> = {
        list_id: values.list_id,
        text: values.text,
      };
      if (values.type) body.type = values.type;
      if (values.url) body.url = values.url;
      await api("/things", { method: "POST", body: JSON.stringify(body) });
      toast.style = Toast.Style.Success;
      toast.title = "Added to Twos";
      await popToRoot();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't add";
      toast.message = String(e);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.PlusCircle} title="Add Thing" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="list_id" title="List">
        {lists.map((l) => (
          <Form.Dropdown.Item key={l.id} value={l.id} title={`${l.emoji || ""} ${l.title}`.trim()} />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="text" title="Text" placeholder="Buy oat milk" autoFocus />
      <Form.Dropdown id="type" title="Type" defaultValue="">
        <Form.Dropdown.Item value="" title="Default" />
        <Form.Dropdown.Item value="todo" title="To-do (checkbox)" />
        <Form.Dropdown.Item value="note" title="Note (plain)" />
        <Form.Dropdown.Item value="dash" title="Dash" />
        <Form.Dropdown.Item value="number" title="Numbered" />
        <Form.Dropdown.Item value="bullet" title="Bullet" />
      </Form.Dropdown>
      <Form.TextField id="url" title="Hyperlink" placeholder="https://… (optional)" />
    </Form>
  );
}
