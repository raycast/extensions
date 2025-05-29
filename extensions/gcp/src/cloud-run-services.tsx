import { ActionPanel, Action, List, Detail, showToast, Toast, Icon, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { GCPCloudRunService } from "./types";
import { getGoogleAuth, getProjectId, getStatusIcon } from "./utils";
import { getCachedData, setCachedData, getCacheKey, CACHE_TTL } from "./cache";

// Add interface for metrics data
interface MetricsData {
  requestCount: Array<{ timestamp: string; value: number }>;
  latency: Array<{ timestamp: string; value: number }>;
  cpuUtilization: Array<{ timestamp: string; value: number }>;
  memoryUtilization: Array<{ timestamp: string; value: number }>;
  containerInstances?: Array<{ timestamp: string; value: number }>;
}

// Interface for Cloud Monitoring API response
interface MetricPoint {
  interval: {
    endTime: string;
    startTime?: string;
  };
  value: {
    doubleValue?: string;
    int64Value?: string;
    distributionValue?: {
      mean?: string;
      count?: string;
      bucketCounts?: string[];
    };
  };
}

interface CloudRunServiceResponse {
  items?: Array<{
    metadata?: {
      name?: string;
      annotations?: {
        [key: string]: string;
      };
    };
    spec?: {
      template?: {
        spec?: {
          containers?: Array<{
            image?: string;
            resources?: {
              limits?: {
                cpu?: string;
                memory?: string;
              };
            };
          }>;
        };
      };
      traffic?: Array<{
        revisionName?: string;
        percent?: number;
      }>;
    };
    status?: {
      url?: string;
      conditions?: Array<{
        status?: string;
      }>;
    };
  }>;
}

export default function CloudRunServices() {
  const [services, setServices] = useState<GCPCloudRunService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices(forceRefresh = false) {
    // Declare project ID variable at function level to access it in both try and catch blocks
    let currentProjectId = "";

    try {
      setLoading(true);
      setError(null);

      // Get and cache the project ID to avoid multiple awaits
      currentProjectId = await getProjectId();
      const cacheKey = getCacheKey("cloud-run-services", currentProjectId);

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedServices = getCachedData<GCPCloudRunService[]>(cacheKey, CACHE_TTL.CLOUD_RUN);
        if (cachedServices) {
          showToast(Toast.Style.Success, "Loaded from cache", `${cachedServices.length} services`);
          setServices(cachedServices);
          setLoading(false);
          return;
        }
      }

      showToast(Toast.Style.Animated, "Loading", "Fetching Cloud Run services...");

      const auth = await getGoogleAuth();

      // Get access token for API calls
      const authClient = await auth.getClient();
      const accessToken = await authClient.getAccessToken();

      if (!accessToken.token) {
        throw new Error("Failed to get access token");
      }

      // Define common Cloud Run regions
      const regions = [
        "us-central1",
        "us-east1",
        "us-east4",
        "us-east5",
        "us-west1",
        "us-west2",
        "us-west3",
        "us-west4",
        "europe-west1",
        "europe-west2",
        "europe-west3",
        "europe-west4",
        "europe-west6",
        "europe-central2",
        "europe-north1",
        "asia-east1",
        "asia-east2",
        "asia-northeast1",
        "asia-northeast2",
        "asia-northeast3",
        "asia-southeast1",
        "asia-southeast2",
        "asia-south1",
        "asia-south2",
        "australia-southeast1",
        "australia-southeast2",
        "northamerica-northeast1",
        "northamerica-northeast2",
        "southamerica-east1",
        "southamerica-west1",
        "me-central1",
      ];

      const allServices: GCPCloudRunService[] = [];
      showToast(Toast.Style.Animated, "Loading", `Checking ${regions.length} regions...`);

      // Track failed regions for better error reporting
      const failedRegions: string[] = [];

      // Fetch services from all regions in parallel for better performance
      const regionPromises = regions.map(async (region) => {
        try {
          const url = `https://run.googleapis.com/v1/projects/${currentProjectId}/locations/${region}/services`;

          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${accessToken.token}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            if (response.status === 403 || response.status === 404) {
              // Common cases: region doesn't have Cloud Run or no permission
              return []; // Skip regions without access
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = (await response.json()) as CloudRunServiceResponse;
          const cloudRunServices = data.items || [];

          return cloudRunServices.map((service) => {
            const spec = service.spec || {};
            const status = service.status || {};
            const traffic = spec.traffic || [];

            return {
              name: service.metadata?.name || "",
              region,
              url: status.url || "",
              status: status.conditions?.[0]?.status === "True" ? "READY" : "NOT_READY",
              lastModified: service.metadata?.annotations?.["run.googleapis.com/lastModifier"] || "",
              image: spec.template?.spec?.containers?.[0]?.image || "Unknown",
              traffic: traffic.map((t) => ({
                revisionName: t.revisionName || "",
                percent: t.percent || 0,
              })),
            };
          });
        } catch (error) {
          // Track which regions had errors for potential debugging
          failedRegions.push(region);

          // Log error to console for debugging
          console.error(`Error fetching Cloud Run services in region ${region}:`, error);

          return [];
        }
      });

      const results = await Promise.all(regionPromises);
      for (const regionServices of results) {
        allServices.push(...regionServices);
      }

      // Cache the results
      setCachedData(cacheKey, allServices);

      // Show success toast with information about failed regions
      if (failedRegions.length > 0) {
        showToast(
          Toast.Style.Success,
          `Found ${allServices.length} Cloud Run services`,
          `Failed to check ${failedRegions.length} region(s). See console for details.`,
        );
      } else {
        showToast(Toast.Style.Success, "Success!", `Found ${allServices.length} Cloud Run services`);
      }

      setServices(allServices);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load Cloud Run services";

      if (errorMsg.includes("403") || errorMsg.includes("PERMISSION_DENIED")) {
        // Use the cached project ID from earlier
        const projectIdForError = currentProjectId || "YOUR-PROJECT-ID";
        setError(`🚫 Cloud Run API Access Denied

The service account lacks permission to access Cloud Run.

📋 To fix this:

1. Go to Google Cloud Console → IAM & Admin → IAM
2. Find your service account
3. Click 'Edit' and add the role: 'Cloud Run Viewer'

💻 Or use gcloud CLI:
gcloud projects add-iam-policy-binding ${projectIdForError} --member='serviceAccount:YOUR-SERVICE-ACCOUNT@${projectIdForError}.iam.gserviceaccount.com' --role='roles/run.viewer'`);
      } else {
        setError(errorMsg);
      }

      await showFailureToast(err instanceof Error ? err : new Error(errorMsg), {
        title: "Error loading Cloud Run services",
      });
    } finally {
      setLoading(false);
    }
  }

  // New function to fetch real metrics from Cloud Monitoring API
  async function fetchServiceMetrics(
    projectId: string,
    serviceName: string,
    region: string,
    accessToken: string,
  ): Promise<MetricsData | null> {
    try {
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago

      console.log("Fetching metrics for:", { projectId, serviceName, region, startTime, endTime });

      // Build the monitoring API request
      const baseUrl = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries`;

      // Define metrics to fetch - using correct Cloud Run metric types
      const metrics = [
        {
          name: "requestCount",
          // Use the standard Cloud Run request count metric
          filter: `metric.type="run.googleapis.com/request_count" AND resource.type="cloud_run_revision" AND resource.label.service_name="${serviceName}" AND resource.label.location="${region}"`,
          aligner: "ALIGN_RATE",
          reducer: "REDUCE_SUM",
        },
        {
          name: "latency",
          filter: `metric.type="run.googleapis.com/request_latencies" AND resource.type="cloud_run_revision" AND resource.label.service_name="${serviceName}" AND resource.label.location="${region}"`,
          aligner: "ALIGN_DELTA",
          reducer: "REDUCE_MEAN",
        },
        {
          name: "cpuUtilization",
          // Billable container CPU allocation
          filter: `metric.type="run.googleapis.com/container/billable_instance_time" AND resource.type="cloud_run_revision" AND resource.label.service_name="${serviceName}" AND resource.label.location="${region}"`,
          aligner: "ALIGN_RATE",
          reducer: "REDUCE_SUM",
        },
        {
          name: "containerInstances",
          // Container instance count
          filter: `metric.type="run.googleapis.com/container/instance_count" AND resource.type="cloud_run_revision" AND resource.label.service_name="${serviceName}" AND resource.label.location="${region}"`,
          aligner: "ALIGN_MAX",
          reducer: "REDUCE_SUM",
        },
      ];

      const metricsData: MetricsData = {
        requestCount: [],
        latency: [],
        cpuUtilization: [],
        memoryUtilization: [],
        containerInstances: [],
      };

      // Fetch each metric
      for (const metric of metrics) {
        try {
          const params: Record<string, string> = {
            filter: metric.filter,
            "interval.startTime": startTime,
            "interval.endTime": endTime,
            "aggregation.alignmentPeriod": "300s", // 5 minute intervals for better granularity
            "aggregation.perSeriesAligner": metric.aligner,
            "aggregation.crossSeriesReducer": metric.reducer,
            "aggregation.groupByFields": "resource.label.service_name",
          };

          // Special handling for different metric types
          if (metric.name === "containerInstances") {
            // For instance count, we want the actual values, not rates
            params["aggregation.perSeriesAligner"] = "ALIGN_MAX";
            params["aggregation.alignmentPeriod"] = "60s"; // 1 minute intervals
          }

          const urlParams = new URLSearchParams(params);

          console.log(`Fetching ${metric.name} with URL:`, `${baseUrl}?${urlParams}`);

          const response = await fetch(`${baseUrl}?${urlParams}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error fetching ${metric.name}:`, response.status, errorText);
            continue;
          }

          const data = await response.json();
          console.log(`${metric.name} response:`, data);

          // Special logging for latency to debug
          if (metric.name === "latency") {
            console.log("Latency metric data structure:", JSON.stringify(data, null, 2));
          }

          if (data.timeSeries && data.timeSeries.length > 0) {
            // Handle multiple time series if present
            const allPoints: Array<{ timestamp: string; value: number }> = [];

            for (const ts of data.timeSeries) {
              if (ts.points) {
                const points = ts.points.map((point: MetricPoint) => {
                  let value = 0;

                  // Handle different value types
                  if (point.value.doubleValue !== undefined) {
                    value = parseFloat(point.value.doubleValue);
                  } else if (point.value.int64Value !== undefined) {
                    value = parseFloat(point.value.int64Value);
                  } else if (point.value.distributionValue) {
                    // For latency metrics, use the mean value from distribution
                    value = parseFloat(point.value.distributionValue.mean || "0");
                  }

                  // Convert latency from seconds to milliseconds if needed
                  if (metric.name === "latency" && value < 10) {
                    value = value * 1000; // Convert to milliseconds
                  }

                  return {
                    timestamp: point.interval.endTime,
                    value: value,
                  };
                });
                allPoints.push(...points);
              }
            }

            // Sort by timestamp and remove duplicates
            metricsData[metric.name as keyof MetricsData] = allPoints
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
              .filter((point, index, self) => index === self.findIndex((p) => p.timestamp === point.timestamp));
          } else {
            console.log(`No time series data found for ${metric.name}`);
          }
        } catch (metricError) {
          console.error(`Failed to fetch ${metric.name}:`, metricError);
        }
      }

      console.log("Final metrics data:", metricsData);
      return metricsData;
    } catch (error) {
      console.error("Error fetching metrics:", error);
      return null;
    }
  }

  function generateMetricsGraph(metrics: MetricsData | null): string {
    let graph = "## 📊 Request Metrics (Last 24 Hours)\n\n";

    if (!metrics || metrics.requestCount.length === 0) {
      graph += "⚠️ **No metrics data available**\n\n";
      graph += "This could mean:\n";
      graph += "- The service hasn't received any traffic in the last 24 hours\n";
      graph += "- Cloud Monitoring API needs to be enabled\n";
      graph += "- Your service account needs the 'Monitoring Viewer' role\n\n";
      graph += "To enable monitoring:\n";
      graph += "```bash\n";
      graph += "gcloud services enable monitoring.googleapis.com\n";
      graph += "```\n";
      return graph;
    }

    graph += "```\n";
    graph += "Requests per interval\n";

    // Since we're using ALIGN_RATE, the values are rates per second
    // We need to multiply by the interval period to get actual counts
    const intervalSeconds = 300; // 5 minutes as set in our alignment period

    // Get all data points from the last 24 hours
    const dataToShow = metrics.requestCount;

    if (dataToShow.length === 0) {
      graph += "No request data points available\n";
    } else {
      // Group by hour for display
      const hourlyData = new Map<string, number>();

      dataToShow.forEach((dataPoint) => {
        const date = new Date(dataPoint.timestamp);
        const hour = date.getHours().toString().padStart(2, "0");
        const requests = dataPoint.value * intervalSeconds; // Convert rate to count

        if (hourlyData.has(hour)) {
          hourlyData.set(hour, hourlyData.get(hour)! + requests);
        } else {
          hourlyData.set(hour, requests);
        }
      });

      // Create a complete 24-hour array with all hours
      const allHours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));

      // Display hourly aggregated data
      const maxValue = Math.max(...Array.from(hourlyData.values()), 1);
      const scale = maxValue > 0 ? maxValue / 20 : 1;

      allHours.forEach((hour) => {
        const value = hourlyData.get(hour) || 0;
        const roundedValue = Math.round(value);
        const barLength = Math.floor(roundedValue / scale);
        const bar = roundedValue > 0 ? "█".repeat(Math.max(1, barLength)) : "│";
        graph += `${hour}:00 │ ${bar} ${roundedValue}\n`;
      });
    }

    graph += "```\n";

    // Calculate total requests correctly
    const totalRequests = metrics.requestCount.reduce((sum, d) => sum + d.value * intervalSeconds, 0);
    graph += `\n**Total Requests**: ${Math.round(totalRequests)}\n`;

    return graph;
  }

  function generateLatencyGraph(metrics: MetricsData | null): string {
    let graph = "## ⚡ Average Response Latency\n\n";

    if (!metrics || metrics.latency.length === 0) {
      graph += "No latency data available\n";
      graph += "This could mean:\n";
      graph += "- The service hasn't processed any requests recently\n";
      graph += "- Latency metrics are not yet available\n";
      graph += "- Check the console logs for more details\n";
      return graph;
    }

    // Calculate average and format appropriately
    const avgLatency = metrics.latency.reduce((sum, d) => sum + d.value, 0) / metrics.latency.length;
    const isMilliseconds = avgLatency > 1; // If > 1, assume milliseconds, otherwise seconds

    graph += "```\n";
    if (isMilliseconds) {
      graph += `Average: ${avgLatency.toFixed(2)}ms\n\n`;
    } else {
      graph += `Average: ${(avgLatency * 1000).toFixed(2)}ms\n\n`;
    }

    // Show latency trend for last 12 data points
    const recentData = metrics.latency.slice(-12);

    if (recentData.length > 0) {
      graph += "Recent latency (last " + recentData.length + " data points):\n";

      recentData.forEach((dataPoint) => {
        const time = new Date(dataPoint.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        const value = isMilliseconds ? dataPoint.value : dataPoint.value * 1000;
        const barLength = Math.floor(value / 50); // Scale: 50ms per bar unit
        const bar = "▄".repeat(Math.max(1, Math.min(barLength, 20))); // Cap at 20 bars
        graph += `${time} │ ${bar} ${value.toFixed(0)}ms\n`;
      });
    }

    graph += "```\n";

    return graph;
  }

  function generateResourceGraph(metrics: MetricsData | null): string {
    let graph = "## 📊 Container Instances & Billable Time\n\n";

    if (!metrics || (!metrics.containerInstances?.length && !metrics.cpuUtilization?.length)) {
      graph += "No container instance data available\n";
      return graph;
    }

    graph += "```\n";

    // Show container instance count over time
    if (metrics.containerInstances && metrics.containerInstances.length > 0) {
      graph += "Container Instances (last 12 data points)\n";
      const maxInstances = Math.max(...metrics.containerInstances.map((d) => d.value));

      metrics.containerInstances.slice(-12).forEach((dataPoint) => {
        const time = new Date(dataPoint.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        const value = Math.round(dataPoint.value);
        const barLength = maxInstances > 0 ? Math.floor((value / maxInstances) * 20) : 0;
        const bar = "█".repeat(Math.max(1, barLength));
        graph += `${time} │ ${bar} ${value}\n`;
      });
    }

    // Show billable time if available
    if (metrics.cpuUtilization && metrics.cpuUtilization.length > 0) {
      const totalBillableSeconds = metrics.cpuUtilization.reduce((sum, d) => sum + d.value, 0);
      const totalBillableHours = totalBillableSeconds / 3600;
      graph += `\nTotal Billable Time: ${totalBillableHours.toFixed(2)} hours\n`;
    }

    graph += "```\n";

    return graph;
  }

  function ServiceDetail({ service }: { service: GCPCloudRunService }) {
    const [projectId, setProjectId] = useState<string>("");
    const [projectIdError, setProjectIdError] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [metricsLoading, setMetricsLoading] = useState(true);

    useEffect(() => {
      getProjectId()
        .then((id) => setProjectId(id))
        .catch((error) => {
          console.error("Failed to load project ID:", error);
          setProjectIdError("Failed to load project ID");
        });
    }, []);

    useEffect(() => {
      // Fetch real metrics when component mounts
      async function loadMetrics() {
        if (!projectId) return;

        try {
          setMetricsLoading(true);
          showToast(Toast.Style.Animated, "Loading metrics", `Fetching data for ${service.name}...`);

          const auth = await getGoogleAuth();
          const authClient = await auth.getClient();
          const accessToken = await authClient.getAccessToken();

          if (accessToken.token) {
            const metricsData = await fetchServiceMetrics(projectId, service.name, service.region, accessToken.token);
            setMetrics(metricsData);

            // Check if we got any data
            if (metricsData) {
              const hasData = Object.values(metricsData).some((arr) => arr.length > 0);
              if (hasData) {
                showToast(Toast.Style.Success, "Metrics loaded", "Successfully fetched Cloud Run metrics");
              } else {
                showToast(Toast.Style.Success, "No recent activity", "Service has no traffic in the last 24 hours");
              }
            }
          }
        } catch (error) {
          console.error("Failed to load metrics:", error);
          showToast(Toast.Style.Failure, "Failed to load metrics", "Check console for details");
        } finally {
          setMetricsLoading(false);
        }
      }

      loadMetrics();
    }, [projectId, service.name, service.region]);

    // Generate correct Cloud Run service URLs
    const monitoringUrl = projectId
      ? `https://console.cloud.google.com/run/detail/${service.region}/${service.name}/metrics?project=${projectId}`
      : "#";
    const logsUrl = projectId
      ? `https://console.cloud.google.com/run/detail/${service.region}/${service.name}/logs?project=${projectId}`
      : "#";
    const consoleUrl = projectId
      ? `https://console.cloud.google.com/run/detail/${service.region}/${service.name}?project=${projectId}`
      : `https://console.cloud.google.com/run/detail/${service.region}/${service.name}`;

    const markdown = `
# ${service.name}

## Service Details
- **Status**: ${getStatusIcon(service.status)} ${service.status}
- **Region**: ${service.region}
- **URL**: ${service.url ? `[${service.url}](${service.url})` : "No URL"}
- **Image**: ${service.image.split("/").pop()}
- **Last Modified**: ${service.lastModified}

## Traffic Distribution
${service.traffic.map((t) => `- **${t.revisionName}**: ${t.percent}%`).join("\n")}

---

${metricsLoading ? "⏳ Loading metrics..." : generateMetricsGraph(metrics)}

---

${metricsLoading ? "" : generateLatencyGraph(metrics)}

---

${metricsLoading ? "" : generateResourceGraph(metrics)}

---

## 🔍 Diagnostics
- **Service**: ${service.name}
- **Region**: ${service.region}
- **Project**: ${projectId || "Loading..."}
- **Metrics Status**: ${metricsLoading ? "Loading..." : metrics ? "Fetched" : "Failed"}

${
  service.url
    ? `### 🚀 Generate Test Traffic
If you're not seeing metrics, try generating some traffic:
\`\`\`bash
# Send test requests to your service
for i in {1..10}; do
  curl -s "${service.url}" > /dev/null
  echo "Request $i sent"
done
\`\`\`
Metrics may take 2-5 minutes to appear after traffic is generated.
`
    : ""
}

---

## 🔗 Quick Actions
${projectIdError ? "⚠️ **" + projectIdError + "** - Some links may not work correctly.\n\n" : ""}
- [View Service Metrics →](${monitoringUrl})
- [View Service Logs →](${logsUrl})
- [View in Console →](${consoleUrl})

---

## 💻 Console Commands
\`\`\`bash
# Deploy new revision
gcloud run deploy ${service.name} --region=${service.region}

# View logs
gcloud run services logs read ${service.name} --region=${service.region}

# Update traffic split
gcloud run services update-traffic ${service.name} \\
  --region=${service.region} --to-revisions=LATEST=100

# Get service details
gcloud run services describe ${service.name} --region=${service.region}
\`\`\`
    `;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            {service.url && <Action.OpenInBrowser title="Open Service URL" url={service.url} />}
            <Action.OpenInBrowser title="Open in Console" url={consoleUrl} />
            {projectId ? (
              <>
                <Action.OpenInBrowser title="View Service Metrics" url={monitoringUrl} />
                <Action.OpenInBrowser title="View Service Logs" url={logsUrl} />
              </>
            ) : (
              <Action
                title="Reload Project ID"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  getProjectId()
                    .then((id) => {
                      setProjectId(id);
                      setProjectIdError(null);
                      showToast(Toast.Style.Success, "Project ID loaded", id);
                    })
                    .catch((error) => {
                      console.error("Failed to load project ID:", error);
                      setProjectIdError("Failed to load project ID");
                      showToast(Toast.Style.Failure, "Failed to load project ID");
                    });
                }}
              />
            )}
            {service.url && <Action.CopyToClipboard title="Copy Service URL" content={service.url} />}
            <Action.CopyToClipboard
              title="Copy Deploy Command"
              content={`gcloud run deploy ${service.name} --region=${service.region}`}
            />
            <Action
              title="Refresh Metrics"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={async () => {
                if (!projectId) {
                  showToast(Toast.Style.Failure, "Project ID not loaded");
                  return;
                }

                try {
                  setMetricsLoading(true);
                  showToast(Toast.Style.Animated, "Refreshing metrics...");

                  const auth = await getGoogleAuth();
                  const authClient = await auth.getClient();
                  const accessToken = await authClient.getAccessToken();

                  if (accessToken.token) {
                    const metricsData = await fetchServiceMetrics(
                      projectId,
                      service.name,
                      service.region,
                      accessToken.token,
                    );
                    setMetrics(metricsData);

                    if (metricsData) {
                      const hasData = Object.values(metricsData).some((arr) => arr.length > 0);
                      showToast(
                        Toast.Style.Success,
                        hasData ? "Metrics refreshed" : "No data",
                        hasData ? "Found metrics data" : "No traffic in last 24h",
                      );
                    }
                  }
                } catch (error) {
                  console.error("Failed to refresh metrics:", error);
                  showToast(Toast.Style.Failure, "Failed to refresh metrics");
                } finally {
                  setMetricsLoading(false);
                }
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}\n\nPlease check your GCP configuration and try again.`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={() => loadServices(true)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search Cloud Run services...">
      {services.length === 0 && !loading ? (
        <List.EmptyView
          title="No Cloud Run services found"
          description="Deploy a service in GCP Console or refresh to try again"
        />
      ) : (
        services.map((service) => (
          <List.Item
            key={`${service.region}/${service.name}`}
            title={service.name}
            subtitle={`${service.region} • ${service.image.split("/").pop()}`}
            accessories={[
              {
                text: service.url ? "Has URL" : "No URL",
                tooltip: service.url,
              },
              {
                text: service.status,
                icon: {
                  source: service.status === "READY" ? Icon.Circle : Icon.CircleDisabled,
                  tintColor: service.status === "READY" ? Color.Green : Color.Red,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="Show Details" target={<ServiceDetail service={service} />} icon={Icon.Eye} />
                {service.url && <Action.OpenInBrowser title="Open Service URL" url={service.url} />}
                <Action.OpenInBrowser
                  title="Open in Console"
                  url={`https://console.cloud.google.com/run/detail/${service.region}/${service.name}`}
                />
                {service.url && <Action.CopyToClipboard title="Copy Service URL" content={service.url} />}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={() => loadServices(true)}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
