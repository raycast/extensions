import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  List,
  open,
  showHUD,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getLocale,
  getServiceDetail,
  getStatusUrl,
  REPORT_TYPES,
  ServiceDetail,
  submitReport,
} from "./api";
import { statusConfig } from "./search-service";

interface Props {
  slug: string;
  name: string;
}

export default function ServiceDetailView({ slug, name }: Props) {
  const locale = getLocale();
  const {
    data: detail,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (s: string, _locale: string) => getServiceDetail(s),
    [slug, locale],
    {
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Load failed",
          message: err.message,
        });
      },
    },
  );

  const fallbackUrl = getStatusUrl(slug);

  if (error) {
    return (
      <Detail
        markdown={`# ⚠️ Error\n\nFailed to load status for **${name}**.\n\n\`${error.message}\``}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.RotateClockwise}
              onAction={revalidate}
            />
            <Action.OpenInBrowser
              title="Open on Downdetector"
              url={fallbackUrl}
            />
          </ActionPanel>
        }
      />
    );
  }

  const status = detail?.status ?? "unknown";
  const { tintColor, label: statusLabel } = statusConfig(status);
  const statusEmoji = { ok: "🟢", warning: "🟡", danger: "🔴", unknown: "⚪" }[
    status
  ];

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        detail
          ? buildMarkdown(detail, statusEmoji, statusLabel)
          : `# ${name}\n\nLoading…`
      }
      metadata={
        detail ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={statusLabel}
                color={tintColor}
              />
            </Detail.Metadata.TagList>
            {detail.reportsLast24h !== null && (
              <Detail.Metadata.Label
                title="Reports (24h)"
                text={String(detail.reportsLast24h)}
                icon={{ source: Icon.Person, tintColor: Color.SecondaryText }}
              />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="View on Downdetector"
              target={detail.url}
              text={detail.url}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Report a Problem"
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              target={
                <ReportView
                  slug={slug}
                  name={name}
                  serviceUrl={detail?.url ?? fallbackUrl}
                />
              }
            />
            <Action.OpenInBrowser
              title="Open on Downdetector"
              url={detail?.url ?? fallbackUrl}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.RotateClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown(
  detail: ServiceDetail,
  statusEmoji: string,
  statusLabel: string,
): string {
  const lines: string[] = [
    `# ${detail.name}`,
    "",
    `## ${statusEmoji} ${statusLabel}`,
    "",
  ];

  if (detail.reportsLast24h !== null) {
    lines.push(
      `**${detail.reportsLast24h}** report(s) in the last 24 hours.`,
      "",
    );
  }

  // SVG chart (generated from parsed JS data) takes priority over raw image URL
  const chart = detail.chartDataUri ?? detail.chartImageUrl;
  if (chart) {
    lines.push(
      "### Reports over the last 24 hours",
      "",
      `![chart](${chart})`,
      "",
    );
  }

  lines.push("---", `_Data from [Downdetector](${detail.url})_`);
  return lines.join("\n");
}

// ─── Report View ─────────────────────────────────────────────────────────────

interface ReportProps {
  slug: string;
  name: string;
  serviceUrl: string;
}

function ReportView({ slug, name, serviceUrl }: ReportProps) {
  async function handleReport(problemType: string, problemLabel: string) {
    const confirmed = await confirmAlert({
      title: "Report a Problem",
      message: `Confirm report "${problemLabel}" for ${name}?`,
      primaryAction: {
        title: "Report",
        style: Alert.ActionStyle.Default,
      },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sending report…",
    });

    try {
      const result = await submitReport(slug, problemType);
      if (result.success) {
        await toast.hide();
        await showHUD(`✅ Report sent for ${name}`);
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not send report";
        toast.message = result.error;
        toast.primaryAction = {
          title: "Report in Browser",
          onAction: () => open(serviceUrl),
        };
      }
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Network error";
      toast.message = err instanceof Error ? err.message : String(err);
      toast.primaryAction = {
        title: "Report in Browser",
        onAction: () => open(serviceUrl),
      };
    }
  }

  return (
    <List navigationTitle={`Report — ${name}`} searchBarPlaceholder="Filter…">
      <List.Section title={`What problem are you experiencing with ${name}?`}>
        {REPORT_TYPES.map((rt) => (
          <List.Item
            key={rt.id}
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title={rt.label}
            actions={
              <ActionPanel>
                <Action
                  title={`Report a Problem: ${rt.label}`}
                  icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
                  onAction={() => handleReport(rt.value, rt.label)}
                />
                <Action.OpenInBrowser
                  title="Report in Browser"
                  url={serviceUrl}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
