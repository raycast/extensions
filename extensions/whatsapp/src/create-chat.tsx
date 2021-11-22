import { ActionPanel, Form, popToRoot, randomId, showToast, SubmitFormAction, ToastStyle } from "@raycast/api";
import { WhatsAppChat } from "./utils/types";
import { useWhatsAppChats } from "./utils/use-whatsapp-chats";
import { phone as parsePhone } from "phone";

interface AddChatFormProps {
  defaultValues?: WhatsAppChat;
}

interface FormValues extends Omit<WhatsAppChat, "id" | "pinned"> {
  pinned: 0 | 1;
}

export default function WhatsAppChatForm({ defaultValues }: AddChatFormProps) {
  const [chats, setChats] = useWhatsAppChats();

  const isCreation = !defaultValues;

  async function handleSubmit(formValues: FormValues) {
    const phoneInformation = parsePhone(formValues.phone);

    if (!phoneInformation.isValid) {
      await showToast(ToastStyle.Failure, "Invalid phone format");
      return;
    }

    const savedChat: WhatsAppChat = {
      id: isCreation ? randomId() : defaultValues.id,
      name: formValues.name,
      pinned: !!formValues.pinned,
      phone: phoneInformation.phoneNumber
    };

    const isNewPhoneNumber = isCreation || savedChat.phone !== defaultValues.phone;
    const doesPhoneNumberAlreadyExist = chats.some(chat => chat.phone === phoneInformation.phoneNumber);

    if (isNewPhoneNumber && doesPhoneNumberAlreadyExist) {
      await showToast(ToastStyle.Failure, "Chat already exists");
      return;
    }

    if (isCreation) {
      setChats([...chats, savedChat]);
      await showToast(ToastStyle.Success, `Created new chat`, savedChat.name);
    } else {
      const newChats = chats.map(chat => {
        if (chat.id === savedChat.id) {
          return savedChat;
        }
        return chat;
      });
      setChats(newChats);
      await showToast(ToastStyle.Success, `Updated existing chat`, savedChat.name);
    }

    await popToRoot({ clearSearchBar: true });
  }

  return (
    <Form
      navigationTitle={isCreation ? "Add Chat" : "Edit Chat"}
      actions={
        <ActionPanel>
          <SubmitFormAction title="Save Chat" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="John Doe" defaultValue={defaultValues?.name} />
      <Form.TextField id="phone" title="Phone" placeholder="+1 (817) 569-8900"
                      defaultValue={defaultValues?.phone} />
      <Form.Checkbox label="Pinned Chat" id="pinned" defaultValue={defaultValues?.pinned} />
    </Form>
  );
}