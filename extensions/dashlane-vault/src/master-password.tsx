import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { DASHLANE_KEYCHAIN_KEY_NAME, getMasterPassword } from "./helper/master-password";
import { setKeychainItem } from "./lib/authcli";
import { encryptVault } from "./lib/dcli";

export default function SetMasterPassword() {
  const [password, setPasswordInput] = useState("");
  const [passwordExists, setPasswordExists] = useState(false);

  const fetchKeyNameAndCheckPassword = async () => {
    const existingPassword = await getMasterPassword();
    if (existingPassword) {
      setPasswordExists(true);
      setPasswordInput(existingPassword);
    }
  };

  const handleSetPassword = async () => {
    if (!password) {
      showToast({ style: Toast.Style.Failure, title: "Password cannot be empty" });
      return;
    }
    try {
      await setKeychainItem(DASHLANE_KEYCHAIN_KEY_NAME, password);
      await encryptVault();
      showToast({
        style: Toast.Style.Success,
        title: passwordExists ? "Password updated successfully" : "Password set successfully",
      });
      setPasswordExists(true);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to set password", message: String(error) });
    }
  };

  useEffect(() => {
    fetchKeyNameAndCheckPassword();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title={passwordExists ? "Update Master Password" : "Set Master Password"}
            onAction={handleSetPassword}
          />
        </ActionPanel>
      }
    >
      <Form.PasswordField
        id="password"
        title="Master Password"
        placeholder="Enter your master password"
        value={password}
        onChange={setPasswordInput}
      />
    </Form>
  );
}
