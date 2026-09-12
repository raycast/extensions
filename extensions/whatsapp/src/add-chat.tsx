import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { PhoneChat } from "./utils/types";
import { useWhatsAppChats } from "./utils/use-whatsapp-chats";
import { saveChat } from "./services/saveChat";

interface WhatsAppPhoneChatFormProps {
  defaultValue?: PhoneChat;
}

interface FormValues extends Omit<PhoneChat, "id" | "pinned"> {
  pinned: 0 | 1;
}

export default function WhatsAppPhoneChatForm({ defaultValue }: WhatsAppPhoneChatFormProps) {
  const [chats, setChats] = useWhatsAppChats();
  async function handleSubmit(formValues: FormValues) {
    try {
      await saveChat({
        chat: {
          ...defaultValue,
          ...formValues,
          pinned: !!formValues.pinned,
        },
        chats,
        setChats,
      });
      await showToast(Toast.Style.Success, `Saved chat`, formValues.name);
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      await showToast(Toast.Style.Failure, (error as Error).message);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Chat" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="John Doe" defaultValue={defaultValue?.name} />
      <Form.TextField id="phone" title="Phone" placeholder="+1 (817) 569-8900" defaultValue={defaultValue?.phone} />
      <Form.Checkbox id="pinned" label="Pinned Chat" defaultValue={defaultValue?.pinned} />
    </Form>
  );
}
