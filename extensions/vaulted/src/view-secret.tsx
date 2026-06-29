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
import { useMemo, useRef, useState } from "react";
import { PreferencesErrorView } from "./components/preferences-error";
import { viewSecretFlow } from "./lib/crypto-flows";
import { toMessage } from "./lib/errors";
import { loadPrefs } from "./lib/preferences";

interface FormValues {
  url: string;
  passphrase: string;
}

export default function ViewSecretCommand() {
  const prefsResult = useMemo(() => loadPrefs(), []);
  const { push } = useNavigation();
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  if (!prefsResult.ok) {
    return <PreferencesErrorView message={prefsResult.error} />;
  }
  const prefs = prefsResult.prefs;

  async function handleSubmit(values: FormValues) {
    if (submitting.current) return;
    submitting.current = true;
    try {
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
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't reveal secret",
        message: toMessage(err),
      });
    } finally {
      setLoading(false);
      submitting.current = false;
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
