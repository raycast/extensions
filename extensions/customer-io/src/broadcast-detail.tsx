import { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, showToast, Toast, open, getPreferenceValues, Icon } from "@raycast/api";
import {
  getBroadcastDetails,
  getBroadcastMetrics,
  pauseBroadcast,
  resumeBroadcast,
  Broadcast,
  CalculatedMetrics,
} from "./api";
import { getStateColor } from "./utils/colors";
import { formatNumber, formatPercent, formatState, formatTypeName } from "./utils/formatters";
import { formatDate } from "./utils/format-date";
import { getCustomerIoUrl } from "./utils/url-builder";

function getTypeIcon(type?: string): Icon {
  switch (type) {
    case "email":
      return Icon.Envelope;
    case "webhook":
      return Icon.Globe;
    case "push":
      return Icon.Bell;
    case "slack":
      return Icon.Message;
    case "twilio":
    case "sms":
      return Icon.Phone;
    case "in_app":
      return Icon.AppWindow;
    default:
      return Icon.Megaphone;
  }
}

interface BroadcastDetailProps {
  id: number;
}

function buildMarkdown(broadcast: Broadcast, metrics: CalculatedMetrics | null): string {
  let md = `# ${broadcast.name}\n\n`;

  // Don't show metrics for drafts
  if (broadcast.state?.toLowerCase() === "draft") {
    md += `---\n\n`;
    md += `_This broadcast is a draft. No metrics available yet._\n`;
    return md;
  }

  md += `---\n\n`;
  md += `## Performances\n\n`;

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
    if (metrics.spammed > 0) {
      md += `| Marked as Spam | ${formatNumber(metrics.spammed)} | ${formatPercent(metrics.spamRate)} |\n`;
    }
    if (metrics.suppressed > 0) {
      md += `| Suppressed | ${formatNumber(metrics.suppressed)} | - |\n`;
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
    if (metrics.converted > 0) {
      md += `| Converted | ${formatPercent(metrics.conversionRate)} |\n`;
    }
    if (metrics.unsubscribed > 0) {
      md += `| Unsubscribed | ${formatPercent(metrics.unsubscribeRate)} |\n`;
    }
  } else {
    md += `_No metrics available for this broadcast_\n`;
  }

  return md;
}

export default function BroadcastDetail({ id }: BroadcastDetailProps) {
  const preferences = getPreferenceValues<{ workspace_id?: string }>();
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [metrics, setMetrics] = useState<CalculatedMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getBroadcastDetails(id), getBroadcastMetrics(id)])
      .then(([broadcastData, metricsData]) => {
        setBroadcast(broadcastData);
        setMetrics(metricsData);
      })
      .catch((error) => {
        showToast({ title: "Error loading broadcast details", message: error.message, style: Toast.Style.Failure });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const metadata = broadcast ? (
    <Detail.Metadata>
      <Detail.Metadata.Label title="ID" text={broadcast.id.toString()} />

      {/* Status & Info */}
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item text={formatState(broadcast.state)} color={getStateColor(broadcast.state)} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Type" text={formatTypeName(broadcast.type)} icon={getTypeIcon(broadcast.type)} />
      {broadcast.tags && broadcast.tags.length > 0 && (
        <Detail.Metadata.TagList title="Tags">
          {broadcast.tags.map((tag, index) => (
            <Detail.Metadata.TagList.Item key={index} text={tag} />
          ))}
        </Detail.Metadata.TagList>
      )}

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="Created" text={formatDate(broadcast.created)} />
      <Detail.Metadata.Label title="Last Updated" text={formatDate(broadcast.updated)} />
      {broadcast.sent_at && <Detail.Metadata.Label title="Sent At" text={formatDate(broadcast.sent_at)} />}
      {broadcast.first_started && (
        <Detail.Metadata.Label title="First Started" text={formatDate(broadcast.first_started)} />
      )}
    </Detail.Metadata>
  ) : undefined;

  const markdown = broadcast ? buildMarkdown(broadcast, metrics) : "Loading...";

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      metadata={metadata}
      actions={
        broadcast ? (
          <ActionPanel>
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
                const url = getCustomerIoUrl(preferences.workspace_id, "broadcast", broadcast.id, {
                  broadcastType: broadcast.type,
                  state: broadcast.state,
                });
                open(url);
              }}
            />
            <Action
              title="Pause Broadcast"
              icon={Icon.Pause}
              onAction={async () => {
                try {
                  await pauseBroadcast(broadcast.id);
                  await showToast({ title: "Broadcast paused", style: Toast.Style.Success });
                  const updated = await getBroadcastDetails(id);
                  setBroadcast(updated);
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
              title="Resume Broadcast"
              icon={Icon.Play}
              onAction={async () => {
                try {
                  await resumeBroadcast(broadcast.id);
                  await showToast({ title: "Broadcast resumed", style: Toast.Style.Success });
                  const updated = await getBroadcastDetails(id);
                  setBroadcast(updated);
                } catch (error) {
                  await showToast({
                    title: "Failed to resume",
                    message: (error as Error).message,
                    style: Toast.Style.Failure,
                  });
                }
              }}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
