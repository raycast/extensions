import { Action, ActionPanel, Icon, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { checkCoreAvailable, CORE_INSTALL_URL, getBootstrapCopyText, getRepairCopyText } from "./core-check";
import { resolveDeliveryDirs } from "./config-utils";
import { readCoreInstallation } from "./installation-status";
import { loadRunConfig } from "./run-utils";

export default function Command() {
  const prefs = getPreferenceValues<Preferences.RunPipeline>();
  const abortable = useRef(new AbortController());
  const configPath = prefs.configPath?.trim() ?? "";
  const { paperDir, libraryDir } = resolveDeliveryDirs(configPath, prefs.paperDir?.trim() ?? "");
  const repair = getRepairCopyText(configPath);
  let configError: string | undefined;
  try {
    loadRunConfig(prefs);
  } catch (error) {
    configError = error instanceof Error ? error.message : "Could not read configuration.";
  }

  const { data, error, isLoading, revalidate } = usePromise(
    async () => {
      const preferences = getPreferenceValues<Preferences.RunPipeline>();
      const signal = abortable.current.signal;
      const result = await checkCoreAvailable(preferences, signal);
      signal.throwIfAborted();
      if (!result.ok) return { ok: false, status: result.error ?? "Check the core installation." };
      const installation = await readCoreInstallation(preferences, signal);
      return {
        ok: true,
        status: `Core ${installation.version ?? "unpackaged"} · Python ${installation.pythonVersion}`,
      };
    },
    [],
    { abortable },
  );
  const coreStatus = isLoading
    ? "Checking core installation…"
    : error
      ? "Could not inspect the core. Check Python Executable in Preferences."
      : data?.status;
  const coreOk = !isLoading && !error && data?.ok;

  const actions = (
    <ActionPanel>
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action title="Refresh Setup" icon={Icon.ArrowClockwise} onAction={revalidate} />
      {repair && <Action.CopyToClipboard title="Copy Core Repair Command" content={repair} />}
      <Action.CopyToClipboard title="Copy Core Install Command" content={getBootstrapCopyText()} />
      <Action.OpenInBrowser title="Open Setup Guide" url={CORE_INSTALL_URL} />
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter setup checks…">
      <List.Section title="Installation" subtitle="Checks local setup without fetching papers or calling a model">
        <List.Item
          title="Core"
          subtitle={coreStatus}
          icon={coreOk ? Icon.CheckCircle : Icon.ExclamationMark}
          actions={actions}
        />
        <List.Item
          title="Run configuration"
          subtitle={configError ?? "Ready for a manual run"}
          icon={configError ? Icon.ExclamationMark : Icon.CheckCircle}
          actions={actions}
        />
        <List.Item
          title="Configuration file"
          subtitle={configPath || "Set Config File Path in Preferences"}
          actions={actions}
        />
        <List.Item
          title="Paper directory"
          subtitle={paperDir || "Set delivery.paper_dir in config.yaml"}
          accessories={[{ text: prefs.paperDir?.trim() ? "Raycast override" : "config.yaml" }]}
          actions={actions}
        />
        <List.Item
          title="Library directory"
          subtitle={libraryDir || "Derived from the paper directory"}
          accessories={[{ text: prefs.paperDir?.trim() ? "Raycast override" : "config.yaml" }]}
          actions={actions}
        />
      </List.Section>
      <List.Section
        title="Configuration sources"
        subtitle="Raycast runs keep YAML interests, prompts, exports, and other shared settings"
      >
        <List.Item
          title="Discovery filters"
          subtitle={`${prefs.maxPapersPerDay} papers · ${prefs.lookbackDays} day window`}
          accessories={[{ text: "Raycast Preferences" }]}
          actions={actions}
        />
        <List.Item
          title="AI summaries"
          subtitle={prefs.summarizeEnabled ? `${prefs.summarizeProvider} · ${prefs.summarizeModel}` : "Disabled"}
          accessories={[{ text: "Raycast Preferences" }]}
          actions={actions}
        />
        <List.Item
          title="Scholar Inbox"
          subtitle={prefs.scholarEnabled ? `Enabled · ${prefs.scholarProvider || "set a provider"}` : "Disabled"}
          accessories={[{ text: "Raycast Preferences" }]}
          actions={actions}
        />
        <List.Item
          title="Daily schedule"
          subtitle="An installed schedule uses the settings saved when installed. Reinstall it after changing preferences."
          actions={actions}
        />
      </List.Section>
    </List>
  );
}
