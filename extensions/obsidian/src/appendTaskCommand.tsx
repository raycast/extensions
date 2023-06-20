import { Action, ActionPanel, closeMainWindow, getPreferenceValues, List, open, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import AdvancedURIPluginNotInstalled from "./components/Notifications/AdvancedURIPluginNotInstalled";
import { NoPathProvided } from "./components/Notifications/NoPathProvided";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { vaultsWithoutAdvancedURIToast } from "./components/Toasts";
import { appendTaskPreferences } from "./utils/preferences";
import {
  applyTemplates,
  getObsidianTarget,
  ObsidianTargetType,
  useObsidianVaults,
  vaultPluginCheck,
} from "./utils/utils";

interface appendTaskArgs {
  text: string;
  dueDate: string;
}

export default function appendTask(props: { arguments: appendTaskArgs }) {
  const { vaults, ready } = useObsidianVaults();
  const { text } = props.arguments;
  const { dueDate } = props.arguments;
  const dateContent = dueDate ? " 📅 " + dueDate : "";

  const { appendTemplate, heading, notePath, noteTag, vaultName, silent } =
    getPreferenceValues<appendTaskPreferences>();
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
  if (!notePath) {
    // Fail if selected vault doesn't have plugin
    return <NoPathProvided />;
  }

  const tag = noteTag ? noteTag + " " : "";

  const selectedVault = vaultName && vaults.find((vault) => vault.name === vaultName);
  // If there's a configured vault, or only one vault, use that
  if (selectedVault || vaultsWithPlugin.length == 1) {
    const vaultToUse = selectedVault || vaultsWithPlugin[0];
    const target = getObsidianTarget({
      type: ObsidianTargetType.AppendTask,
      path: notePath,
      vault: vaultToUse,
      text: "- [ ] " + tag + content + dateContent,
      heading: heading,
      silent: silent,
    });
    open(target);
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
                title="Append Task"
                target={getObsidianTarget({
                  type: ObsidianTargetType.AppendTask,
                  path: notePath,
                  vault: vault,
                  text: "- [ ] #task " + content + dateContent,
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
