import { ActionPanel, Form, popToRoot, randomId, showToast, SubmitFormAction, ToastStyle } from "@raycast/api";
import { isPhoneChat, PhoneChat, WhatsAppChat } from "./utils/types";
import { useWhatsAppChats } from "./utils/use-whatsapp-chats";
import { phone as parsePhone } from "phone";

interface WhatsAppPhoneChatFormProps {
  defaultValue?: PhoneChat;
}

interface FormValues extends Omit<PhoneChat, "id" | "pinned"> {
  pinned: 0 | 1;
}

export default function WhatsAppPhoneChatForm({ defaultValue }: WhatsAppPhoneChatFormProps) {
  const { chats, updateChats } = useWhatsAppChats();
  const isCreation = !defaultValue;

  async function handleSubmit(formValues: FormValues) {
    const phoneInformation = parsePhone(formValues.phone);

    if (!phoneInformation.isValid) {
      await showToast(ToastStyle.Failure, "Invalid phone format");
      return;
    }

    const savedChat: WhatsAppChat = {
      id: isCreation ? randomId() : defaultValue.id,
      name: formValues.name,
      pinned: !!formValues.pinned,
      phone: phoneInformation.phoneNumber,
    };

    const isNewPhoneNumber = isCreation || savedChat.phone !== defaultValue.phone;
    const doesPhoneNumberAlreadyExist = chats
      .filter(isPhoneChat)
      .some((chat) => chat.phone === phoneInformation.phoneNumber);

    if (isNewPhoneNumber && doesPhoneNumberAlreadyExist) {
      await showToast(ToastStyle.Failure, "Chat already exists");
      return;
    }

    if (isCreation) {
      await updateChats([...chats, savedChat]);
      await showToast(ToastStyle.Success, `Created new chat`, savedChat.name);
    } else {
      const newChats = chats.map((chat) => {
        if (chat.id === savedChat.id) {
          return savedChat;
        }
        return chat;
      });
      await updateChats(newChats);
      await showToast(ToastStyle.Success, `Updated existing chat`, savedChat.name);
    }

    await popToRoot({ clearSearchBar: true });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Save Chat" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="John Doe" defaultValue={defaultValue?.name} />
      <Form.TextField id="phone" title="Phone" placeholder="+1 (817) 569-8900" defaultValue={defaultValue?.phone} />
      <Form.Checkbox id="pinned" label="Pinned Chat" defaultValue={defaultValue?.pinned} />
    </Form>
  );
}
