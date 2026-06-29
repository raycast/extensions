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
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getServiceDetail, ServiceDetail, submitReport } from "./api";
import { useT } from "./i18n";
import { statusConfig } from "./search-service";

interface Props {
  slug: string;
  name: string;
}

export default function ServiceDetailView({ slug, name }: Props) {
  const t = useT();

  const {
    data: detail,
    isLoading,
    error,
    revalidate,
  } = usePromise((s: string) => getServiceDetail(s), [slug], {
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: t.errorLoadFailed,
        message: err.message,
      });
    },
  });

  if (error) {
    return (
      <Detail
        markdown={`# ⚠️ Error\n\n${t.detailLoadError(name)}\n\n\`${error.message}\``}
        actions={
          <ActionPanel>
            <Action
              title={t.actionRetry}
              icon={Icon.RotateClockwise}
              onAction={revalidate}
            />
            <Action.OpenInBrowser
              title={t.actionOpenBrowser}
              url={`https://downdetector.com/status/${slug}/`}
            />
          </ActionPanel>
        }
      />
    );
  }

  const status = detail?.status ?? "unknown";
  const { tintColor, label: statusLabel } = statusConfig(status, t);
  const statusEmoji = { ok: "🟢", warning: "🟡", danger: "🔴", unknown: "⚪" }[
    status
  ];
  const fallbackUrl = `https://downdetector.com/status/${slug}/`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        detail
          ? buildMarkdown(detail, statusEmoji, statusLabel, t.detailChartTitle)
          : `# ${name}\n\nLoading…`
      }
      metadata={
        detail ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title={t.detailMetaStatus}>
              <Detail.Metadata.TagList.Item
                text={statusLabel}
                color={tintColor}
              />
            </Detail.Metadata.TagList>
            {detail.reportsLast24h !== null && (
              <Detail.Metadata.Label
                title={t.detailMetaReports}
                text={String(detail.reportsLast24h)}
                icon={{ source: Icon.Person, tintColor: Color.SecondaryText }}
              />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title={t.detailMetaLink}
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
              title={t.actionReport}
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
              title={t.actionOpenBrowser}
              url={detail?.url ?? fallbackUrl}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={t.actionRefresh}
              icon={Icon.RotateClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
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
  chartTitle: string,
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
    lines.push(`### ${chartTitle}`, "", `![chart](${chart})`, "");
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
  const t = useT();

  async function handleReport(problemType: string, problemLabel: string) {
    const confirmed = await confirmAlert({
      title: t.reportConfirmTitle,
      message: t.reportConfirmMessage(problemLabel, name),
      primaryAction: {
        title: t.reportConfirmAction,
        style: Alert.ActionStyle.Default,
      },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: t.reportSending,
    });

    try {
      const result = await submitReport(slug, problemType);
      if (result.success) {
        await toast.hide();
        await showHUD(t.reportSuccess(name));
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = t.reportFailTitle;
        toast.message = result.error;
        toast.primaryAction = {
          title: t.actionReportInBrowser,
          onAction: () => open(serviceUrl),
        };
      }
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = t.reportErrorTitle;
      toast.message = err instanceof Error ? err.message : String(err);
      toast.primaryAction = {
        title: t.actionReportInBrowser,
        onAction: () => open(serviceUrl),
      };
    }
  }

  return (
    <List
      navigationTitle={t.reportNavTitle(name)}
      searchBarPlaceholder="Filter…"
    >
      <List.Section title={t.reportSectionTitle(name)}>
        {t.reportTypes.map((rt) => (
          <List.Item
            key={rt.id}
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title={rt.label}
            actions={
              <ActionPanel>
                <Action
                  title={`${t.actionReport}: ${rt.label}`}
                  icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
                  onAction={() => handleReport(rt.value, rt.label)}
                />
                <Action.OpenInBrowser
                  title={t.actionReportInBrowser}
                  url={serviceUrl}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
