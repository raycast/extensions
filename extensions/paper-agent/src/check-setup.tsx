import { Action, ActionPanel, Icon, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { checkCoreAvailable, CORE_INSTALL_URL, getBootstrapCopyText, getRepairCopyText } from "./core-check";
import { resolveDeliveryDirs } from "./config-utils";
import { readCoreInstallation } from "./installation-status";
import { loadRunConfig } from "./run-utils";

export default function Command() {
  const [retry, setRetry] = useState(0);
  const prefs = useMemo(() => getPreferenceValues<Preferences.RunPipeline>(), [retry]);
  const [coreStatus, setCoreStatus] = useState("Checking core installation…");
  const [coreOk, setCoreOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const configPath = prefs.configPath?.trim() ?? "";
  const { paperDir, libraryDir } = resolveDeliveryDirs(configPath, prefs.paperDir?.trim() ?? "");
  const repair = getRepairCopyText(configPath);
  let configError: string | undefined;
  try {
    loadRunConfig(prefs);
  } catch (error) {
    configError = error instanceof Error ? error.message : "Could not read configuration.";
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setCoreOk(false);
    setCoreStatus("Checking core installation…");
    void (async () => {
      const result = await checkCoreAvailable(prefs, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.ok) {
        setCoreStatus(result.error ?? "Check the core installation.");
        return;
      }
      const installation = await readCoreInstallation(prefs, controller.signal);
      if (controller.signal.aborted) return;
      setCoreOk(true);
      setCoreStatus(`Core ${installation.version ?? "unpackaged"} · Python ${installation.pythonVersion}`);
    })()
      .catch(() => {
        if (!controller.signal.aborted)
          setCoreStatus("Could not inspect the core. Check Python Executable in Preferences.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [prefs]);

  const actions = (
    <ActionPanel>
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action title="Refresh Setup" icon={Icon.ArrowClockwise} onAction={() => setRetry((value) => value + 1)} />
      {repair && <Action.CopyToClipboard title="Copy Core Repair Command" content={repair} />}
      <Action.CopyToClipboard title="Copy Core Install Command" content={getBootstrapCopyText()} />
      <Action.OpenInBrowser title="Open Setup Guide" url={CORE_INSTALL_URL} />
    </ActionPanel>
  );

  return (
    <List isLoading={loading} navigationTitle="Check Paper Agent Setup">
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
