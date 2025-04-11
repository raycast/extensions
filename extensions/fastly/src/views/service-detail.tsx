import { Detail, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { FastlyService, FastlyStats, FastlyServiceDetails } from "../types";
import { getServiceStats, purgeCache, getServiceDetails } from "../api";

interface ServiceDetailProps {
  service: FastlyService;
}

interface Version {
  number: number;
  active: boolean;
  staging: boolean;
  testing: boolean;
  locked: boolean;
  updated_at: string;
}

export function ServiceDetail({ service }: ServiceDetailProps) {
  const [stats, setStats] = useState<FastlyStats | null>(null);
  const [details, setDetails] = useState<FastlyServiceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      const [statsData, detailsData] = await Promise.all([
        getServiceStats(service.id, service.type),
        getServiceDetails(service.id),
      ]);
      setStats(statsData);
      setDetails(detailsData);
    } catch (error) {
      console.error("Loading error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const getDashboardUrl = (service: FastlyService) => {
    const baseUrl = "https://manage.fastly.com";
    if (service.type?.toLowerCase() === "wasm" || service.type?.toLowerCase() === "compute") {
      return `${baseUrl}/compute/services/${service.id}`;
    }
    return `${baseUrl}/configure/services/${service.id}`;
  };

  // Helper function to format numbers with commas
  const formatNumber = (num: number | undefined) => {
    if (num === undefined || isNaN(num)) return "0";
    return num.toLocaleString();
  };

  // Helper function to format bandwidth
  const formatBandwidth = (bytes: number | undefined) => {
    if (bytes === undefined || isNaN(bytes)) return "0 B";
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Helper function to format cache hit ratio
  const calculateCacheHitRatio = (hits?: number, misses?: number) => {
    if (!hits || !misses || (hits === 0 && misses === 0)) return "0%";
    const total = hits + misses;
    return `${((hits / total) * 100).toFixed(2)}%`;
  };

  // Helper function to format execution time
  const formatExecutionTime = (ms?: number) => {
    if (!ms) return "0ms";
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const renderStats = () => {
    if (!stats) return "## Statistics\nLoading statistics...";

    if (service.type?.toLowerCase() === "wasm") {
      const totalRequests = stats.compute_requests || 0;
      const avgExecutionTime = totalRequests > 0 ? (stats.compute_execution_time_ms || 0) / totalRequests : 0;

      return `
## Today's Statistics
- **Compute Requests**: ${formatNumber(totalRequests)}
- **Avg Execution Time**: ${formatExecutionTime(avgExecutionTime)}
- **Total Execution Time**: ${formatExecutionTime(stats.compute_execution_time_ms)}
- **Errors**: ${formatNumber(stats.errors)}

## Status Codes
- **2xx Responses**: ${formatNumber(stats.status_2xx)}
- **4xx Responses**: ${formatNumber(stats.status_4xx)}
- **5xx Responses**: ${formatNumber(stats.status_5xx)}
`;
    }

    return `
## Today's Statistics
- **Requests**: ${formatNumber(stats.requests)}
- **Bandwidth**: ${formatBandwidth(stats.bandwidth)}
- **Cache Hit Ratio**: ${calculateCacheHitRatio(stats.hits, stats.miss)}
- **Errors**: ${formatNumber(stats.errors)}

## Status Codes
- **2xx Responses**: ${formatNumber(stats.status_2xx)}
- **4xx Responses**: ${formatNumber(stats.status_4xx)}
- **5xx Responses**: ${formatNumber(stats.status_5xx)}

## Cache Performance
- **Cache Hits**: ${formatNumber(stats.hits)}
- **Cache Misses**: ${formatNumber(stats.miss)}
${stats.shield ? `- **Shield Hits**: ${formatNumber(stats.shield)}` : ""}
`;
  };

  const markdown = `
# ${service.name}

## Service Details
- **ID**: \`${service.id}\`
- **Type**: ${service.type === "wasm" ? "Compute" : "CDN"}
- **Created**: ${new Date(service.created_at).toLocaleString()}
- **Last Updated**: ${new Date(service.updated_at).toLocaleString()}

${
  details?.versions
    ? `
## Version History
${details.versions
  .sort((a: Version, b: Version) => b.number - a.number)
  .slice(0, 5)
  .map((version: Version) => {
    const status: string[] = [];
    if (version.active) status.push("Active");
    if (version.staging) status.push("Staging");
    if (version.testing) status.push("Testing");
    if (version.locked) status.push("Locked");

    return `- **Version ${version.number}**: ${status.join(", ") || "No status"} (${new Date(version.updated_at).toLocaleDateString()})`;
  })
  .join("\n")}
`
    : ""
}

${renderStats()}
`;

  const getMetadataRequests = () => {
    if (!stats) return "0";
    return service.type?.toLowerCase() === "wasm"
      ? formatNumber(stats.compute_requests || 0)
      : formatNumber(stats.requests || 0);
  };

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Service Type"
            text={service.type === "wasm" ? "Compute" : "CDN"}
            icon={service.type === "wasm" ? Icon.Terminal : Icon.Globe}
          />
          <Detail.Metadata.Label
            title={service.type === "wasm" ? "Today's Compute Requests" : "Today's Requests"}
            text={getMetadataRequests()}
          />
          {service.type === "wasm" && stats?.compute_execution_time_ms && (
            <Detail.Metadata.Label
              title="Avg Execution Time"
              text={formatExecutionTime(stats.compute_execution_time_ms / (stats.compute_requests || 1))}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Control Panel" url={getDashboardUrl(service)} />
          <Action
            title="Purge Cache"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              try {
                await purgeCache(service.id);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Cache purged successfully",
                });
                await loadData();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to purge cache",
                  message: error instanceof Error ? error.message : "Unknown error",
                });
              }
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action
            title="Refresh Data"
            icon={Icon.ArrowClockwise}
            onAction={loadData}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.OpenInBrowser
            title="View Real-time Stats"
            url={`https://manage.fastly.com/observability/dashboard/system/overview/realtime/${service.id}`}
            icon={Icon.BarChart}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action.OpenInBrowser
            title="View Service Logs"
            url={`https://manage.fastly.com/observability/logs/explorer/${service.id}`}
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          />
        </ActionPanel>
      }
    />
  );
}
