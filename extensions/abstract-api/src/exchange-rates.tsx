import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues } from "@raycast/api";
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

    try {
      const url = `https://exchange-rates.abstractapi.com/v1/live/?api_key=${preferences.exchangeRatesApiKey
        }&base=${encodeURIComponent(values.base)}&target=${encodeURIComponent(values.target)}`;
      const { data } = await axios.get(url);

      toast.style = Toast.Style.Success;
      toast.title = "Exchange rates retrieved successfully";
      toast.primaryAction = {
        title: "Open in Browser",
        onAction: (toast) => {
          open(url);

          toast.hide();
        },
      };

      setOutput(JSON.stringify(data));
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Unable to retrieve exchange rates";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Location" onSubmit={handleSubmit} icon={Icon.Pencil} />
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
          <Form.Description title="Output" text={output} />
        </>
      ) : null}
    </Form>
  );
}
