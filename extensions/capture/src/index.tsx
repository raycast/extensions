import { Action, ActionPanel, closeMainWindow, Form, popToRoot, showToast } from "@raycast/api";
import fetch from "node-fetch";
import { useState } from "react";

type Values = {
  text: string;
  notes: string;
  date: Date;
  collection: string;
  url: string;
  jwt: string;
};

const requiredError = "Required";

export default function Command() {
  const [textError, setTextError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();
  const [jwtError, setJwtError] = useState<string | undefined>();

  function hasRequiredError(values: Values) {
    setTextError(!values.text ? requiredError : undefined);
    setUrlError(!values.url ? requiredError : undefined);
    setJwtError(!values.jwt ? requiredError : undefined);

    return !values.text || !values.url || !values.jwt;
  }

  function clearTextErrorIfNeeded(): any {
    if (textError && textError.length > 0) setTextError(undefined);
  }

  function clearUrlErrorIfNeeded(): any {
    if (urlError && urlError.length > 0) setUrlError(undefined);
  }

  function clearJwtErrorIfNeeded(): any {
    if (jwtError && jwtError.length > 0) setJwtError(undefined);
  }

  function handleSubmit(values: Values) {
    if (hasRequiredError(values)) return;

    showToast({ title: "Sending to Capture...", style: "ANIMATED" as any });

    fetch(values.url, POST({ body: { text: values.text }, token: values.jwt }))
      .then(() => {
        closeMainWindow();
        popToRoot();
      })
      .catch(() => {});
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
      <Form.Separator />
      <Form.TextField id="url" title="URL" error={urlError} onChange={clearUrlErrorIfNeeded} storeValue />
      <Form.TextField id="jwt" title="JWT" error={jwtError} onChange={clearJwtErrorIfNeeded} storeValue />
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
