import { Form, ActionPanel, Action, Clipboard, showToast, Toast } from "@raycast/api";
import got from "got";

type Values = {
  lifetime: number;
  recipient: string;
  passphrase: string;
  secret: string;
};

export default function Command() {
  async function handleSubmit(values: Values) {
    console.log(values);

    if (!values.secret) {
      showToast({
        style: Toast.Style.Failure,
        title: "Secret is required",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Storing secret",
    });

    try {
      let url = "https://onetimesecret.com/api/v1/share";

      url = `${url}/?secret=${values.secret}`;

      if (values.recipient) {
        url = `${url}&recipient=${values.recipient}`;
      }

      if (values.passphrase) {
        url = `${url}&passphrase=${values.secret}`;
      }

      if (values.lifetime) {
        url = `${url}&ttl=${values.lifetime}`;
      }

      const { body } = await got.post(url);

      const shareableUrl = `https://onetimesecret.com/secret/${JSON.parse(body).secret_key}`;

      await Clipboard.copy(shareableUrl);

      toast.style = Toast.Style.Success;
      toast.title = "Shared secret";
      toast.message = "Copied link to clipboard";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed sharing secret";
      toast.message = String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="secret" title="Secret*" placeholder="The secret to be sent" />
      <Form.Separator />
      <Form.TextField id="passphrase" title="Passphrase" placeholder="Something top sneaky" />
      <Form.TextField id="recipient" title="Recipient Email Address" placeholder="Enter email" />
      <Form.Dropdown id="lifetime" title="Lifetime" storeValue>
        <Form.Dropdown.Item value="300" title="5 minutes" />
        <Form.Dropdown.Item value="1800" title="30 minutes" />
        <Form.Dropdown.Item value="3600" title="1 hour" />
        <Form.Dropdown.Item value="14400" title="4 hours" />
        <Form.Dropdown.Item value="43200" title="12 hours" />
        <Form.Dropdown.Item value="86400" title="1 day" />
        <Form.Dropdown.Item value="259200" title="3 days" />
        <Form.Dropdown.Item value="604800" title="7 days" />
        <Form.Dropdown.Item value="1209600" title="14 days" />
      </Form.Dropdown>
    </Form>
  );
}
