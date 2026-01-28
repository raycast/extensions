import { Action, ActionPanel, Form, showToast, Toast, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { TOTPAccount } from "../types";
import { setImportMode, setEncryptionKey } from "../lib/storage";
import { validateAndParseKey } from "../lib/crypto";
import { loadAccountsFromDatabase, databaseExists } from "../lib/database";

interface SetupFormSQLiteProps {
  onAccountsLoaded: (accounts: TOTPAccount[]) => void;
  onBack: () => void;
}

export default function SetupFormSQLite({ onAccountsLoaded, onBack }: SetupFormSQLiteProps) {
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
      showFailureToast(
        "Proton Authenticator database not found. Please ensure the app is installed and has been opened at least once.",
        { title: "Database Not Found" },
      );
      return;
    }

    setIsLoading(true);

    try {
      const accounts = await loadAccountsFromDatabase(key);

      if (accounts.length === 0) {
        showFailureToast("No accounts found in database. The key may be incorrect.", {
          title: "No Accounts",
        });
        setIsLoading(false);
        return;
      }

      await setImportMode("sqlite");
      await setEncryptionKey(encryptionKey);

      showToast(Toast.Style.Success, "Connected", `Loaded ${accounts.length} accounts`);
      onAccountsLoaded(accounts);
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
      navigationTitle="Connect to SQLite Database"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Connect to Database" icon={Icon.HardDrive} onSubmit={handleSubmit} />
          <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} shortcut={{ modifiers: ["cmd"], key: "[" }} />
        </ActionPanel>
      }
    >
      <Form.Description text="Connect to the Proton Authenticator SQLite database for live synchronization." />
      <Form.PasswordField
        id="encryptionKey"
        title="Encryption Key"
        placeholder="Enter your encryption key..."
        value={encryptionKey}
        onChange={(value) => {
          setEncryptionKeyValue(value);
          validateKey(value);
        }}
        error={keyError}
        info="The 32-byte encryption key from your macOS Keychain"
      />
      <Form.Description
        title="How to get your encryption key"
        text={`1. Open Keychain Access.app (search in Spotlight)
2. Search for "me.proton.authenticator"
3. Find the entry with account name starting with "encryptionKey-..."
4. Double-click to open, then click the checkbox that states "Show password"
5. Enter your macOS password when prompted
6. Copy the revealed password/key and paste it above`}
      />
    </Form>
  );
}
