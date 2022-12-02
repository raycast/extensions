import { Form, ActionPanel, Action, showToast, Clipboard } from "@raycast/api";
import axios from "axios";
import { useState } from "react";

type Values = {
  url: string;
  expires: Date;
};

export default function Command() {
  const [urlError, setUrlError] = useState<string | undefined>();
  const [expiresError, setExpiresError] = useState<string | undefined>();

  const change = () => {
    setUrlError(undefined);
    setExpiresError(undefined);
  };

  const handleSubmit = (values: Values) => {
    let date = values.expires;

    if (!date) {
      date = new Date();
      date.setFullYear(date.getFullYear() + 1);
    }

    axios
      .post(
        "https://liba.ro/api/v1/shorten",
        {
          url: values.url,
          expiresAt: date.toISOString(),
        },
        {
          headers: {
            "Accept-Encoding": "application/json",
          },
        }
      )
      .then((response) => {
        const shortened = response.data;

        Clipboard.copy(shortened);

        showToast({
          title: "Short URL copied to clipboard!",
        });
      })
      .catch((err) => {
        setUrlError(err.response?.data?.errors?.url?.[0]);
        setExpiresError(err.response?.data?.errors?.expiresAt?.[0]);
      });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Shorten your URL with liba.ro" />
      <Form.TextArea onChange={change} id="url" title="URL" placeholder="https://libaro.be" error={urlError} />
      <Form.DatePicker onChange={change} id="expires" title="Expires at" error={expiresError} />
    </Form>
  );
}
