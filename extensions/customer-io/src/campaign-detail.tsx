import { useState, useEffect, useCallback } from "react";
import { Detail, ActionPanel, Action, showToast, Toast, open, getPreferenceValues, Icon, Keyboard } from "@raycast/api";
import {
  getCampaignDetails,
  getCampaignMetrics,
  pauseCampaign,
  resumeCampaign,
  Campaign,
  CalculatedMetrics,
  MetricPeriod,
} from "./api";
import { getStateColor } from "./utils/colors";
import { formatNumber, formatPercent, formatState, formatTypeName } from "./utils/formatters";

function getTypeIcon(type?: string): Icon {
  switch (type) {
    case "segment":
      return Icon.Person;
    case "seg_attr":
      return Icon.PersonLines;
    case "behavioral":
      return Icon.LightBulb;
    case "date":
      return Icon.Calendar;
    case "api":
    case "event":
      return Icon.Code;
    default:
      return Icon.Envelope;
  }
}

interface CampaignDetailProps {
  id: number;
}

const PERIOD_OPTIONS: { value: MetricPeriod; label: string; shortcut: Keyboard.Shortcut }[] = [
  { value: "7days", label: "Last 7 days", shortcut: { modifiers: ["cmd"], key: "1" } },
  { value: "30days", label: "Last 30 days", shortcut: { modifiers: ["cmd"], key: "2" } },
  { value: "12weeks", label: "Last 12 weeks", shortcut: { modifiers: ["cmd"], key: "3" } },
  { value: "12months", label: "Last 12 months", shortcut: { modifiers: ["cmd"], key: "4" } },
];

function buildMarkdown(campaign: Campaign, metrics: CalculatedMetrics | null, periodLabel: string): string {
  let md = `# ${campaign.name}\n\n`;

  if (campaign.description) {
    md += `${campaign.description}\n\n`;
  }

  // Don't show metrics for drafts
  if (campaign.state?.toLowerCase() === "draft") {
    md += `---\n\n`;
    md += `_This campaign is a draft. No metrics available yet._\n`;
    return md;
  }

  md += `---\n\n`;
  md += `## Performances (${periodLabel})\n\n`;
  md += `_You can switch the period from the action panel_\n\n`;

  if (metrics && metrics.sent > 0) {
    // Delivery section
    md += `### Delivery\n\n`;
    md += `| Metric | Count | Rate |\n`;
    md += `|--------|------:|-----:|\n`;
    md += `| Sent | ${formatNumber(metrics.sent)} | - |\n`;
    md += `| Delivered | ${formatNumber(metrics.delivered)} | ${formatPercent(metrics.deliveryRate)} |\n`;
    if (metrics.bounced > 0) {
      md += `| Bounced | ${formatNumber(metrics.bounced)} | ${formatPercent(metrics.bounceRate)} |\n`;
    }
    if (metrics.failed > 0) {
      md += `| Failed | ${formatNumber(metrics.failed)} | - |\n`;
    }

    md += `\n### Engagement\n\n`;
    md += `| Metric | Rate |\n`;
    md += `|--------|-----:|\n`;
    md += `| Opened | ${formatPercent(metrics.openRate)} |\n`;
    md += `| Clicked | ${formatPercent(metrics.clickRate)} |\n`;
    md += `| Click-to-Open | ${formatPercent(metrics.clickToOpenRate)} |\n`;
    md += `| Converted | ${formatPercent(metrics.conversionRate)} |\n`;
    if (metrics.unsubscribed > 0) {
      md += `| Unsubscribed | ${formatPercent(metrics.unsubscribeRate)} |\n`;
    }
  } else {
    md += `_No metrics available for this period_\n`;
  }

  return md;
}

