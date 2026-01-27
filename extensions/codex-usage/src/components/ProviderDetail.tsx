import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { UsageData } from "../types";
import { formatPercentage, formatUsage, getTintColor } from "../utils/formatters";

interface ProviderDetailProps {
  usage: UsageData;
  onRefresh?: () => void;
  onOpenDashboard?: () => void;
}

export function ProviderDetail({ usage, onRefresh, onOpenDashboard }: ProviderDetailProps) {
  const markdown = buildDetailMarkdown(usage);

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {onRefresh && <Action title="Refresh" icon={Icon.RotateClockwise} onAction={onRefresh} />}
          {onOpenDashboard && (
            <Action title="Open Dashboard" icon={Icon.Globe} onAction={onOpenDashboard} />
          )}
        </ActionPanel>
      }
    />
  );
}

function buildDetailMarkdown(usage: UsageData): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${usage.provider}`);
  lines.push("");

  // Account info
  if (usage.account) {
    if (usage.account.email) {
      lines.push(`**Account:** ${usage.account.email}`);
    }
    if (usage.account.plan) {
      lines.push(`**Plan:** ${usage.account.plan}`);
    }
    lines.push("");
  }

  // Primary usage
  lines.push("## Session Usage");
  lines.push("");
  const primaryBar = buildProgressBar(usage.primary.usedRatio);
  lines.push(`${primaryBar}`);
  lines.push("");
  lines.push(
    `${formatUsage(usage.primary.used, usage.primary.limit)} (${formatPercentage(usage.primary.usedRatio)})`
  );
  lines.push(`${usage.primary.remaining} requests remaining`);
  lines.push("");

  // Secondary usage
  if (usage.secondary) {
    lines.push("## Weekly Usage");
    lines.push("");
    const secondaryBar = buildProgressBar(usage.secondary.usedRatio);
    lines.push(`${secondaryBar}`);
    lines.push("");
    lines.push(
      `${formatUsage(usage.secondary.used, usage.secondary.limit)} (${formatPercentage(usage.secondary.usedRatio)})`
    );
    lines.push("");
  }

  // Opus/Pro tier (Claude)
  if (usage.opus) {
    lines.push("## Opus/Pro Usage");
    lines.push("");
    const opusBar = buildProgressBar(usage.opus.usedRatio);
    lines.push(`${opusBar}`);
    lines.push("");
    lines.push(
      `${formatUsage(usage.opus.used, usage.opus.limit)} (${formatPercentage(usage.opus.usedRatio)})`
    );
    lines.push("");
  }

  // Reset info
  if (usage.reset) {
    lines.push("## Reset Information");
    lines.push("");
    lines.push(`**Time remaining:** ${usage.reset.relativeTime}`);
    if (usage.reset.absoluteTime) {
      lines.push(`**Next reset:** ${usage.reset.absoluteTime.toLocaleString()}`);
    }
    lines.push("");
  }

  // Cost tracking
  if (usage.cost) {
    lines.push("## Cost Tracking");
    lines.push("");
    lines.push(
      `**Used:** ${usage.cost.currency}${usage.cost.used.toFixed(2)} / ${usage.cost.currency}${usage.cost.limit.toFixed(2)}`
    );
    lines.push("");
  }

  // Last updated
  lines.push("---");
  lines.push(`*Last updated: ${usage.timestamp.toLocaleString()}*`);

  return lines.join("\n");
}

function buildProgressBar(ratio: number): string {
  const filled = Math.round(ratio * 20);
  const empty = 20 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}
