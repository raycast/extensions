import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useConfigSnapshot } from "./hooks/useConfig";
import { AeroSpaceRecoveryActions } from "./components/AeroSpaceRecoveryActions";
import { reloadConfig, validateConfig } from "./utils/aerospace";
import { bindingsMatch, ConfigSnapshot, extractShortcuts } from "./utils/config";

export function fencedCodeBlock(content: string, language: string): string {
  const longestFence = Math.max(0, ...[...content.matchAll(/`+/g)].map((match) => match[0].length));
  const fence = "`".repeat(Math.max(3, longestFence + 1));
  return `${fence}${language}\n${content}\n${fence}`;
}

function ConfigFileDetail({ snapshot }: { snapshot: ConfigSnapshot }) {
  return (
    <Detail
      navigationTitle="Full AeroSpace Config"
      markdown={fencedCodeBlock(snapshot.raw, "toml")}
      actions={
        <ActionPanel>
          <Action.OpenWith title="Open Config with…" path={snapshot.path} />
          <Action.CopyToClipboard title="Copy Config" content={snapshot.raw} />
          <Action.ShowInFinder path={snapshot.path} />
          <Action.CopyToClipboard title="Copy Config Path" content={snapshot.path} />
        </ActionPanel>
      }
    />
  );
}

function LoadedConfigDetail({ snapshot }: { snapshot: ConfigSnapshot }) {
  const markdown = snapshot.loadedConfig
    ? [
        "# Configuration Loaded by AeroSpace",
        "",
        "This is the binding configuration reported by `aerospace config --get . --json`. AeroSpace currently exposes `mode.*` values through this command; the complete file remains available from the parent view.",
        "",
        fencedCodeBlock(JSON.stringify(snapshot.loadedConfig, null, 2), "json"),
      ].join("\n")
    : [
        "# Loaded Configuration Unavailable",
        "",
        snapshot.loadedConfigError?.message ?? "AeroSpace did not return its loaded binding configuration.",
        "",
        "The complete configuration file from disk is still available from the parent view.",
      ].join("\n");

  return <Detail navigationTitle="Loaded Binding Configuration" markdown={markdown} />;
}

function versionSummary(snapshot: ConfigSnapshot): string[] {
  if (!snapshot.versionInfo) return [`- Runtime: ⚠️ ${snapshot.versionError?.message ?? "Unavailable"}`];
  const entries = snapshot.versionInfo.split("\n").filter(Boolean);
  const parseEntry = (prefix: string) => {
    const entry = entries.find((line) => line.startsWith(prefix));
    const [version, build] = entry?.slice(prefix.length).trim().split(/\s+/) ?? [];
    return { version, build };
  };
  const client = parseEntry("aerospace CLI client version:");
  const server = parseEntry("AeroSpace.app server version:");
  const compatibility =
    client.version && server.version && client.version === server.version && client.build === server.build
      ? "✅ Client and server builds match."
      : "⚠️ Client and server builds could not be confirmed as matching.";

  return [
    `- CLI: ${client.version ? `**${client.version}**` : "⚠️ Unavailable"}`,
    `- Server: ${server.version ? `**${server.version}**` : "⚠️ Unavailable"}`,
    `- Compatibility: ${compatibility}`,
  ];
}

function healthMarkdown(snapshot: ConfigSnapshot): string {
  const fileShortcuts = snapshot.fileConfig ? extractShortcuts(snapshot.fileConfig) : [];
  const loadedShortcuts = snapshot.loadedConfig ? extractShortcuts(snapshot.loadedConfig) : [];
  const matching = bindingsMatch(snapshot.fileConfig, snapshot.loadedConfig);
  const bindingStatus =
    matching === true
      ? "✅ Bindings on disk match the running configuration."
      : matching === false
        ? "⚠️ Bindings on disk differ from the running configuration. Reload after reviewing the file."
        : "⚠️ The disk and running bindings could not be compared.";
  const validationStatus =
    snapshot.validation.status === "valid"
      ? "✅ Configuration passes AeroSpace dry-run validation with warnings treated as errors."
      : snapshot.validation.status === "unavailable"
        ? `⚠️ Dry-run validation is unavailable in this AeroSpace version: ${snapshot.validation.message}`
        : `❌ Validation failed: ${snapshot.validation.message}`;
  const fileStatus = snapshot.fileConfig
    ? `✅ Parsed ${Object.keys(snapshot.fileConfig.mode ?? {}).length} modes and ${fileShortcuts.length} bindings from disk.`
    : `❌ Could not parse the file: ${snapshot.fileConfigError?.message ?? "Unknown error"}`;
  const loadedStatus = snapshot.loadedConfig
    ? `✅ AeroSpace reports ${Object.keys(snapshot.loadedConfig.mode ?? {}).length} loaded modes and ${loadedShortcuts.length} bindings.`
    : `⚠️ Loaded bindings are unavailable: ${snapshot.loadedConfigError?.message ?? "Unknown error"}`;
  const overview =
    !snapshot.fileConfig || snapshot.validation.status === "invalid"
      ? "Your configuration needs attention."
      : matching === false
        ? "Your configuration is valid, but AeroSpace has not loaded the same bindings."
        : snapshot.validation.status === "unavailable"
          ? "Your configuration is loaded; dry-run validation is unavailable in this AeroSpace version."
          : "Your configuration is ready.";

  return [
    "# AeroSpace Configuration Health",
    "",
    overview,
    "",
    "## Runtime",
    "",
    ...versionSummary(snapshot),
    `- Binary: \`${snapshot.binaryPath}\``,
    `- Current mode: ${snapshot.currentMode ? `**${snapshot.currentMode}**` : `⚠️ ${snapshot.currentModeError?.message ?? "Unavailable"}`}`,
    "",
    "## Configuration",
    "",
    `- Path: \`${snapshot.path}\``,
    `- ${fileStatus}`,
    `- ${loadedStatus}`,
    `- ${bindingStatus}`,
    `- ${validationStatus}`,
    "",
    "Use the actions to inspect the complete TOML file, compare the binding configuration loaded by AeroSpace, validate again, or safely reload.",
  ].join("\n");
}

async function validateFromAction() {
  try {
    await validateConfig();
    await showToast({ style: Toast.Style.Success, title: "Configuration Is Valid" });
  } catch (error) {
    await showFailureToast(error, { title: "Configuration Validation Failed" });
  }
}

async function reloadFromAction(onReloaded: () => void | Promise<unknown>) {
  try {
    await reloadConfig();
    await showToast({ style: Toast.Style.Success, title: "AeroSpace Configuration Reloaded" });
    await onReloaded();
  } catch (error) {
    await showFailureToast(error, {
      title: "Configuration Was Not Reloaded",
      message: "Review the validation error and try again.",
    });
  }
}

export default function Command() {
  const { data: snapshot, isLoading, error, revalidate } = useConfigSnapshot();
  const markdown = snapshot
    ? healthMarkdown(snapshot)
    : isLoading
      ? ""
      : error
        ? `# Failed to Load Config\n\n${error.message}`
        : "No configuration is available.";

  const actions = snapshot ? (
    <ActionPanel>
      <ActionPanel.Section title="Inspect">
        <Action.Push title="View Full Config" icon={Icon.Document} target={<ConfigFileDetail snapshot={snapshot} />} />
        <Action.Push
          title="View Loaded Binding Configuration"
          icon={Icon.MemoryChip}
          target={<LoadedConfigDetail snapshot={snapshot} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Validate and Reload">
        <Action title="Validate Configuration" icon={Icon.CheckCircle} onAction={validateFromAction} />
        <Action
          title="Validate and Reload Configuration"
          icon={Icon.ArrowClockwise}
          onAction={() => reloadFromAction(revalidate)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="File">
        <Action.OpenWith title="Open Config with…" path={snapshot.path} />
        <Action.ShowInFinder path={snapshot.path} />
        <Action.CopyToClipboard title="Copy Config Path" content={snapshot.path} />
        <Action.CopyToClipboard title="Copy Config" content={snapshot.raw} />
      </ActionPanel.Section>
      <Action title="Refresh Config Health" onAction={revalidate} />
    </ActionPanel>
  ) : error ? (
    <AeroSpaceRecoveryActions error={error} onRetry={revalidate} />
  ) : undefined;

  return <Detail isLoading={isLoading} markdown={markdown} actions={actions} />;
}
