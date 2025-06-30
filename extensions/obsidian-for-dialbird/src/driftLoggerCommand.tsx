import { Action, ActionPanel, closeMainWindow, getPreferenceValues, List, open, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import AdvancedURIPluginNotInstalled from "./components/Notifications/AdvancedURIPluginNotInstalled";
import { NoPathProvided } from "./components/Notifications/NoPathProvided";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { vaultsWithoutAdvancedURIToast } from "./components/Toasts";
import { appendTaskPreferences } from "./utils/preferences";
import { getObsidianTarget, ObsidianTargetType } from "./utils/utils";
import { useObsidianVaults } from "./utils/hooks";
import { vaultPluginCheck } from "./api/vault/plugins/plugins.service";
import { clearCache } from "./api/cache/cache.service";
import { applyTemplates } from "./api/templating/templating.service";

interface appendTaskArgs {
  text: string;
  minutes: string;
}

export default function DriftLogger(props: { arguments: appendTaskArgs }) {
  const { vaults, ready } = useObsidianVaults();
  const { text } = props.arguments;
  const { minutes } = props.arguments;

  // 現在時刻から指定された分数を引いて開始時刻を計算
  const now = new Date();
  const startTime = new Date(now.getTime() - parseInt(minutes) * 60 * 1000);
  const startTimeString = startTime.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

  const { appendTemplate, heading, notePath, vaultName, silent } = getPreferenceValues<appendTaskPreferences>();
  const [vaultsWithPlugin, vaultsWithoutPlugin] = vaultPluginCheck(vaults, "obsidian-advanced-uri");
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    async function getContent() {
      const content = await applyTemplates(text, appendTemplate);
      setContent(content);
    }

    getContent();
  }, [appendTemplate, text]);

  if (!ready || content === null) {
    return <List isLoading={true} />;
  }

  if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  }

  if (vaultsWithoutPlugin.length > 0) {
    vaultsWithoutAdvancedURIToast(vaultsWithoutPlugin);
  }

  if (vaultsWithPlugin.length === 0) {
    return <AdvancedURIPluginNotInstalled />;
  }

  if (vaultName) {
    // Fail if selected vault doesn't have plugin
    if (!vaultsWithPlugin.some((v) => v.name === vaultName)) {
      return <AdvancedURIPluginNotInstalled vaultName={vaultName} />;
    }
  }

  if (!notePath) {
    // Fail if selected vault doesn't have plugin
    return <NoPathProvided />;
  }

  const selectedVault = vaultName && vaults.find((vault) => vault.name === vaultName);
  // If there's a configured vault or only one vault, use that
  if (selectedVault || vaultsWithPlugin.length === 1) {
    const vaultToUse = selectedVault || vaultsWithPlugin[0];
    const openObsidian = async () => {
      const notePathExpanded = await applyTemplates(notePath);
      const target = getObsidianTarget({
        type: ObsidianTargetType.AppendTask,
        path: notePathExpanded,
        vault: vaultToUse,
        text: "- " + startTimeString + "~: " + content + " (" + minutes + "min)",
        heading: heading,
        silent: silent,
      });
      open(target);
      clearCache();
      popToRoot();
      closeMainWindow();
    };

    // Render a loading state while the user selects a vault
    if (vaults.length > 1 && !selectedVault) {
      return <List isLoading={true} />;
    }

    // Call the function to open Obsidian when ready
    openObsidian();
  }

  // Otherwise, let the user select a vault
  return (
    <List isLoading={false}>
      {vaultsWithPlugin.map((vault) => (
        <List.Item
          key={vault.key}
          title={vault.name}
          actions={
            <ActionPanel>
              <Action.Open
                title="Drift Logger"
                target={getObsidianTarget({
                  type: ObsidianTargetType.AppendTask,
                  path: notePath,
                  vault: vault,
                  text: "- " + startTimeString + "~: " + content + " (" + minutes + "min)",
                  heading: heading,
                })}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
