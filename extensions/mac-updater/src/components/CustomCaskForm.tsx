import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { InstalledApp } from "../utils/types";
import { addUserCaskMapping } from "../utils/user-known-installs";
import { installCask } from "../utils/sources/homebrew";

interface Props {
  app: InstalledApp;
  onDone: () => void;
}

export default function CustomCaskForm({ app, onDone }: Props) {
  const { pop } = useNavigation();
  const [token, setToken] = useState("");
  const [tokenError, setTokenError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  function validate(v: string): boolean {
    const trimmed = v.trim();
    if (!trimmed) {
      setTokenError("Cask name is required");
      return false;
    }
    if (!/^[a-z0-9][a-z0-9._/-]*$/i.test(trimmed)) {
      setTokenError(
        "Invalid cask name — letters, digits, dash, underscore, dot, slash",
      );
      return false;
    }
    setTokenError(undefined);
    return true;
  }

  async function submit() {
    if (!validate(token)) return;
    const trimmed = token.trim();
    setSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing ${trimmed}…`,
    });
    const r = await installCask(trimmed);
    if (r.success) {
      // Persist the mapping so future scans recognise this app as brew-managed
      await addUserCaskMapping(app.bundleId, trimmed);
      toast.style = Toast.Style.Success;
      toast.title = `${app.name} is now managed by Homebrew`;
      toast.message = `Saved mapping: ${app.bundleId} → ${trimmed}`;
      onDone();
      pop();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `Couldn't install ${trimmed}`;
      toast.message = r.error;
    }
    setSubmitting(false);
  }

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Install & Save Mapping"
            icon={Icon.Mug}
            onSubmit={submit}
          />
          <Action.OpenInBrowser
            title="Search Homebrew Casks"
            url={`https://formulae.brew.sh/cask/?q=${encodeURIComponent(app.name)}`}
            icon={Icon.MagnifyingGlass}
          />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={app.name}
        text={`Bundle ID: ${app.bundleId}\nInstalled version: ${app.version}\n\nEnter the Homebrew cask name you found for this app (e.g. "bankid" for The Boring Notch). The mapping is saved so future scans will recognise it automatically.`}
      />
      <Form.TextField
        id="caskToken"
        title="Homebrew Cask"
        placeholder="bankid"
        value={token}
        onChange={(v) => {
          setToken(v);
          if (tokenError) validate(v);
        }}
        error={tokenError}
        info="Search formulae.brew.sh/cask if you don't know the name."
      />
      <Form.Description text="Tip: the cask name is whatever you'd type after `brew install --cask `." />
    </Form>
  );
}
