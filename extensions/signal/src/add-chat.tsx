import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { isSignalChat, SignalChat } from "./utils/types";
import { useSignalChats } from "./utils/use-signal-chats";
import { phone as parsePhone } from "phone";
import { nanoid as randomId } from "nanoid";

interface SignalChatFormProps {
  defaultValue?: SignalChat;
}

interface FormValues extends Omit<SignalChat, "id" | "pinned"> {
  pinned: 0 | 1;
}

export default function SignalChatForm({ defaultValue }: SignalChatFormProps) {
  const { chats, updateChats } = useSignalChats();
  const isCreation = !defaultValue;

  async function handleSubmit(formValues: FormValues) {
    const phoneInformation = parsePhone(formValues.phone);

    if (!phoneInformation.isValid) {
      await showToast(Toast.Style.Failure, "Invalid phone format");
      return;
    }

    const savedChat: SignalChat = {
      id: isCreation ? randomId() : defaultValue.id,
      name: formValues.name,
      pinned: !!formValues.pinned,
      phone: phoneInformation.phoneNumber,
    };

    const isNewPhoneNumber = isCreation || savedChat.phone !== defaultValue.phone;
    const doesPhoneNumberAlreadyExist = chats
      .filter(isSignalChat)
      .some((chat) => chat.phone === phoneInformation.phoneNumber);

    if (isNewPhoneNumber && doesPhoneNumberAlreadyExist) {
      await showToast(Toast.Style.Failure, "Chat already exists");
      return;
    }

    if (isCreation) {
      await updateChats([...chats, savedChat]);
      await showToast(Toast.Style.Success, `Created new chat`, savedChat.name);
    } else {
      const newChats = chats.map((chat) => {
        if (chat.id === savedChat.id) {
          return savedChat;
        }
        return chat;
      });
      await updateChats(newChats);
      await showToast(Toast.Style.Success, `Updated existing chat`, savedChat.name);
    }

    await popToRoot({ clearSearchBar: true });
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
