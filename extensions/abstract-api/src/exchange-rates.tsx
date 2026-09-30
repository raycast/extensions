import { Form, ActionPanel, Action, showToast, Toast, Icon, getPreferenceValues } from "@raycast/api";
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
  const [url, setUrl] = useState("");
  const [targetError, setTargetError] = useState<string | undefined>();
  const [baseError, setBaseError] = useState<string | undefined>();

  function dropTargetErrorIfNeeded() {
    if (targetError && targetError.length > 0) {
      setTargetError(undefined);
    }
  }

  function dropBaseErrorIfNeeded() {
    if (baseError && baseError.length > 0) {
      setBaseError(undefined);
    }
  }

  async function handleSubmit(values: CommandForm) {
    if (values.base == "") {
      setTargetError("This field is required!");
      return;
    }

    if (values.target == "") {
      setBaseError("This field is required!");
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

        setUrl(url);
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
          {url ? (
            <>
              <Action.OpenInBrowser title="Open in Browser" url={url} />
              <Action.CopyToClipboard title="Copy to Clipboard" content={url} />
            </>
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="base"
        title="Base"
        placeholder="Enter base"
        error={baseError}
        onChange={dropBaseErrorIfNeeded}
      />
      <Form.TextField
        id="target"
        title="Target"
        placeholder="Enter target"
        error={targetError}
        onChange={dropTargetErrorIfNeeded}
      />
      {output ? (
        <>
          <Form.Separator />
          <Form.TextArea id="output" title="Output" value={output} />
        </>
      ) : null}
    </Form>
  );
}
