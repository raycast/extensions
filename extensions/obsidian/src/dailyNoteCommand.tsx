import { Action, ActionPanel, closeMainWindow, getPreferenceValues, List, open, popToRoot } from "@raycast/api";
import { useEffect, useState, useMemo } from "react";

import { getObsidianTarget, ObsidianTargetType } from "./utils/utils";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { vaultsWithoutAdvancedURIToast } from "./components/Toasts";
import AdvancedURIPluginNotInstalled from "./components/Notifications/AdvancedURIPluginNotInstalled";
import { useObsidianVaults } from "./utils/hooks";
import { vaultPluginCheck } from "./api/vault/plugins/plugins.service";
import { DailyNotePreferences } from "./utils/preferences";

export default function Command() {
  const { vaults, ready } = useObsidianVaults();
  const { vaultName } = getPreferenceValues<DailyNotePreferences>();
  const [isOpening, setIsOpening] = useState(false);

  const [vaultsWithPlugin, vaultsWithoutPlugin] = useMemo(() => {
    if (!ready || vaults.length === 0) return [[], []];
    return vaultPluginCheck(vaults, "obsidian-advanced-uri");
  }, [ready, vaults]);

  // Handle automatic opening for single vault or specified vault
  useEffect(() => {
    if (!ready || isOpening) return;
    if (vaults.length === 0 || vaultsWithPlugin.length === 0) return;

    if (vaultsWithoutPlugin.length > 0) {
      vaultsWithoutAdvancedURIToast(vaultsWithoutPlugin);
    }

    const selectedVault = vaultName && vaultsWithPlugin.find((vault) => vault.name === vaultName);

    // If there's a configured vault, or only one vault, use that
    if (selectedVault || vaultsWithPlugin.length === 1) {
      const vaultToUse = selectedVault || vaultsWithPlugin[0];
      setIsOpening(true);

      const target = getObsidianTarget({ type: ObsidianTargetType.DailyNote, vault: vaultToUse });
      open(target);
      popToRoot();
      closeMainWindow();
    }
  }, [ready, vaults, vaultName, isOpening, vaultsWithPlugin, vaultsWithoutPlugin]);

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
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
        {vaultsWithPlugin.map((vault) => (
          <List.Item
            title={vault.name}
            key={vault.key}
            actions={
              <ActionPanel>
                <Action.Open
                  title="Daily Note"
                  target={getObsidianTarget({ type: ObsidianTargetType.DailyNote, vault: vault })}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  return null;
}
