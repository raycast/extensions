import { Action, ActionPanel, closeMainWindow, getPreferenceValues, List, open, popToRoot } from "@raycast/api";

import { NoVaultFoundMessage } from "./Notifications/NoVaultFoundMessage";
import AdvancedURIPluginNotInstalled from "./Notifications/AdvancedURIPluginNotInstalled";
import { useObsidianVaults, useVaultPluginCheck } from "../utils/hooks";
import { DailyNotePreferences } from "../utils/preferences";
import { Obsidian, ObsidianTargetType, type ObsidianVault } from "@/obsidian";

interface DailyNoteProps {
  actionTitle?: string;
  commandId?: string;
}

export function DailyNote({ actionTitle = "Daily Note", commandId }: DailyNoteProps) {
  const { vaults, ready } = useObsidianVaults();
  const { vaultName } = getPreferenceValues<DailyNotePreferences>();
  const preselectedVault = vaults.find((vault) => vault.name === vaultName);

  const getTarget = (vault: ObsidianVault) =>
    commandId
      ? Obsidian.getTarget({ type: ObsidianTargetType.Command, vault, commandId })
      : Obsidian.getTarget({ type: ObsidianTargetType.DailyNote, vault });
  const { vaultsWithPlugin } = useVaultPluginCheck({
    vaults: vaults,
    communityPlugins: ["obsidian-advanced-uri"],
    corePlugins: ["daily-notes"],
  });

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  }

  if (vaultsWithPlugin.length == 0) {
    return <AdvancedURIPluginNotInstalled corePlugins={["daily-notes"]} />;
  }

  if (preselectedVault || vaultsWithPlugin.length == 1) {
    const vaultToUse = preselectedVault || vaultsWithPlugin[0];
    const target = getTarget(vaultToUse);
    open(target);
    popToRoot();
    closeMainWindow();
  }

  return (
    <List isLoading={vaultsWithPlugin === undefined}>
      {vaultsWithPlugin?.map((vault) => (
        <List.Item
          title={vault.name}
          key={vault.key}
          actions={
            <ActionPanel>
              <Action.Open title={actionTitle} target={getTarget(vault)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
