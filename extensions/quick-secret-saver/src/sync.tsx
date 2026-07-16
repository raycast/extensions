// src/sync.tsx
import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { store } from "./storage";
import { encrypt, decrypt, Envelope } from "./crypto/vault";
import { mergeSecrets } from "./sync/merge";
import { readGist, writeGist } from "./sync/gist-client";
import { Secret } from "./storage/types";

export default function SyncCommand() {
  const { pop } = useNavigation();
  const [passphraseError, setPassphraseError] = useState<string | undefined>();

  async function handleSubmit(values: { passphrase: string }) {
    if (!values.passphrase) {
      setPassphraseError("Passphrase is required");
      return;
    }

    const { githubToken, gistId } = getPreferenceValues<Preferences.Sync>();
    if (!githubToken || !gistId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing GitHub settings",
        message: "Set token and gist id in extension preferences.",
        primaryAction: {
          title: "Open Preferences",
          onAction: () => openExtensionPreferences(),
        },
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Syncing…",
    });

    try {
      // 1. Pull + decrypt remote (empty gist => no remote records).
      const raw = await readGist(githubToken, gistId);
      let remote: Secret[] = [];
      if (raw && raw.trim() !== "") {
        let envelope: Envelope;
        try {
          envelope = JSON.parse(raw) as Envelope;
        } catch {
          throw new Error("Remote data is not valid JSON.");
        }
        let decrypted: string;
        try {
          decrypted = decrypt(envelope, values.passphrase);
        } catch {
          // Generic message: never reveal whether passphrase or data was wrong.
          throw new Error("Wrong passphrase or corrupt remote data.");
        }
        remote = JSON.parse(decrypted) as Secret[];
      }

      // 2. Merge with local and prepare the encrypted remote payload.
      const local = await store.list();
      const merged = mergeSecrets(local, remote);
      const envelope = encrypt(JSON.stringify(merged), values.passphrase);

      // 3. Upload first so a remote failure cannot leave local state changed.
      await writeGist(githubToken, gistId, JSON.stringify(envelope));
      await store.replaceAll(merged);

      toast.style = Toast.Style.Success;
      toast.title = "Synced";
      toast.message = `${merged.length} secret(s)`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Sync failed";
      // error.message is safe: it never contains secret content (spec §11).
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Sync Now" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter your encryption passphrase. It is used to encrypt/decrypt your secrets and is never stored or uploaded." />
      <Form.PasswordField
        id="passphrase"
        title="Passphrase"
        placeholder="Your encryption passphrase"
        error={passphraseError}
        onChange={() => passphraseError && setPassphraseError(undefined)}
      />
    </Form>
  );
}
