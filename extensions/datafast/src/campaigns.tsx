import { useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Keyboard,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchCampaigns, fetchMetadata } from "./lib/api";
import { useDateRange } from "./lib/date-ranges";
import { CampaignData } from "./lib/types";
import { formatNumber, formatCurrency } from "./lib/format";

function getCampaignLabel(c: CampaignData): string {
  const { utm_campaign, utm_medium, utm_content, utm_term, ref, source, via } =
    c.campaign;
  if (utm_campaign) return utm_campaign;
  const parts = [utm_medium, utm_content, utm_term, ref, source, via].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(" / ") : "Direct / Unknown";
}

function getSourceLabel(c: CampaignData): string {
  return (
    c.campaign.utm_source || c.campaign.source || c.campaign.via || "Direct"
  );
}

function sourceIcon(source: string): Icon {
  const s = source.toLowerCase();
  if (s.includes("google")) return Icon.MagnifyingGlass;
  if (s.includes("twitter") || s.includes("x.com")) return Icon.Bird;
  if (s.includes("facebook") || s.includes("meta")) return Icon.TwoPeople;
  if (s.includes("email") || s.includes("newsletter")) return Icon.Envelope;
  return Icon.Megaphone;
}

function CampaignDetailMetadata({
  campaign,
  currency,
}: {
  campaign: CampaignData;
  currency: string;
}) {
  const c = campaign.campaign;
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Visitors"
            text={formatNumber(campaign.visitors)}
            icon={Icon.Person}
          />
          <List.Item.Detail.Metadata.Label
            title="Revenue"
            text={formatCurrency(campaign.revenue, currency)}
            icon={Icon.BankNote}
          />
          <List.Item.Detail.Metadata.Separator />
          {c.utm_source && (
            <List.Item.Detail.Metadata.Label
              title="Source"
              text={c.utm_source}
            />
          )}
          {c.utm_medium && (
            <List.Item.Detail.Metadata.Label
              title="Medium"
              text={c.utm_medium}
            />
          )}
          {c.utm_campaign && (
            <List.Item.Detail.Metadata.Label
              title="Campaign"
              text={c.utm_campaign}
            />
          )}
          {c.utm_term && (
            <List.Item.Detail.Metadata.Label title="Term" text={c.utm_term} />
          )}
          {c.utm_content && (
            <List.Item.Detail.Metadata.Label
              title="Content"
              text={c.utm_content}
            />
          )}
          {c.ref && (
            <List.Item.Detail.Metadata.Label title="Ref" text={c.ref} />
          )}
          {c.source && (
            <List.Item.Detail.Metadata.Label
              title="Source (alt)"
              text={c.source}
            />
          )}
          {c.via && (
            <List.Item.Detail.Metadata.Label title="Via" text={c.via} />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Campaigns() {
  const { range, dropdown } = useDateRange("30d");

  const params = useMemo(() => ({ ...range, limit: 100 }), [range]);
  const { data, isLoading } = useCachedPromise(fetchCampaigns, [params], {
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to get Datafast data" },
  });
  const { data: metadata } = useCachedPromise(fetchMetadata, []);

  const currency = metadata?.currency || "USD";
  const campaigns = data || [];

  const grouped = new Map<string, CampaignData[]>();
  for (const c of campaigns) {
    const source = getSourceLabel(c);
    if (!grouped.has(source)) grouped.set(source, []);
    grouped.get(source)?.push(c);
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search campaigns..."
      searchBarAccessory={dropdown}
    >
      {Array.from(grouped.entries()).map(([source, items]) => (
        <List.Section key={source} title={source}>
          {items.map((c, i) => (
            <List.Item
              key={`${source}-${i}`}
              title={getCampaignLabel(c)}
              icon={sourceIcon(source)}
              keywords={[
                c.campaign.utm_source,
                c.campaign.utm_medium,
                c.campaign.utm_campaign,
                c.campaign.utm_term,
                c.campaign.utm_content,
              ].filter(Boolean)}
              accessories={[
                {
                  text: `${formatNumber(c.visitors)}`,
                },
              ]}
              detail={
                <CampaignDetailMetadata campaign={c} currency={currency} />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Campaign Name"
                    icon={Icon.Clipboard}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    content={getCampaignLabel(c)}
                  />
                  <Action.OpenInBrowser
                    title="Open Datafast Dashboard"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    url="https://datafa.st"
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {campaigns.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Campaigns Found"
          description="Try a different date range"
          icon={Icon.Megaphone}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
