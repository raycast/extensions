import {
  Action,
  ActionPanel,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  LocalStorage,
  showToast,
  Toast,
  LaunchProps,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  username: string;
}

export default function Command({
  launchContext,
}: LaunchProps<{ launchContext: { id: string; firstName?: string; lastName?: string } }>) {
  const { data: contacts, isLoading } = useCachedPromise(async () => {
    const contacts = await LocalStorage.getItem<string>("contacts");
    return contacts ? JSON.parse(contacts) : [];
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <SendMessage />
          <ReceiveContacts />
          <DeleteLocalStorage />
        </ActionPanel>
      }
      enableDrafts
    >
      <Form.TextArea id="message" title="Message" placeholder="The message you want to send" storeValue />
      <Form.Dropdown id="contact" {...contacts} title="Receiver" placeholder="Select a contact" storeValue>
        {contacts?.map((contact: Contact, index: number) => {
          return (
            <Form.Dropdown.Item
              key={index}
              value={contact.id}
              title={`${contact.firstName} ${contact.lastName}`}
              keywords={[contact.firstName, contact.lastName, contact.phoneNumber , contact.username]}
            />
          );
        })}
        ;
      </Form.Dropdown>
    </Form>
  );
}

function SendMessage() {
  async function handleSubmit(values: { message: string; contact: string }) {
    if (!values.message) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter a message",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sending message",
    });

    try {
      const savedSession: string = (await LocalStorage.getItem("savedSession")) || "";
      const SESSION = new StringSession(savedSession);

      if (!savedSession) {
        await launchCommand({
          name: "telegram-login",
          type: LaunchType.UserInitiated,
          context: { message: "Log in to begin" },
        });
        return;
      }

      const client = new TelegramClient(SESSION, 12345678, "api_hash", { connectionRetries: 5 });
      await client.connect();
      const message = values.message;
      await client.sendMessage(`${values.contact}`, { message });

      toast.style = Toast.Style.Success;
      toast.title = "Message sent";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed sending message";
      toast.message = String(error);
    }
  }

  return <Action.SubmitForm icon={Icon.SpeechBubbleActive} title="Send Message" onSubmit={handleSubmit} />;
}

function ReceiveContacts() {
  async function handleSubmit() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Receiving contacts",
    });

    try {
      const savedSession: string = (await LocalStorage.getItem("savedSession")) || "";
      const SESSION = new StringSession(savedSession);

      if (!savedSession) {
        await launchCommand({
          name: "telegram-login",
          type: LaunchType.UserInitiated,
          context: { message: "Log in to begin" },
        });
        return;
      }

      const client = new TelegramClient(SESSION, 12345678, "api_hash", { connectionRetries: 5 });
      await client.connect();
      const contacts = await client.invoke(new Api.contacts.GetContacts({}));
      if (contacts instanceof Api.contacts.Contacts) {
        const usersList: Contact[] = contacts.users.map((user) => {
          if (user instanceof Api.User) {
            return {
              id: user.id.toString(),
              firstName: user.firstName || "",
              lastName: user.lastName || "",
              phoneNumber: user.phone || "",
              username: user.username || "",
            };
          } else {
            return {
              id: user.id.toString(),
              firstName: "",
              lastName: "",
              phoneNumber: "",
              username: "",
            };
          }
        });

        LocalStorage.setItem("contacts", JSON.stringify(usersList));
      }

      toast.style = Toast.Style.Success;
      toast.title = "Contacts updated";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed receiving contacts";
      toast.message = String(error);
    }
  }

  return <Action.SubmitForm icon={Icon.RotateAntiClockwise} title="Refresh Contacts" onSubmit={handleSubmit} />;
}
function DeleteLocalStorage() {
  async function handleSubmit() {
    await LocalStorage.clear();
    await showHUD("Telegram Raycast Cleared!");
    return;
  }

  return <Action.SubmitForm icon={Icon.Xmark} title="Reset Extension" onSubmit={handleSubmit} />;
}
