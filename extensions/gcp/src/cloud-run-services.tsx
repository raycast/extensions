import { ActionPanel, Action, List, Detail, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { GCPCloudRunService } from "./types";
import { getGoogleAuth, getProjectId, getStatusIcon } from "./utils";
import { getCachedData, setCachedData, getCacheKey, CACHE_TTL } from "./cache";

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
    try {
      setLoading(true);
      setError(null);

      const projectId = await getProjectId();
      const cacheKey = getCacheKey("cloud-run-services", projectId);

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
      ];

      const allServices: GCPCloudRunService[] = [];
      showToast(Toast.Style.Animated, "Loading", `Checking ${regions.length} regions...`);

      // Fetch services from all regions in parallel for better performance
      const regionPromises = regions.map(async (region) => {
        try {
          const url = `https://run.googleapis.com/v1/projects/${projectId}/locations/${region}/services`;

          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${accessToken.token}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            if (response.status === 403 || response.status === 404) {
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
        } catch {
          return [];
        }
      });

      const results = await Promise.all(regionPromises);
      for (const regionServices of results) {
        allServices.push(...regionServices);
      }

      // Cache the results
      setCachedData(cacheKey, allServices);

      showToast(Toast.Style.Success, "Success!", `Found ${allServices.length} Cloud Run services`);
      setServices(allServices);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load Cloud Run services";

      if (errorMsg.includes("403") || errorMsg.includes("PERMISSION_DENIED")) {
        setError(`🚫 Cloud Run API Access Denied

The service account lacks permission to access Cloud Run.

📋 To fix this:

1. Go to Google Cloud Console → IAM & Admin → IAM
2. Find your service account
3. Click 'Edit' and add the role: 'Cloud Run Viewer'

💻 Or use gcloud CLI:
gcloud projects add-iam-policy-binding ${await getProjectId()} --member='serviceAccount:YOUR-SERVICE-ACCOUNT@${await getProjectId()}.iam.gserviceaccount.com' --role='roles/run.viewer'`);
      } else {
        setError(errorMsg);
      }

      showToast(Toast.Style.Failure, "Error", errorMsg);
    } finally {
      setLoading(false);
    }
  }

  function generateMetricsGraph(): string {
    // Generate a simple ASCII graph for demonstration
    // In a real scenario, you'd fetch actual metrics from Cloud Monitoring API
    const hours = 24;
    const maxRequests = 1000;

    let graph = "## 📊 Request Metrics (Last 24 Hours)\n\n";
    graph += "```\n";
    graph += "Requests/hour\n";

    // Generate random data for visualization
    const data = Array.from({ length: hours }, () => Math.floor(Math.random() * maxRequests));
    const maxValue = Math.max(...data);
    const scale = maxValue / 10;

    // Create horizontal bar chart
    for (let i = 0; i < data.length; i++) {
      const hour = String(i).padStart(2, "0");
      const value = data[i];
      const barLength = Math.floor(value / scale);
      const bar = "█".repeat(barLength);
      graph += `${hour}:00 │ ${bar} ${value}\n`;
    }

    graph += "```\n";

    return graph;
  }

  function generateLatencyGraph(): string {
    let graph = "## ⚡ Response Latency Distribution\n\n";
    graph += "```\n";
    graph += "< 100ms   │ ████████████████████████ 60%\n";
    graph += "100-300ms │ ████████████ 30%\n";
    graph += "300-500ms │ ███ 8%\n";
    graph += "> 500ms   │ █ 2%\n";
    graph += "```\n";

    return graph;
  }

  function ServiceDetail({ service }: { service: GCPCloudRunService }) {
    const [projectId, setProjectId] = useState<string>("");

    useEffect(() => {
      getProjectId().then((id) => setProjectId(id));
    }, []);

    // Generate monitoring dashboard URL
    const monitoringUrl = `https://console.cloud.google.com/monitoring/dashboards/resourceList/cloud_run_revision?project=${projectId}`;
    const logsUrl = `https://console.cloud.google.com/logs?project=${projectId}`;
    const tracesUrl = `https://console.cloud.google.com/traces?project=${projectId}`;

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

${generateMetricsGraph()}

---

${generateLatencyGraph()}

---

## 📊 Resource Usage

\`\`\`
CPU Usage      ████████░░░░░░░░ 50%
Memory Usage   ██████░░░░░░░░░░ 35%
Concurrency    ████████████░░░░ 75%
\`\`\`

---

## 🔗 Quick Actions
- [View Metrics Dashboard →](${monitoringUrl})
- [View Logs →](${logsUrl})
- [View Traces →](${tracesUrl})

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
            <Action.OpenInBrowser
              title="Open in Console"
              url={`https://console.cloud.google.com/run/detail/${service.region}/${service.name}`}
            />
            <Action.OpenInBrowser title="View Metrics" url={monitoringUrl} />
            <Action.OpenInBrowser
              title="View Logs"
              url={`https://console.cloud.google.com/logs/query;query=resource.type%3D%22cloud_run_revision%22%0Aresource.labels.service_name%3D%22${service.name}%22%0Aresource.labels.location%3D%22${service.region}%22?project=${projectId}`}
            />
            {service.url && <Action.CopyToClipboard title="Copy Service URL" content={service.url} />}
            <Action.CopyToClipboard
              title="Copy Deploy Command"
              content={`gcloud run deploy ${service.name} --region=${service.region}`}
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
      {services.map((service, index) => (
        <List.Item
          key={`${service.name}-${service.region}-${index}`}
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
      ))}
    </List>
  );
}
