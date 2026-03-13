import { Action, ActionPanel, Detail, Icon, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { formatUsd, getStartup, type StartupDetail } from "../lib/api";

type StartupDetailViewProps = {
  slug: string;
  onReset?: () => void;
};

function toMarkdown(data: StartupDetail): string {
  const lines: string[] = [];
  lines.push(`# ${data.name}`);

  if (data.description) {
    lines.push(data.description);
  }

  if (data.techStack.length > 0) {
    lines.push("## Tech Stack");
    lines.push(data.techStack.map((tech) => `- ${tech.slug} (${tech.category})`).join("\n"));
  }

  if (data.cofounders.length > 0) {
    lines.push("## Cofounders");
    lines.push(
      data.cofounders
        .map((cofounder) => `- @${cofounder.xHandle}${cofounder.xName ? ` (${cofounder.xName})` : ""}`)
        .join("\n"),
    );
  }

  return lines.join("\n\n");
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "-";
  }

  if (Math.abs(value) > 1) {
    return `${value.toFixed(1)}%`;
  }

  return `${(value * 100).toFixed(1)}%`;
}

function formatDecimal(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRevenuePerVisitor(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return `$${value.toFixed(2)}`;
}

function formatRank(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return `#${value}`;
}

function startupUrl(slug: string): string {
  return `https://trustmrr.com/startup/${slug}`;
}

export function StartupDetailView({ slug, onReset }: StartupDetailViewProps) {
  const { data, isLoading, revalidate } = useCachedPromise(
    async (currentSlug: string) => {
      return getStartup(currentSlug);
    },
    [slug],
    {
      keepPreviousData: true,
      onError: async (error: unknown) => {
        await showToast({
          title: "Failed to fetch startup",
          message: error instanceof Error ? error.message : String(error),
          style: Toast.Style.Failure,
        });
      },
    },
  );

  const metadata = data ? (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Slug" text={data.slug} />
      <Detail.Metadata.Label title="Category" text={data.category ?? "-"} />
      <Detail.Metadata.Label title="On Sale" text={data.onSale ? "Yes" : "No"} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Revenue (30d)" text={formatUsd(data.revenue.last30Days)} />
      <Detail.Metadata.Label title="MRR" text={formatUsd(data.revenue.mrr)} />
      <Detail.Metadata.Label title="Asking Price" text={formatUsd(data.askingPrice)} />
      <Detail.Metadata.Label title="Revenue Rank" text={formatRank(data.rank)} />
      <Detail.Metadata.Label title="Growth (30d)" text={formatPercent(data.growth30d)} />
      <Detail.Metadata.Label title="MRR Growth (30d)" text={formatPercent(data.growthMRR30d)} />
      <Detail.Metadata.Label
        title="Profit Margin"
        text={data.profitMarginLast30Days === null ? "-" : `${data.profitMarginLast30Days}%`}
      />
      <Detail.Metadata.Label title="Revenue / Visitor" text={formatRevenuePerVisitor(data.revenuePerVisitor)} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Payment Provider" text={data.paymentProvider} />
      <Detail.Metadata.Label title="Merchant of Record" text={data.isMerchantOfRecord ? "Yes" : "No"} />
      <Detail.Metadata.Label title="Customers" text={String(data.customers)} />
      <Detail.Metadata.Label title="Active Subscriptions" text={String(data.activeSubscriptions)} />
      <Detail.Metadata.Label title="Visitors (30d)" text={formatDecimal(data.visitorsLast30Days)} />
      <Detail.Metadata.Label
        title="Search Impressions (30d)"
        text={formatDecimal(data.googleSearchImpressionsLast30Days)}
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Tech">
        {data.techStack.map((tech: StartupDetail["techStack"][number]) => (
          <Detail.Metadata.TagList.Item key={`${tech.category}-${tech.slug}`} text={tech.slug} />
        ))}
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  ) : undefined;

  return (
    <Detail
      isLoading={isLoading}
      markdown={data ? toMarkdown(data) : "Loading startup details..."}
      metadata={metadata}
      actions={
        <ActionPanel>
          {data?.website ? <Action.OpenInBrowser title="Open Website" url={data.website} /> : null}
          <Action.OpenInBrowser title="Open on TrustMRR" url={startupUrl(slug)} />
          <Action.CopyToClipboard title="Copy Slug" content={slug} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          {onReset ? <Action title="Search Another Slug" icon={Icon.MagnifyingGlass} onAction={onReset} /> : null}
          <Action title="Edit API Key" icon={Icon.Key} onAction={() => openExtensionPreferences()} />
        </ActionPanel>
      }
    />
  );
}
