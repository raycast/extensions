import { Form, ActionPanel, Action, showToast, Toast, showHUD, PopToRootType, Image } from "@raycast/api";
import { useState } from "react";
import { User, useChannels } from "./shared/client";
import { withSlackClient } from "./shared/withSlackClient";
import { getSlackWebClient } from "./shared/client/WebClient";
import { handleError } from "./shared/utils";

interface FormValues {
  recipient: string;
  recipientTitle: string;
  message: string;
  scheduledTime: Date;
  sendNow: boolean;
}

interface SendMessageProps {
  recipient?: string;
}

const selectRecipient = "SELECT_RECIPIENT";

function SendMessage({ recipient }: SendMessageProps) {
  const [sendNow, setSendNow] = useState(true);
  const { data: channels, isLoading } = useChannels();

  async function handleSubmit(values: FormValues) {
    const [recipientId, recipientTitle] = values.recipient.split("|");

    if (recipientId === selectRecipient) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid recipient",
        message: "Please select a recipient",
      });
      return;
    }

    if (values.message.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid message",
        message: "Please enter a message",
      });
      return;
    }

    try {
      const client = getSlackWebClient();
      const messageParams = {
        channel: recipientId,
        text: values.message,
      };

      // If sendNow is false and scheduledTime is in the future, use scheduleMessage
      const now = new Date();
      if (!values.sendNow && values.scheduledTime > now) {
        await client.chat.scheduleMessage({
          ...messageParams,
          post_at: Math.floor(values.scheduledTime.getTime() / 1000),
        });
        await showHUD(`Message scheduled to ${recipientTitle} for ${values.scheduledTime.toLocaleString()}`, {
          popToRootType: PopToRootType.Immediate,
        });
      } else {
        // Send now
        await client.chat.postMessage(messageParams);
        await showHUD(`Message to ${recipientTitle} sent successfully`, { popToRootType: PopToRootType.Immediate });
      }
    } catch (error) {
      handleError(error);
    }
  }

  // Categorize items by type
  const categorizeItems = () => {
    if (!channels) return { users: [], publicChannels: [], privateChannels: [] };

    // Define a type for dropdown items
    type DropdownItem = {
      title: string;
      value: string;
      icon: Image.ImageLike | string | undefined;
    };

    const users: DropdownItem[] = [];
    const publicChannels: DropdownItem[] = [];
    const privateChannels: DropdownItem[] = [];

    channels.flat().forEach((item) => {
      const isUser = item.id.startsWith("U");

      // Handle the icon which can be a string or an object with source property
      let iconValue = item.icon;
      if (isUser) {
        const userIcon = (item as User).icon;
        iconValue = typeof userIcon === "string" ? userIcon : userIcon?.source;
      }

      const dropdownItem = {
        title: isUser ? (item as User).name : item.name || "",
        value: item.id || "",
        icon: iconValue,
      };

      if (isUser) {
        users.push(dropdownItem);
      } else if (typeof iconValue === "string" && iconValue.includes("public")) {
        publicChannels.push(dropdownItem);
      } else {
        privateChannels.push(dropdownItem);
      }
    });

    // Sort each category alphabetically
    users.sort((a, b) => a.title.localeCompare(b.title));
    publicChannels.sort((a, b) => a.title.localeCompare(b.title));
    privateChannels.sort((a, b) => a.title.localeCompare(b.title));

    return { users, publicChannels, privateChannels };
  };

  const { users, publicChannels, privateChannels } = categorizeItems();

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="recipient"
        title="Send to"
        defaultValue={
          recipient
            ? `${recipient}|${channels?.flat().find((item) => item.id === recipient)?.name || recipient}`
            : selectRecipient
        }
      >
        <Form.Dropdown.Item title="Select a channel or user..." value={selectRecipient} />

        {/* Direct Messages */}
        {users.length > 0 && (
          <Form.Dropdown.Section title="Direct Messages">
            {users.map((item) => (
              <Form.Dropdown.Item
                key={item.value}
                value={`${item.value}|${item.title}`}
                title={item.title}
                icon={typeof item.icon === "string" ? { source: item.icon, mask: Image.Mask.Circle } : item.icon}
              />
            ))}
          </Form.Dropdown.Section>
        )}

        {/* Public Channels */}
        {publicChannels.length > 0 && (
          <Form.Dropdown.Section title="Public Channels">
            {publicChannels.map((item) => (
              <Form.Dropdown.Item
                key={item.value}
                value={`${item.value}|${item.title}`}
                title={item.title}
                icon={item.icon}
              />
            ))}
          </Form.Dropdown.Section>
        )}

        {/* Private Channels */}
        {privateChannels.length > 0 && (
          <Form.Dropdown.Section title="Private Channels">
            {privateChannels.map((item) => (
              <Form.Dropdown.Item
                key={item.value}
                value={`${item.value}|${item.title}`}
                title={item.title}
                icon={item.icon}
              />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
      <Form.TextArea id="message" title="Message" placeholder="Type your message here..." enableMarkdown />
      <Form.Checkbox id="sendNow" label="Send Now" defaultValue={true} onChange={setSendNow} />
      {!sendNow && <Form.DatePicker id="scheduledTime" title="Schedule Send" defaultValue={new Date()} />}
    </Form>
  );
}

export { SendMessage };
export default withSlackClient(SendMessage);
