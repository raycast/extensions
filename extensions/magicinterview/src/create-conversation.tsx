import {
  Action,
  ActionPanel,
  Form,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useRef, useState } from "react";
import { callTool, Conversation, conversationUrl } from "./magicinterview";

type Values = {
  title: string;
  purpose: string;
  role: string;
  company: string;
  notes: string;
  speechLanguage: string;
};

export default function CreateConversation({
  onCreated,
}: { onCreated?: () => void } = {}) {
  const [loading, setLoading] = useState(false);
  const [titleError, setTitleError] = useState<string>();
  const pending = useRef(false);
  const [created, setCreated] = useState<Conversation>();

  async function submit(values: Values) {
    if (pending.current) return;
    if (created) {
      await open(conversationUrl(created));
      return;
    }
    if (!values.title.trim() || values.title.trim().length > 120) {
      setTitleError("Enter a title between 1 and 120 characters.");
      return;
    }
    pending.current = true;
    setLoading(true);
    let saved: Conversation | undefined;
    try {
      const result = await callTool<{ conversation: Conversation }>(
        "create_conversation",
        {
          ...values,
          title: values.title.trim(),
          activate: false,
        },
        true,
      );
      saved = result.conversation;
      setCreated(saved);
      onCreated?.();
      await showToast({
        style: Toast.Style.Success,
        title: "Conversation Created",
      });
    } catch (caught) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Create Conversation",
        message: caught instanceof Error ? caught.message : "Please try again.",
      });
    } finally {
      pending.current = false;
      setLoading(false);
    }
    if (saved) await open(conversationUrl(saved));
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={
              created ? "Open Created Conversation" : "Create Conversation"
            }
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          created
            ? "Saved in MagicInterview. Open the conversation to continue preparation."
            : "Save a conversation in General without switching your currently active conversation. Open it to prepare sources and start live coaching in MagicInterview."
        }
      />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Product engineer interview"
        error={titleError}
        onChange={() => setTitleError(undefined)}
      />
      <Form.Dropdown id="purpose" title="Purpose" defaultValue="interview">
        <Form.Dropdown.Item value="interview" title="Interview" />
        <Form.Dropdown.Item value="meeting" title="Meeting" />
        <Form.Dropdown.Item value="sales" title="Sales Call" />
        <Form.Dropdown.Item value="practice" title="Practice" />
      </Form.Dropdown>
      <Form.TextField
        id="company"
        title="Company"
        placeholder="Company or client"
      />
      <Form.TextField
        id="role"
        title="Role"
        placeholder="Your role in the conversation"
      />
      <Form.TextArea
        id="notes"
        title="Preparation Notes"
        placeholder="Agenda, goals, approved facts, and questions"
      />
      <Form.Dropdown
        id="speechLanguage"
        title="Speech Language"
        defaultValue="en-US"
      >
        <Form.Dropdown.Item value="en-US" title="English" />
        <Form.Dropdown.Item value="es-ES" title="Spanish" />
        <Form.Dropdown.Item value="fr-FR" title="French" />
        <Form.Dropdown.Item value="de-DE" title="German" />
        <Form.Dropdown.Item value="pt-PT" title="Portuguese" />
        <Form.Dropdown.Item value="zh-CN" title="Chinese (Mandarin)" />
        <Form.Dropdown.Item value="" title="Detect Automatically" />
      </Form.Dropdown>
    </Form>
  );
}