export default function CampaignDetail({ id }: CampaignDetailProps) {
  const preferences = getPreferenceValues<{ workspace_id?: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [metrics, setMetrics] = useState<CalculatedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<MetricPeriod>("30days");

  const loadMetrics = useCallback(
    async (selectedPeriod: MetricPeriod) => {
      const metricsData = await getCampaignMetrics(id, selectedPeriod);
      setMetrics(metricsData);
    },
    [id],
  );

  useEffect(() => {
    Promise.all([getCampaignDetails(id), getCampaignMetrics(id, period)])
      .then(([campaignData, metricsData]) => {
        setCampaign(campaignData);
        setMetrics(metricsData);
      })
      .catch((error) => {
        showToast({ title: "Error loading campaign details", message: error.message, style: Toast.Style.Failure });
      })
      .finally(() => setLoading(false));
  }, [id, period]);

  const handlePeriodChange = async (newPeriod: MetricPeriod) => {
    setPeriod(newPeriod);
    setLoading(true);
    await loadMetrics(newPeriod);
    setLoading(false);
  };

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label || "Last 30 days";

  const metadata = campaign ? (
    <Detail.Metadata>
      <Detail.Metadata.Label title="ID" text={campaign.id.toString()} />

      {/* Status & Info */}
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item text={formatState(campaign.state)} color={getStateColor(campaign.state)} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Type" text={formatTypeName(campaign.type)} icon={getTypeIcon(campaign.type)} />
      {campaign.tags && campaign.tags.length > 0 && (
        <Detail.Metadata.TagList title="Tags">
          {campaign.tags.map((tag, index) => (
            <Detail.Metadata.TagList.Item key={index} text={tag} />
          ))}
        </Detail.Metadata.TagList>
      )}

      <Detail.Metadata.Separator />

      {/* Dates */}
      <Detail.Metadata.Label title="Created" text={new Date(campaign.created * 1000).toLocaleDateString()} />
      <Detail.Metadata.Label title="Last Updated" text={new Date(campaign.updated * 1000).toLocaleDateString()} />
      {campaign.first_started && (
        <Detail.Metadata.Label
          title="First Started"
          text={new Date(campaign.first_started * 1000).toLocaleDateString()}
        />
      )}
    </Detail.Metadata>
  ) : undefined;

  const markdown = campaign ? buildMarkdown(campaign, metrics, periodLabel) : "Loading...";

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      metadata={metadata}
      actions={
        campaign ? (
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="Open in Customer.io"
                icon={Icon.Globe}
                onAction={() => {
                  if (!preferences.workspace_id) {
                    showToast({
                      title: "Workspace ID not configured",
                      message: "Please set your Workspace ID in Raycast extension preferences",
                      style: Toast.Style.Failure,
                    });
                    return;
                  }
                  const url = `https://fly.customer.io/workspaces/${preferences.workspace_id}/journeys/campaigns/${campaign.id}/overview`;
                  open(url);
                }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Period">
              {PERIOD_OPTIONS.map((option) => (
                <Action
                  key={option.value}
                  title={option.label}
                  icon={period === option.value ? Icon.CheckCircle : Icon.Circle}
                  shortcut={option.shortcut}
                  onAction={() => handlePeriodChange(option.value)}
                />
              ))}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Pause Campaign"
                icon={Icon.Pause}
                onAction={async () => {
                  try {
                    await pauseCampaign(campaign.id);
                    await showToast({ title: "Campaign paused", style: Toast.Style.Success });
                    const updated = await getCampaignDetails(id);
                    setCampaign(updated);
                  } catch (error) {
                    await showToast({
                      title: "Failed to pause",
                      message: (error as Error).message,
                      style: Toast.Style.Failure,
                    });
                  }
                }}
              />
              <Action
                title="Resume Campaign"
                icon={Icon.Play}
                onAction={async () => {
                  try {
                    await resumeCampaign(campaign.id);
                    await showToast({ title: "Campaign resumed", style: Toast.Style.Success });
                    const updated = await getCampaignDetails(id);
                    setCampaign(updated);
                  } catch (error) {
                    await showToast({
                      title: "Failed to resume",
                      message: (error as Error).message,
                      style: Toast.Style.Failure,
                    });
                  }
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
