import { Action, ActionPanel, closeMainWindow, getPreferenceValues, List, open, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import AdvancedURIPluginNotInstalled from "./components/Notifications/AdvancedURIPluginNotInstalled";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { vaultsWithoutAdvancedURIToast } from "./components/Toasts";
import { applyTemplates, getDailyNoteAppendTarget, useObsidianVaults, vaultPluginCheck } from "./utils/utils";

interface DailyNoteAppendArgs {
  text: string;
}

interface Preferences {
  appendTemplate?: string;
  vaultName?: string;
  heading?: string;
}

export default function DailyNoteAppend(props: { arguments: DailyNoteAppendArgs }) {
  const { vaults, ready } = useObsidianVaults();
  const { text } = props.arguments;
  const { appendTemplate, heading, vaultName } = getPreferenceValues<Preferences>();
  const [vaultsWithPlugin, vaultsWithoutPlugin] = vaultPluginCheck(vaults, "obsidian-advanced-uri");
  const [content, setContent] = useState("");
  useEffect(() => {
    async function getContent() {
      const withTemplate = appendTemplate ? appendTemplate + text : text;
      const content = await applyTemplates(withTemplate);
      setContent(content);
    }
    getContent();
  }, []);

  if (!ready || !content) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  }

  if (vaultsWithoutPlugin.length > 0) {
    vaultsWithoutAdvancedURIToast(vaultsWithoutPlugin);
  }
  if (vaultsWithPlugin.length == 0) {
    return <AdvancedURIPluginNotInstalled />;
  }
  if (vaultName) {
    // Fail if selected vault doesn't have plugin
    if (!vaultsWithPlugin.some((v) => v.name === vaultName)) {
      return <AdvancedURIPluginNotInstalled vaultName={vaultName} />;
    }
  }

  const selectedVault = vaultName && vaults.find((vault) => vault.name === vaultName);
  // If there's a configured vault, or only one vault, use that
  if (selectedVault || vaultsWithPlugin.length == 1) {
    const vaultToUse = selectedVault || vaultsWithPlugin[0];
    const uri = getDailyNoteAppendTarget(vaultToUse, content, heading);
    open(uri);
    popToRoot();
    closeMainWindow();
  }

  // Otherwise let the user select a vault
  return (
    <List isLoading={vaultsWithPlugin === undefined}>
      {vaultsWithPlugin?.map((vault) => (
        <List.Item
          title={vault.name}
          key={vault.key}
          actions={
            <ActionPanel>
              <Action.Open title="Append to Daily Note" target={getDailyNoteAppendTarget(vault, content, heading)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
