import { Form, ActionPanel, Action, showToast, Toast, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { setKeychainItem } from "./lib/authcli";
import { getMasterPassword } from "./helper/master-password";
import { encryptVault } from "./lib/dcli";

export default function SetMasterPassword() {
    const [password, setPasswordInput] = useState("");
    const [keyName, setKeyName] = useState("");
    const [passwordExists, setPasswordExists] = useState(false);

    const fetchKeyNameAndCheckPassword = async () => {
        const existingPassword = await getMasterPassword();
        if (existingPassword) {
            setPasswordExists(true);
            setPasswordInput(existingPassword);
        } else {
            const keyName = `dashlane-vault-master-password-${Math.random().toString(36).substring(2, 15)}`;
            setKeyName(keyName);
        }
    };

    const handleSetPassword = async () => {
        if (!password) {
            showToast({ style: Toast.Style.Failure, title: "Password cannot be empty" });
            return;
        }
        try {
            await setKeychainItem(keyName, password);
            await encryptVault();
            await LocalStorage.setItem(keyName, "");
            showToast({ style: Toast.Style.Success, title: passwordExists ? "Password updated successfully" : "Password set successfully" });
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
                    <Action title={passwordExists ? "Update Master Password" : "Set Master Password"} onAction={handleSetPassword} />
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