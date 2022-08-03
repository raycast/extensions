import { Action, ActionPanel, closeMainWindow, Form, getPreferenceValues, popToRoot, showToast } from "@raycast/api";
import fetch from "node-fetch";
import { useState } from "react";

interface Preferences {
  url: string;
  jwt: string;
}

interface Values {
  text: string;
}

const requiredError = "Required";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const [textError, setTextError] = useState<string | undefined>();

  function hasRequiredError(values: Values) {
    setTextError(!values.text ? requiredError : undefined);

    return !values.text;
  }

  function clearTextErrorIfNeeded(): any {
    if (textError && textError.length > 0) setTextError(undefined);
  }

  function handleSubmit(values: Values) {
    if (hasRequiredError(values)) return;

    showToast({ title: "Sending to Capture...", style: "ANIMATED" as any });

    fetch(preferences.url, POST({ body: { text: values.text }, token: preferences.jwt })).then(() => {
      closeMainWindow();
      popToRoot();
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" placeholder="Start typing..." error={textError} onChange={clearTextErrorIfNeeded} />
    </Form>
  );
}

const POST: (params: any) => any = ({ body, token }) => ({
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-Capture-Raycast-Ext": "true",
  },
  body: JSON.stringify(body),
});
