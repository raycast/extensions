import { Form, ActionPanel, Action, showToast, Toast, Icon, getPreferenceValues, Clipboard } from "@raycast/api";
import axios from "axios";
import { useState } from "react";

interface Preferences {
  apiKey: string;
}

interface CommandForm {
  domain: string;
  type: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [output, setOutput] = useState("");

  async function handleSubmit(values: CommandForm) {
    if (values.domain == "") {
      showToast(Toast.Style.Failure, "Error", "Domain is required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving DNS...",
    });

    const data = {
      name: values.domain,
      type: values.type,
    };

    const options = {
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
      },
    };

    await axios
      .post("https://api.m3o.com/v1/dns/Query", data, options)
      .then((response) => {
        toast.style = Toast.Style.Success;
        toast.title = "DNS retrieved successfully";
        toast.primaryAction = {
          title: "Copy to Clipboard",
          onAction: async (toast) => {
            await Clipboard.copy(JSON.stringify(response.data));

            toast.style = Toast.Style.Success;
            toast.title = "DNS copied to clipboard";
          },
        };

        setOutput(JSON.stringify(response.data));
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
      <Form.TextField id="domain" title="Domain" placeholder="Enter domain" />

      <Form.Dropdown id="type" title="Select type" defaultValue="A">
        <Form.Dropdown.Item value="A" title="A" />
        <Form.Dropdown.Item value="AAAA" title="AAAA" />
        <Form.Dropdown.Item value="MX" title="MX" />
        <Form.Dropdown.Item value="SRV" title="SRV" />
      </Form.Dropdown>

      {output ? (
        <>
          <Form.Separator />
          <Form.TextArea id="output" title="Output" value={output} />
        </>
      ) : null}
    </Form>
  );
}
