import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getPiholeAPI } from "./api/client";
import type { QueryTypeBreakdown, SystemInfo } from "./api/types";
import { formatBytes, formatNumber } from "./utils";

export default function GetSummary() {
  const { isLoading, data, revalidate } = useCachedPromise(async () => {
    const api = getPiholeAPI();
    const summary = await api.getSummary();

    let queryTypes: QueryTypeBreakdown | null = null;
    try {
      queryTypes = await api.getQueryTypes();
    } catch {
      // v5 doesn't support this endpoint
    }

    let systemInfo: SystemInfo | null = null;
    try {
      systemInfo = await api.getSystemInfo();
    } catch {
      // v5 doesn't support this endpoint
    }

    return { summary, queryTypes, systemInfo };
  });

  const summary = data?.summary;
  const queryTypes = data?.queryTypes;
  const systemInfo = data?.systemInfo;

  const topQueryTypes =
    queryTypes?.types && Object.keys(queryTypes.types).length > 0
      ? Object.entries(queryTypes.types)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
      : null;

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        summary
          ? `# Pi-hole Overview \n\n * Gravity was last updated **${
              summary.gravity_last_updated?.relative?.days ?? "unknown"
            }** days ago. \n\n * Privacy level is set to **${
              summary.privacy_level ?? "unknown"
            }**. \n\n * Pi-hole has cached **${formatNumber(summary.queries_cached ?? "unknown")}** queries.`
          : ""
      }
      navigationTitle="Pi-hole Dashboard"
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
      metadata={
        summary ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Pi-hole status">
              <Detail.Metadata.TagList.Item
                text={summary.status}
                color={summary.status === "enabled" ? "#35EE95" : "#EED535"}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Queries made today" text={formatNumber(summary.dns_queries_today)} />
            <Detail.Metadata.Label title="Queries blocked today" text={formatNumber(summary.ads_blocked_today)} />
            <Detail.Metadata.Label title="Query block percentage" text={`${summary.ads_percentage_today}%`} />
            <Detail.Metadata.Label
              title="Total domains in blocklist"
              text={formatNumber(summary.domains_being_blocked)}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Current unique clients" text={formatNumber(summary.unique_clients)} />
            {topQueryTypes && (
              <>
                <Detail.Metadata.Separator />
                {topQueryTypes.map(([type, percentage]) => (
                  <Detail.Metadata.Label key={type} title={type} text={`${percentage.toFixed(1)}%`} />
                ))}
              </>
            )}
            {systemInfo && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label title="CPU Usage" text={`${systemInfo.cpu.usage.toFixed(2)}%`} />
                <Detail.Metadata.Label
                  title="RAM"
                  text={`${formatBytes(systemInfo.memory.ram.used)} / ${formatBytes(systemInfo.memory.ram.total)}`}
                />
                <Detail.Metadata.Label title="Hostname" text={systemInfo.host.name} />
                <Detail.Metadata.Label
                  title="Version"
                  text={`Core: ${systemInfo.version.core} FTL: ${systemInfo.version.ftl}`}
                />
              </>
            )}
          </Detail.Metadata>
        ) : null
      }
    />
  );
}
