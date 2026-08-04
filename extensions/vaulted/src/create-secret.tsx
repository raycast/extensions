import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Toast,
  open,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { useMemo, useRef, useState } from "react";
import { PreferencesErrorView } from "./components/preferences-error";
import { createSecretFlow } from "./lib/crypto-flows";
import { toMessage } from "./lib/errors";
import { loadPrefs } from "./lib/preferences";
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
  const prefsResult = useMemo(() => loadPrefs(), []);
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const submitting = useRef(false);

  if (!prefsResult.ok) {
    return <PreferencesErrorView message={prefsResult.error} />;
  }
  const prefs = prefsResult.prefs;

  async function handleSubmit(values: FormValues) {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    try {
      const views = Number(values.views) as MaxViews;
      const expiry = values.expiry as Expiry;
      const result = await createSecretFlow({
        plaintext: values.secret,
        host: prefs.host,
        views,
        expiry,
        passphrase: values.passphrase || undefined,
      });
      await Clipboard.copy(result.url);
      if (prefs.openInBrowser) {
        await open(result.url);
      }
      await showHUD(
        `✓ Secret created — link copied (${viewsLabel(views)} · ${EXPIRY_LABELS[expiry]})`,
      );
      setSecret("");
      setPassphrase("");
      await popToRoot();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't create secret",
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
        value={secret}
        onChange={setSecret}
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
        value={passphrase}
        onChange={setPassphrase}
        placeholder="Adds a second factor; recipient must enter it to decrypt"
      />
    </Form>
  );
}
