import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues, Clipboard } from "@raycast/api";
import axios from "axios";
import { useState } from "react";

interface Preferences {
  ipGeolocationApiKey: string;
}

interface CommandForm {
  ipAddress: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [output, setOutput] = useState("");

  async function handleSubmit(values: CommandForm) {
    if (values.ipAddress == "") {
      showToast(Toast.Style.Failure, "Error", "IP address is required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving geolocation...",
    });

    const baseUrl = "https://ipgeolocation.abstractapi.com/v1";
    const url = `${baseUrl}/?api_key=${encodeURIComponent(preferences.ipGeolocationApiKey)}`;

    await axios
      .get(url)
      .then((response) => {
        toast.style = Toast.Style.Success;
        toast.title = "Geolocation retrieved successfully";
        toast.message = "Hover over the toast to see available actions";
        toast.primaryAction = {
          title: "Open in Browser",
          onAction: (toast) => {
            open(url);

            toast.hide();
          },
        };
        toast.secondaryAction = {
          title: "Copy to Clipboard",
          onAction: async (toast) => {
            await Clipboard.copy(JSON.stringify(response.data));

            toast.title = "IP geolocation output copied to clipboard";
            toast.message = undefined;
          },
        };

        setOutput(JSON.stringify(response.data));
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve geolocation";
        toast.message = error.response.data.error.message ?? "";
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Geolocate" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField id="ipAddress" title="IP Address" placeholder="Enter IP address" />
      {output ? (
        <>
          <Form.Separator />
          <Form.TextArea id="output" title="Output" value={output} />
        </>
      ) : null}
    </Form>
  );
}
