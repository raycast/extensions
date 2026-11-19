import { useState } from "react";
import { Action, ActionPanel, Clipboard, Form, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { client, describe } from "./linkpilot";

const TTLS = [
  { value: "3600", title: "1 hour" },
  { value: "21600", title: "6 hours" },
  { value: "86400", title: "24 hours" },
  { value: "604800", title: "7 days" },
];

/**
 * A form rather than an argument, on purpose.
 *
 * A command argument is typed into Raycast's root search, which keeps a
 * history. A secret typed there would persist somewhere the person did not
 * choose. The form field does not.
 */
export default function CreateSecret() {
  const [loading, setLoading] = useState(false);
  const [secretError, setSecretError] = useState<string | undefined>();

  async function submit(values: { secret: string; ttl: string; burn: boolean }) {
    const secret = values.secret;
    if (!secret.trim()) {
      setSecretError("Required");
      return;
    }
    setLoading(true);
    try {
      // The SDK encrypts here, before anything is sent. The API refuses a
      // plaintext payload outright, so this is not optional politeness.
      const created = await client().secrets.create({
        secret,
        ttlSeconds: Number(values.ttl),
        burnAfterRead: values.burn,
      });
      // shareUrl, never secretUrl: the part after the # is the key, and a
      // link without it opens nothing, for anyone.
      await Clipboard.copy(created.shareUrl);
      await showHUD("Secret link copied. Everything after the # is the key.");
      await popToRoot();
    } catch (error) {
      const { title, message } = describe(error);
      await showToast({ style: Toast.Style.Failure, title, message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Lock} title="Create Secret Link" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="secret"
        title="Secret"
        placeholder="A password, API key, token or note"
        error={secretError}
        onChange={() => setSecretError(undefined)}
        info="Encrypted on this machine before it is sent. LinkPilot stores ciphertext it holds no key for."
      />
      <Form.Dropdown id="ttl" title="Expires" defaultValue="3600">
        {TTLS.map((t) => (
          <Form.Dropdown.Item key={t.value} value={t.value} title={t.title} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="burn"
        label="Destroy after the first view"
        defaultValue={true}
        info="Leave this on unless the recipient genuinely needs to open it twice."
      />
      <Form.Description
        title="Before you send it"
        text={
          "Send the whole link. Everything after the # is the decryption key, " +
          "it never reaches LinkPilot, and nobody can recover the secret without it."
        }
      />
    </Form>
  );
}
