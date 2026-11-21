import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Usage } from "./lib/api";
import { errorMessage, getClient, showError } from "./lib/raycast";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function planTitle(plan: string): string {
  return plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Unknown";
}

function progressBar(used: number, limit: number): string {
  const ratio = limit > 0 ? Math.min(used / limit, 1) : 0;
  const filled = Math.round(ratio * 20);
  return `${"█".repeat(filled)}${"░".repeat(20 - filled)} ${Math.round(ratio * 100)}%`;
}

function usageMarkdown(data: Usage): string {
  const { screenshots_used: used, screenshots_limit: limit, screenshots_remaining: remaining } = data.usage;
  const extra = data.usage.extra_credits
    ? `\n\nExtra credits: **${data.usage.extra_credits.toLocaleString("en-US")}**`
    : "";
  return [
    `# ${remaining.toLocaleString("en-US")} captures left`,
    `${used.toLocaleString("en-US")} of ${limit.toLocaleString("en-US")} used this month on the ${planTitle(data.plan)} plan.`,
    "`" + progressBar(used, limit) + "`",
    `Resets on **${formatDate(data.period.end)}**.${extra}`,
  ].join("\n\n");
}

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(() => getClient().usage(), [], {
    onError: (err) => showError("Could not load usage", err),
  });

  const markdown = data ? usageMarkdown(data) : error ? `## Could not load usage\n\n${errorMessage(error)}` : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Plan" text={planTitle(data.plan)} />
            <Detail.Metadata.Label
              title="Captures Left"
              text={data.usage.screenshots_remaining.toLocaleString("en-US")}
            />
            <Detail.Metadata.Label title="Used" text={data.usage.screenshots_used.toLocaleString("en-US")} />
            <Detail.Metadata.Label title="Monthly Limit" text={data.usage.screenshots_limit.toLocaleString("en-US")} />
            <Detail.Metadata.Label title="Period Start" text={formatDate(data.period.start)} />
            <Detail.Metadata.Label title="Resets On" text={formatDate(data.period.end)} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action.OpenInBrowser title="Open Dashboard" url="https://app.snap-render.com/dashboard" />
          <Action.OpenInBrowser title="View Plans" url="https://snap-render.com/pricing" />
        </ActionPanel>
      }
    />
  );
}
