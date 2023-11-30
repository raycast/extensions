// Command to create settings for the app
import { Action, ActionPanel, List, popToRoot, Form, LocalStorage, showToast, Toast } from "@raycast/api";

import { useObsidianVaults } from "../utils/utils";
import { NoVaultFoundMessage } from "../components/Notifications/NoVaultFoundMessage";
import { useState } from "react";

export default function Settings() {
  const { ready, vaults: allVaults } = useObsidianVaults();

  const [defaultVault, setDefaultVault] = useState<string | undefined>(undefined);

  const [defaultPath, setDefaultPath] = useState<string | undefined>(undefined);

  LocalStorage.getItem("vault").then((savedVault) => {
    if (savedVault) setDefaultVault(savedVault.toString());
    if (allVaults.length === 1) {
      setDefaultVault(allVaults[0].name);
    }
  });

  LocalStorage.getItem("path").then((savedPath) => {
    if (savedPath) setDefaultPath(savedPath.toString());
    else setDefaultPath("/inbox");
  });

  const saveSettings = async ({ vault, path }: Form.Values) => {
    try {
      await LocalStorage.setItem("vault", vault);
      await LocalStorage.setItem("path", path);
      showToast({
        style: Toast.Style.Success,
        title: "Setting Saved",
      });
      popToRoot();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save settings. Try again",
      });
    }
  };

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (allVaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (allVaults.length >= 1) {
    return (
      allVaults.length >= 1 && (
        <Form
          navigationTitle="Lazy Obsidian Settings"
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Save Settings" onSubmit={saveSettings} />
            </ActionPanel>
          }
        >
          <Form.Dropdown id="vault" title="Vault" defaultValue={defaultVault}>
            {allVaults.map((vault) => (
              <Form.Dropdown.Item key={vault.key} value={vault.name} title={vault.name} icon="🧳" />
            ))}
          </Form.Dropdown>
          <Form.TextField
            id="path"
            title="Storage Path"
            defaultValue={defaultPath}
            info="Path where newly captured notes will be saved"
          />
        </Form>
      )
    );
  }
}
