import { Action, ActionPanel, closeMainWindow, getPreferenceValues, List, open, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import AdvancedURIPluginNotInstalled from "./components/Notifications/AdvancedURIPluginNotInstalled";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { vaultsWithoutAdvancedURIToast } from "./components/Toasts";
import { DailyNoteAppendPreferences } from "./utils/preferences";
import { getObsidianTarget, ObsidianTargetType } from "./utils/utils";
import { useObsidianVaults } from "./utils/hooks";
import { vaultPluginCheck } from "./api/vault/plugins/plugins.service";
import { clearCache } from "./api/cache/cache.service";
import { applyTemplates } from "./api/templating/templating.service";

interface DailyNoteAppendArgs {
  text: string;
}

export default function DailyNoteAppend(props: { arguments: DailyNoteAppendArgs }) {
  const { vaults, ready } = useObsidianVaults();
  const { text } = props.arguments;
  const { appendTemplate, heading, vaultName, prepend, silent } = getPreferenceValues<DailyNoteAppendPreferences>();
  const [vaultsWithPlugin, vaultsWithoutPlugin] = vaultPluginCheck(vaults, "obsidian-advanced-uri");
  const [content, setContent] = useState("");
  const [isAppending, setIsAppending] = useState(false);

  useEffect(() => {
    async function getContent() {
      const content = await applyTemplates(text, appendTemplate);
      setContent(content);
    }
    getContent();
  }, []);

  // Handle automatic append for single vault or specified vault
  useEffect(() => {
    if (!ready || !content || isAppending) return;
    if (vaults.length === 0 || vaultsWithPlugin.length === 0) return;

    const selectedVault = vaultName && vaults.find((vault) => vault.name === vaultName);

    // If there's a configured vault, or only one vault, use that
    if (selectedVault || vaultsWithPlugin.length === 1) {
      const vaultToUse = selectedVault || vaultsWithPlugin[0];
      setIsAppending(true);

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
  }, [ready, content, vaults, vaultsWithPlugin, vaultName]);

  if (!ready || !content) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  }

  if (vaultsWithoutPlugin.length > 0) {
    vaultsWithoutAdvancedURIToast(vaultsWithoutPlugin);
  }
  if (vaultsWithPlugin.length === 0) {
    return <AdvancedURIPluginNotInstalled />;
  }
  if (vaultName && !vaultsWithPlugin.some((v) => v.name === vaultName)) {
    return <AdvancedURIPluginNotInstalled vaultName={vaultName} />;
  }

  // Only show the vault selection list if we have multiple vaults and no specific vault configured
  if (!vaultName && vaultsWithPlugin.length > 1) {
    return (
      <List>
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
                    silent: silent,
                  })}
                  onOpen={() => {
                    clearCache();
                    popToRoot();
                    closeMainWindow();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  // For single vault or configured vault, show a loading state until the automatic append happens
  return <List isLoading={true}></List>;
}
