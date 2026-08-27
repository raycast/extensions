import { Action, ActionPanel, Detail } from "@raycast/api";
import { useConfigSnapshot } from "./hooks/useConfig";
import { AeroSpaceRecoveryActions } from "./components/AeroSpaceRecoveryActions";
import { ConfigSnapshot } from "./utils/config";

export function fencedCodeBlock(content: string, language: string): string {
  const longestFence = Math.max(0, ...[...content.matchAll(/`+/g)].map((match) => match[0].length));
  const fence = "`".repeat(Math.max(3, longestFence + 1));
  return `${fence}${language}\n${content}\n${fence}`;
}

function LoadedConfigDetail({ snapshot }: { snapshot: ConfigSnapshot }) {
  const markdown = snapshot.loadedConfig
    ? [
        "# Configuration Loaded by AeroSpace",
        "",
        "This is the binding configuration reported by `aerospace config --get . --json`. AeroSpace currently exposes `mode.*` values through this command; the full file remains available in the parent view.",
        "",
        fencedCodeBlock(JSON.stringify(snapshot.loadedConfig, null, 2), "json"),
      ].join("\n")
    : [
        "# Loaded Configuration Unavailable",
        "",
        snapshot.loadedConfigError?.message ?? "AeroSpace did not return its loaded binding configuration.",
        "",
        "The parent view still shows the complete configuration file from disk.",
      ].join("\n");

  return <Detail navigationTitle="Loaded Binding Configuration" markdown={markdown} />;
}

export default function Command() {
  const { data: snapshot, isLoading, error, revalidate } = useConfigSnapshot();

  const markdown = snapshot
    ? fencedCodeBlock(snapshot.raw, "toml")
    : isLoading
      ? ""
      : error
        ? `# Failed to Load Config\n\n${error.message}`
        : "No configuration is available.";

  const actions = snapshot ? (
    <ActionPanel>
      <Action.OpenWith title="Open Config with…" path={snapshot.path} />
      <Action.Push title="View Loaded Binding Configuration" target={<LoadedConfigDetail snapshot={snapshot} />} />
      <Action.ShowInFinder path={snapshot.path} />
      <Action.CopyToClipboard title="Copy Config Path" content={snapshot.path} />
      <Action.CopyToClipboard title="Copy Config" content={snapshot.raw} />
      <Action title="Reload Config View" onAction={revalidate} />
    </ActionPanel>
  ) : error ? (
    <AeroSpaceRecoveryActions error={error} onRetry={revalidate} />
  ) : undefined;

  return <Detail isLoading={isLoading} markdown={markdown} actions={actions} />;
}
