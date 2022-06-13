import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues, Clipboard } from "@raycast/api";
import axios from "axios";
import { useState } from "react";

interface Preferences {
  exchangeRatesApiKey: string;
}

interface CommandForm {
  base: string;
  target: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [output, setOutput] = useState("");

  async function handleSubmit(values: CommandForm) {
    if (values.base == "") {
      showToast(Toast.Style.Failure, "Error", "Base is required");
      return;
    }

    if (values.target == "") {
      showToast(Toast.Style.Failure, "Error", "Target is required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving exchange rates...",
    });

    const baseUrl = "https://exchange-rates.abstractapi.com/v1/live";
    const base = encodeURIComponent(values.base);
    const target = encodeURIComponent(values.target);
    const url = `${baseUrl}/?api_key=${preferences.exchangeRatesApiKey}&base=${base}&target=${target}`;

    await axios
      .get(url)
      .then((response) => {
        toast.style = Toast.Style.Success;
        toast.title = "Exchange rates retrieved successfully";
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

            toast.title = "Exchange rates output copied to clipboard";
            toast.message = undefined;
          },
        };

        setOutput(JSON.stringify(response.data));
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve exchange rates";
        toast.message = error.response.data.error.message ?? "";
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Exchange Rates" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField id="base" title="Base" placeholder="Enter base" />
      <Form.TextField id="target" title="Target" placeholder="Enter target" />
      {output ? (
        <>
          <Form.Separator />
          {/* spacer */}
          <Form.Description text="" />
          <Form.TextArea id="output" title="Output" value={output} />
        </>
      ) : null}
    </Form>
  );
}
