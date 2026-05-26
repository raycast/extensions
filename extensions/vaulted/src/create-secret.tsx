import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Toast,
  open,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { createSecretFlow } from "./lib/crypto-flows";
import { ApiError, ValidationError } from "./lib/errors";
import { getPrefs } from "./lib/preferences";
import {
  EXPIRY_SECONDS,
  VALID_EXPIRY,
  VALID_VIEWS,
  type Expiry,
  type MaxViews,
} from "./lib/secret-config";
import { MAX_SECRET_LENGTH } from "./lib/validation";

interface FormValues {
  secret: string;
  views: string;
  expiry: string;
  passphrase: string;
}

const EXPIRY_LABELS: Record<Expiry, string> = {
  "1h": "1 hour",
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
};

function viewsLabel(v: MaxViews): string {
  if (v === 0) return "Unlimited (within expiry)";
  if (v === 1) return "1 view";
  return `${v} views`;
}

export default function CreateSecretCommand() {
  const prefs = getPrefs();
  const { push } = useNavigation();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    setLoading(true);
    try {
      const result = await createSecretFlow({
        plaintext: values.secret,
        host: prefs.host,
        views: Number(values.views) as MaxViews,
        expiry: values.expiry as Expiry,
        passphrase: values.passphrase || undefined,
      });
      if (prefs.autoCopy) {
        await Clipboard.copy(result.url);
      }
      if (prefs.openInBrowser) {
        await open(result.url);
      }
      push(<SecretCreatedView url={result.url} autoCopied={prefs.autoCopy} />);
    } catch (err) {
      const msg =
        err instanceof ApiError || err instanceof ValidationError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't create secret",
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
          <Action.SubmitForm
            title="Create & Copy Link"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="secret"
        title="Secret"
        placeholder={`Paste up to ${MAX_SECRET_LENGTH} characters`}
        info="Encrypted on your machine. The server never sees plaintext."
      />
      <Form.Dropdown
        id="views"
        title="Max views"
        defaultValue={String(prefs.defaultViews)}
      >
        {VALID_VIEWS.map((v) => (
          <Form.Dropdown.Item key={v} value={String(v)} title={viewsLabel(v)} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="expiry"
        title="Expires"
        defaultValue={prefs.defaultExpiry}
      >
        {VALID_EXPIRY.map((e) => (
          <Form.Dropdown.Item
            key={e}
            value={e}
            title={`${EXPIRY_LABELS[e]} (${EXPIRY_SECONDS[e]}s)`}
          />
        ))}
      </Form.Dropdown>
      <Form.PasswordField
        id="passphrase"
        title="Passphrase (optional)"
        placeholder="Adds a second factor; recipient must enter it to decrypt"
      />
    </Form>
  );
}

function SecretCreatedView({
  url,
  autoCopied,
}: {
  url: string;
  autoCopied: boolean;
}) {
  const markdown = [
    "## Secret created",
    "",
    "Your encrypted link:",
    "",
    "```",
    url,
    "```",
    "",
    autoCopied ? "✓ Already copied to clipboard." : "",
    "",
    "⚠ Anyone with this link can view it. Send through a trusted channel.",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Link" content={url} />
          <Action.OpenInBrowser title="Open in Browser" url={url} />
          <Action title="Create Another" onAction={() => popToRoot()} />
        </ActionPanel>
      }
    />
  );
}
