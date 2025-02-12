import { Action, ActionPanel, closeMainWindow, getPreferenceValues, List, open, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import AdvancedURIPluginNotInstalled from "./components/Notifications/AdvancedURIPluginNotInstalled";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { vaultsWithoutAdvancedURIToast } from "./components/Toasts";
import { DailyNoteAppendPreferences } from "./utils/preferences";
import {
  applyTemplates,
  getObsidianTarget,
  ObsidianTargetType,
  useObsidianVaults,
  vaultPluginCheck,
} from "./utils/utils";
import { clearCache } from "./utils/data/cache";

interface DailyNoteAppendArgs {
  text: string;
}

export default function DailyNoteAppend(props: { arguments: DailyNoteAppendArgs }) {
  const { vaults, ready } = useObsidianVaults();
  const { text } = props.arguments;
  const { appendTemplate, heading, vaultName, prepend, silent } = getPreferenceValues<DailyNoteAppendPreferences>();
  const [vaultsWithPlugin, vaultsWithoutPlugin] = vaultPluginCheck(vaults, "obsidian-advanced-uri");
  const [content, setContent] = useState("");
  useEffect(() => {
    async function getContent() {
      const content = await applyTemplates(text, appendTemplate);
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
    const target = getObsidianTarget({
      type: ObsidianTargetType.DailyNoteAppend,
      vault: vaultToUse,
      text: content,
      heading: heading,
      prepend: prepend,
      silent: silent,
    });
    open(target);
    clearCache();
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
              <Action.Open
                title="Append to Daily Note"
                target={getObsidianTarget({
                  type: ObsidianTargetType.DailyNoteAppend,
                  vault: vault,
                  text: content,
                  heading: heading,
                  prepend: prepend,
                })}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
