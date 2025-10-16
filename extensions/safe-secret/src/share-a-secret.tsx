import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, Clipboard, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import moment from "moment";

interface Preferences {
  serverUrl: string;
}

interface ServerParams {
  max_exp_sec: number;
  pin_size: number;
}

interface MessageResponse {
  key: string;
  exp: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [serverParams, setServerParams] = useState<ServerParams>({ max_exp_sec: 0, pin_size: 0 });
  const [message, setMessage] = useState("");
  const [expiration, setExpiration] = useState(3600); // Default to 1 hour
  const [pin, setPin] = useState("");

  useEffect(() => {
    async function fetchServerParams() {
      try {
        const response = await fetch(`${preferences.serverUrl}/api/v1/params`);
        const data = (await response.json()) as ServerParams;
        setServerParams(data);
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to fetch server parameters" });
      }
    }

    fetchServerParams();
  }, []);

  useEffect(() => {
    async function getClipboardContent() {
      const clipboardText = await Clipboard.readText();
      if (clipboardText) {
        setMessage(clipboardText);
      }
    }

    getClipboardContent();
  }, []);

  useEffect(() => {
    function generatePin() {
      const characters = "0123456789";
      let result = "";
      for (let i = 0; i < serverParams.pin_size; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      setPin(result);
    }

    if (serverParams.pin_size > 0) {
      generatePin();
    }
  }, [serverParams.pin_size]);

  async function handleSubmit() {
    if (expiration > serverParams.max_exp_sec) {
      showToast({ style: Toast.Style.Failure, title: "Expiration time exceeds server limit" });
      return;
    }

    try {
      const response = await fetch(`${preferences.serverUrl}/api/v1/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, exp: expiration, pin }),
      });

      if (response.ok) {
        const data = (await response.json()) as MessageResponse;
        const secretUrl = `${preferences.serverUrl}/message/${data.key}`;
        await Clipboard.copy(`${secretUrl}\nPIN: ${pin}`);
        showToast({ style: Toast.Style.Success, title: "Secret created and copied to clipboard" });
        await popToRoot();
      } else {
        showToast({ style: Toast.Style.Failure, title: "Failed to create secret" });
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to create secret" });
    }
  }

  const expirationDateTime = moment().add(expiration, "seconds").format("MMMM Do YYYY, h:mm:ss a");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="message" title="Message" value={message} onChange={setMessage} />
      <Form.TextField
        id="expiration"
        title="Expiration (seconds)"
        defaultValue={String(expiration)}
        onChange={(value) => setExpiration(Number(value))}
      />
      <Form.Description text={`Expires at: ${expirationDateTime}`} />
      <Form.PasswordField id="pin" title="PIN" value={pin} onChange={setPin} />
    </Form>
  );
}
