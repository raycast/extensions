import { Action, ActionPanel, Form, List, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { MissingKey, TOTPAccount } from "../types";
import { setImportMode, getEncryptionKeys, setEncryptionKeys, getParsedEncryptionKeys } from "../lib/storage";
import { validateAndParseKey } from "../lib/crypto";
import { loadAccountsFromDatabase, databaseExists, DatabaseLoadResult } from "../lib/database";

const DATABASE_NOT_FOUND =
  "Proton Authenticator database not found. Please ensure the app is installed and has been opened at least once.";

interface SetupSQLiteProps {
  onAccountsLoaded: (accounts: TOTPAccount[], missingKeys: MissingKey[], undecodableCount: number) => void;
  onBack: () => void;
}

// Remote key IDs are ~90 characters, the first 16 are enough to find them in Keychain Access
function formatKeyId(keyId: string): string {
  return keyId.length > 50 ? `${keyId.slice(0, 16)}…` : keyId;
}

function formatEntryCount(entryCount: number): string {
  return `${entryCount} ${entryCount === 1 ? "entry" : "entries"}`;
}

function getInstructions({ keyId, entryCount }: MissingKey): string {
  return `## Add this key

This key decrypts **${formatEntryCount(entryCount)}**.

1. Open **Keychain Access** (search in Spotlight)
2. Search for \`me.proton.authenticator\`
3. Double-click the item whose account is:

\`\`\`
${keyId}
\`\`\`

4. Check **Show password** and enter your macOS password
5. Copy the password, then press **Enter** here to paste it

---

Proton Authenticator uses one key per device that created entries, plus one for Proton account sync, so you may need to add more than one key.`;
}

export default function SetupSQLite({ onAccountsLoaded, onBack }: SetupSQLiteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<TOTPAccount[]>([]);
  const [missingKeys, setMissingKeys] = useState<MissingKey[]>([]);
  const [undecodableCount, setUndecodableCount] = useState(0);

  // Decrypt with the keys saved so far to find out which Keychain items are still needed
  useEffect(() => {
    if (!databaseExists()) {
      setError(DATABASE_NOT_FOUND);
      setIsLoading(false);
      return;
    }
    getParsedEncryptionKeys()
      .then(loadAccountsFromDatabase)
      .then(async (result) => {
        // Saved keys already decrypt everything, nothing to add
        if (result.missingKeys.length === 0 && result.accounts.length > 0) {
          await setImportMode("sqlite");
          onAccountsLoaded(result.accounts, [], result.undecodableCount);
          return;
        }
        setAccounts(result.accounts);
        setMissingKeys(result.missingKeys);
        setUndecodableCount(result.undecodableCount);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to read database"))
      .finally(() => setIsLoading(false));
  }, []);

  const handleKeyAdded = (result: DatabaseLoadResult) => {
    if (result.missingKeys.length === 0 && result.accounts.length > 0) {
      // Otherwise the caller shows a warning toast for the skipped entries
      if (result.undecodableCount === 0) {
        showToast(Toast.Style.Success, "Connected", `Loaded ${result.accounts.length} accounts`);
      }
      onAccountsLoaded(result.accounts, [], result.undecodableCount);
      return;
    }

    setAccounts(result.accounts);
    setMissingKeys(result.missingKeys);
    setUndecodableCount(result.undecodableCount);
    // No keys left to add means nothing could be read, which the empty view explains
    if (result.missingKeys.length === 0) return;
    showToast(
      Toast.Style.Success,
      "Key Added",
      `${result.missingKeys.length} more ${result.missingKeys.length === 1 ? "key" : "keys"} needed`,
    );
  };

  const backAction = (
    <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} shortcut={{ modifiers: ["cmd"], key: "[" }} />
  );

  const skippedCount = missingKeys.reduce((sum, key) => sum + key.entryCount, 0);
  const continueAction = accounts.length > 0 && (
    <Action
      title={`Continue with ${accounts.length} Accounts`}
      icon={Icon.ArrowRight}
      onAction={async () => {
        await setImportMode("sqlite");
        onAccountsLoaded(accounts, missingKeys, undecodableCount);
      }}
    />
  );

  if (!isLoading && (error || (missingKeys.length === 0 && accounts.length === 0))) {
    return (
      <List navigationTitle="Connect to Local Database">
        <List.EmptyView
          title={error ? "Cannot Read Database" : undecodableCount > 0 ? "Cannot Read Entries" : "No Entries Found"}
          description={
            error ??
            (undecodableCount > 0
              ? `${formatEntryCount(undecodableCount)} decrypted but could not be read. Use JSON import instead.`
              : "Add an entry in Proton Authenticator, then try again.")
          }
          icon={Icon.Warning}
          actions={<ActionPanel>{backAction}</ActionPanel>}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle="Connect to Local Database">
      <List.Section
        title="Keys Needed"
        subtitle={accounts.length > 0 ? `${accounts.length} accounts loaded` : undefined}
      >
        {missingKeys.map((missingKey) => (
          <List.Item
            key={missingKey.keyId}
            icon={Icon.Key}
            title={formatKeyId(missingKey.keyId)}
            keywords={[missingKey.keyId]}
            detail={<List.Item.Detail markdown={getInstructions(missingKey)} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Key"
                  icon={Icon.Key}
                  target={<AddKeyForm keyId={missingKey.keyId} onKeyAdded={handleKeyAdded} />}
                />
                <Action.CopyToClipboard title="Copy Key ID" content={missingKey.keyId} />
                {continueAction}
                {backAction}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {accounts.length > 0 && (
        <List.Section title="Continue">
          <List.Item
            icon={Icon.ArrowRight}
            title={`Continue with ${accounts.length} Accounts`}
            detail={
              <List.Item.Detail
                markdown={`## Skip for now

**${formatEntryCount(skippedCount)}** will stay hidden until you add ${skippedCount === 1 ? "its key" : "their keys"}. You can add ${skippedCount === 1 ? "it" : "them"} later from the warning toast, or with **Add Missing Encryption Key** in the actions menu (⌘K).`}
              />
            }
            actions={
              <ActionPanel>
                {continueAction}
                {backAction}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

interface AddKeyFormProps {
  keyId: string;
  onKeyAdded: (result: DatabaseLoadResult) => void;
}

function AddKeyForm({ keyId, onKeyAdded }: AddKeyFormProps) {
  const { pop } = useNavigation();
  const [encryptionKey, setEncryptionKeyValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [keyError, setKeyError] = useState<string | undefined>(undefined);

  const validateKey = (value: string) => {
    if (!value.trim()) {
      setKeyError("Encryption key is required");
      return;
    }
    const parsed = validateAndParseKey(value);
    if (!parsed) {
      setKeyError("Invalid key format. Expected 64 hex characters or 44 base64 characters.");
    } else {
      setKeyError(undefined);
    }
  };

  const handleSubmit = async () => {
    if (!encryptionKey.trim()) {
      showFailureToast("Please enter the encryption key", { title: "Error" });
      return;
    }

    const key = validateAndParseKey(encryptionKey);
    if (!key) {
      showFailureToast("Invalid key format. Expected 64 hex characters or 44 base64 characters.", {
        title: "Invalid Key",
      });
      return;
    }

    if (!databaseExists()) {
      showFailureToast(DATABASE_NOT_FOUND, { title: "Database Not Found" });
      return;
    }

    setIsLoading(true);

    try {
      const storedKeys = await getEncryptionKeys();
      const existingKeys = await getParsedEncryptionKeys();

      if (existingKeys.some((existingKey) => existingKey.equals(key))) {
        showFailureToast("This key has already been added.", { title: "Duplicate Key" });
        return;
      }

      const result = await loadAccountsFromDatabase([...existingKeys, key]);

      if (!result.usedKeys.some((usedKey) => usedKey.equals(key))) {
        showFailureToast("This key doesn't decrypt any entry in your database.", { title: "Decryption Failed" });
        return;
      }

      await setEncryptionKeys([...storedKeys, encryptionKey.trim()]);
      await setImportMode("sqlite");

      pop();
      onKeyAdded(result);
    } catch (error) {
      console.error("Failed to connect to database:", error);
      showFailureToast("Failed to decrypt database. Please check your encryption key.", {
        title: "Decryption Failed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add Encryption Key"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Key" icon={Icon.Key} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Keychain Account" text={formatKeyId(keyId)} />
      <Form.PasswordField
        id="encryptionKey"
        title="Encryption Key"
        placeholder="Paste the password from Keychain Access..."
        value={encryptionKey}
        onChange={(value) => {
          setEncryptionKeyValue(value);
          validateKey(value);
        }}
        error={keyError}
        info="The 32-byte encryption key from your macOS Keychain"
      />
    </Form>
  );
}
