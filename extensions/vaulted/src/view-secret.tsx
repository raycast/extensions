import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { viewSecretFlow } from "./lib/crypto-flows";
import { ApiError, ValidationError } from "./lib/errors";
import { getPrefs } from "./lib/preferences";

interface FormValues {
  url: string;
  passphrase: string;
}

export default function ViewSecretCommand() {
  const prefs = getPrefs();
  const { push } = useNavigation();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    if (prefs.confirmConsume) {
      const ok = await confirmAlert({
        title: "Reveal this secret?",
        message:
          "Viewing consumes one view. The secret may be destroyed afterwards.",
        primaryAction: { title: "Reveal", style: Alert.ActionStyle.Default },
        dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
      });
      if (!ok) return;
    }

    setLoading(true);
    try {
      const result = await viewSecretFlow({
        url: values.url.trim(),
        passphrase: values.passphrase || undefined,
      });
      push(
        <SecretRevealedView
          plaintext={result.plaintext}
          viewsRemaining={result.viewsRemaining}
        />,
      );
    } catch (err) {
      const msg =
        err instanceof ApiError || err instanceof ValidationError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't reveal secret",
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Reveal Secret" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Vaulted link"
        placeholder="https://vaulted.fyi/s/abc#key"
      />
      <Form.PasswordField
        id="passphrase"
        title="Passphrase (if required)"
        placeholder="Only needed when the link was passphrase-protected"
      />
    </Form>
  );
}

function SecretRevealedView({
  plaintext,
  viewsRemaining,
}: {
  plaintext: string;
  viewsRemaining: number;
}) {
  const footer =
    viewsRemaining > 0
      ? `Views remaining: ${viewsRemaining}.`
      : "This was the last view — the secret is now destroyed.";

  const markdown = [
    "## Secret revealed",
    "",
    "```",
    plaintext,
    "```",
    "",
    footer,
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Plaintext" content={plaintext} />
        </ActionPanel>
      }
    />
  );
}
