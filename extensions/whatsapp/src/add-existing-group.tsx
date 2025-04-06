import { ActionPanel, Form, popToRoot, showToast, Action, Toast } from "@raycast/api";
import { GroupChat } from "./utils/types";
import { useWhatsAppChats } from "./utils/use-whatsapp-chats";
import { saveWhatsappGroup } from "./services/saveWhatsappGroup";

interface WhatsAppGroupChatFormProps {
  defaultValue?: GroupChat;
}

interface FormValues extends Omit<GroupChat, "id" | "pinned"> {
  pinned: 0 | 1;
}

export default function WhatsAppGroupChatForm({ defaultValue }: WhatsAppGroupChatFormProps) {
  const [chats, setChats] = useWhatsAppChats();

  async function handleSubmit(formValues: FormValues) {
    try {
      await saveWhatsappGroup({
        chat: {
          ...defaultValue,
          ...formValues,
          pinned: !!formValues.pinned,
        },
        chats,
        setChats,
      });
      await showToast(Toast.Style.Success, `Saved group`, formValues.name);
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      await showToast(Toast.Style.Failure, (error as Error).message);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Group" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Raycasters" defaultValue={defaultValue?.name} />
      <Form.TextField
        id="groupCode"
        title="Group Code"
        placeholder="LkXPP0Lij10I3OYynP3MXb"
        defaultValue={defaultValue?.groupCode}
      />
      <Form.Checkbox id="pinned" label="Pinned Chat" defaultValue={defaultValue?.pinned} />
    </Form>
  );
}
