import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useInterval } from "usehooks-ts";

import { MetadataLabel, MetadataSection } from "../components/MetadataLabel";
import {
  collectClaudeUsage,
  collectCodexUsage,
  formatSourceAge,
  formatUsageReset,
  type ProviderUsage,
} from "../lib/ai-usage";

const { showCodexUsage, showSparkUsage, showClaudeUsage, codexPath, claudeUsagePath } =
  getPreferenceValues<ExtensionPreferences>();

function lowestRemaining(usage: ProviderUsage | undefined): number | null {
  if (!usage?.windows.length) return null;
  return Math.min(...usage.windows.map((window) => window.remainingPercent));
}

function accessorySummary({
  isActive,
  codex,
  claude,
  codexLoading,
  claudeLoading,
}: {
  isActive: boolean;
  codex?: ProviderUsage;
  claude?: ProviderUsage;
  codexLoading: boolean;
  claudeLoading: boolean;
}): string {
  // Keep the sidebar summary compact. Provider names are already visible in the detail pane.
  const values = [
    showCodexUsage && lowestRemaining(codex) != null ? `${lowestRemaining(codex)}%` : null,
    showClaudeUsage && lowestRemaining(claude) != null ? `${lowestRemaining(claude)}%` : null,
  ].filter(Boolean);

  if (values.length > 0) return values.join(" · ");
  if (isActive && (codexLoading || claudeLoading)) return "Loading…";
  return "—";
}

function UsageSection({ name, usage, error }: { name: string; usage?: ProviderUsage; error?: Error }) {
  return (
    <>
      <MetadataSection title={name} />
      {error ? <MetadataLabel title="Status" text={error.message} /> : null}
      {!error && !usage ? <MetadataLabel title="Status" text="Loading…" /> : null}
      {usage?.windows.map((window) => (
        <MetadataLabel
          key={window.id}
          title={window.label}
          text={`${window.remainingPercent}% remaining`}
          percentMode="free"
        />
      ))}
      {name === "Codex" ? (
        usage?.windows.map((window) => (
          <MetadataLabel
            key={`${window.id}-reset`}
            title={`${window.label} Reset`}
            text={formatUsageReset(window.resetsAt)}
          />
        ))
      ) : usage ? (
        <MetadataLabel title="Source" text={formatSourceAge(usage.updatedAt)} />
      ) : null}
    </>
  );
}

export default function AIUsageMonitor({ isActive = false }: { isActive?: boolean }) {
  const codex = usePromise(collectCodexUsage, [codexPath, showSparkUsage], {
    execute: isActive && showCodexUsage,
  });
  const claude = usePromise(collectClaudeUsage, [claudeUsagePath], {
    execute: isActive && showClaudeUsage,
  });

  const refresh = async () => {
    const tasks: Promise<unknown>[] = [];
    if (showCodexUsage && !codex.isLoading) tasks.push(codex.revalidate());
    if (showClaudeUsage && !claude.isLoading) tasks.push(claude.revalidate());
    await Promise.allSettled(tasks);
  };

  useInterval(() => {
    if (isActive) void refresh();
  }, 60_000);

  const isLoading =
    (showCodexUsage && codex.isLoading && !codex.data) || (showClaudeUsage && claude.isLoading && !claude.data);
  const accessory = accessorySummary({
    isActive,
    codex: codex.data,
    claude: claude.data,
    codexLoading: codex.isLoading,
    claudeLoading: claude.isLoading,
  });

  return (
    <List.Item
      id="ai-usage"
      title="AI Usage"
      icon={Icon.Gauge}
      accessories={[{ text: accessory }]}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            <List.Item.Detail.Metadata>
              {showCodexUsage ? <UsageSection name="Codex" usage={codex.data} error={codex.error} /> : null}
              {showCodexUsage && showClaudeUsage ? <List.Item.Detail.Metadata.Separator /> : null}
              {showClaudeUsage ? <UsageSection name="Claude" usage={claude.data} error={claude.error} /> : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh AI Usage"
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              await showToast({ style: Toast.Style.Animated, title: "Refreshing AI usage…" });
              await refresh();
              await showToast({ style: Toast.Style.Success, title: "AI usage refreshed" });
            }}
          />
          <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
