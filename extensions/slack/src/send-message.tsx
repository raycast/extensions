import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { User, useChannels } from "./shared/client";
import { withSlackClient } from "./shared/withSlackClient";
import { getSlackWebClient } from "./shared/client/WebClient";
import { handleError } from "./shared/utils";

interface FormValues {
  recipient: string;
  recipientTitle: string;
  message: string;
}

interface SendMessageProps {
  recipient?: string;
}

const selectRecipient = "SELECT_RECIPIENT";

function SendMessage({ recipient }: SendMessageProps) {
  const { data: channels, isLoading } = useChannels();
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
		const [recipientId, recipientTitle] = values.recipient.split('|');

		if(recipientId === selectRecipient) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Invalid recipient",
				message: "Please select a recipient",
			});
			return;
		}

		if(values.message.trim() === "") {
			await showToast({
				style: Toast.Style.Failure,
				title: "Invalid message",
				message: "Please enter a message",
			});
			return;
		}

    try {
      const client = getSlackWebClient();
      await client.chat.postMessage({
        channel: recipientId,
        text: values.message,
      });
      
      await showToast({
        style: Toast.Style.Success,
        title: `Message to ${recipientTitle} sent successfully`,
      });
      
      pop();
    } catch (error) {

      handleError(error);
    }
  }

  const dropdownItems = channels?.flat().map((item) => {
    const isUser = item.id.startsWith("U");
    return {
      title: isUser ? (item as User).name : item.name || "",
      value: item.id || "",
    };
  }) || [];

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="recipient" title="Send to" defaultValue={recipient ? `${recipient}|${channels?.flat().find(item => item.id === recipient)?.name || recipient}` : selectRecipient}>
				<Form.Dropdown.Item title="Select a channel or user..." value={selectRecipient} />
        {dropdownItems.map((item) => (
          <Form.Dropdown.Item 
            key={item.value} 
            value={`${item.value}|${item.title}`} 
            title={item.title} 
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Type your message here..."
        enableMarkdown
      />
    </Form>
  );
}

export default withSlackClient(SendMessage);
