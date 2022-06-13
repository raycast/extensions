import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues, Clipboard } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import { homedir } from "os";

interface Preferences {
  apiKey: string;
}

interface CommandForm {
  domain: string;
  type: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit(values: CommandForm) {
    if (values.domain == "") {
      showToast(Toast.Style.Failure, "Error", "Domain is required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving DNS...",
    });

    await axios
      .post(
        "https://api.m3o.com/v1/dns/Query",
        {
          domain: values.domain,
          type: values.type,
        },
        { headers: { Authorization: `Bearer ${preferences.apiKey}` } }
      )
      .then((response) => {
        toast.style = Toast.Style.Success;
        toast.title = "DNS retrieved successfully";
        toast.primaryAction = {
          title: "Copy to Clipboard",
          onAction: async (toast) => {
            await Clipboard.copy(response.data);

            toast.style = Toast.Style.Success;
            toast.title = "DNS copied to clipboard";
          },
        };
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve DNS";
        toast.message = error.response.data.detail ?? "";
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get DNS" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Enter name" />

      <Form.Dropdown id="type" title="Select type" defaultValue="A">
        <Form.Dropdown.Item value="A" title="A" />
        <Form.Dropdown.Item value="AAAA" title="AAAA" />
        <Form.Dropdown.Item value="MX" title="MX" />
        <Form.Dropdown.Item value="SRV" title="SRV" />
      </Form.Dropdown>
    </Form>
  );
}
