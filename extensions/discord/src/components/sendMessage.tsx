import { showToast, Toast, Form, ActionPanel, Action, Icon } from "@raycast/api";
import { WebhookClient, MessageEmbed } from "discord.js";

interface WebhookFormValues {
  userName: string;
  message: string;
  enableEmbed: boolean;
  embeddedMessage: string;
  embeddedTitle: string;
}

export function composeMessage(url: string, name = "Send Message") {
  const handleSubmit = (values: WebhookFormValues) => {
    if (values.message.length < 1) {
      showToast({ title: "Error", message: "Message cannot be empty", style: Toast.Style.Failure });
      return;
    }

    const client = new WebhookClient({ url: url });

    if (values.enableEmbed) {
      if (values.embeddedTitle?.length < 1 || values.embeddedMessage?.length < 1) {
        showToast({
          title: "Embedd is Enabled!",
          message: "Embedded message must have a title and content",
          style: Toast.Style.Failure,
        });
        return;
      }

      const embed = new MessageEmbed().setTitle(values.embeddedTitle).setDescription(values.embeddedMessage);
      client.send({
        content: values.message,
        username: values.userName,
        embeds: [embed],
      });
    } else {
      client.send({
        content: values.message || ".",
        username: values.userName,
      });
    }

    showToast({ title: "Message Sent" });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" icon={Icon.Message} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle={"Send Message to " + name}
    >
      <Form.TextField id="userName" placeholder="Raydis" defaultValue="Raydis" title="User Name" storeValue />
      <Form.TextArea id="message" placeholder="Unleash your inner Shakespeare" title="Message" defaultValue="" />

      <Form.Separator />
      <Form.TextField id="embeddedTitle" placeholder="Embedded Title" defaultValue="" title="Title" storeValue />
      <Form.TextArea id="embeddedMessage" placeholder="Embedded Message" title="Content" defaultValue="" />
      <Form.Checkbox id="enableEmbed" label="Embed Message" />
    </Form>
  );
}
