import { ActionPanel, Form, popToRoot, showToast, Action, Toast } from "@raycast/api";
import { GroupChat, isGroupChat } from "./utils/types";
import { useWhatsAppChats } from "./utils/use-whatsapp-chats";
import { nanoid as randomId } from "nanoid";

interface WhatsAppGroupChatFormProps {
  defaultValue?: GroupChat;
}

interface FormValues extends Omit<GroupChat, "id" | "pinned"> {
  pinned: 0 | 1;
}

export default function WhatsAppGroupChatForm({ defaultValue }: WhatsAppGroupChatFormProps) {
  const [chats, setChats] = useWhatsAppChats();
  const isCreation = !defaultValue;

  async function handleSubmit(formValues: FormValues) {
    if (!formValues.groupCode) {
      await showToast(Toast.Style.Failure, "Group Code is required");
      return;
    }

    const savedChat: GroupChat = {
      id: isCreation ? randomId() : defaultValue.id,
      name: formValues.name,
      pinned: !!formValues.pinned,
      groupCode: formValues.groupCode,
    };

    const isNewGroupCode = isCreation || savedChat.groupCode !== defaultValue.groupCode;
    const doesPhoneNumberAlreadyExist = chats
      .filter(isGroupChat)
      .some((chat) => chat.groupCode === savedChat.groupCode);

    if (isNewGroupCode && doesPhoneNumberAlreadyExist) {
      await showToast(Toast.Style.Failure, "Chat already exists");
      return;
    }

    if (isCreation) {
      setChats([...chats, savedChat]);
      await showToast(Toast.Style.Success, `Created new group`, savedChat.name);
    } else {
      const newChats = chats.map((chat) => {
        if (chat.id === savedChat.id) {
          return savedChat;
        }
        return chat;
      });
      setChats(newChats);
      await showToast(Toast.Style.Success, `Updated existing group`, savedChat.name);
    }

    await popToRoot({ clearSearchBar: true });
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
