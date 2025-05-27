import { ActionPanel, Action, List, Detail, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { CloudFunctionsServiceClient } from "@google-cloud/functions";
import { GCPFunction } from "./types";
import { getProjectId, formatDate, getStatusIcon } from "./utils";
import { getCachedData, setCachedData, getCacheKey, CACHE_TTL } from "./cache";

// Define interface for the Cloud Function response
interface CloudFunctionResponse {
  name?: string;
  state?: string;
  runtime?: string;
  httpsTrigger?: unknown;
  eventTrigger?: unknown;
  sourceArchiveUrl?: string;
  updateTime?:
    | {
        seconds?: number;
        nanos?: number;
      }
    | string;
}

export default function CloudFunctions() {
  const [functions, setFunctions] = useState<GCPFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFunctions();
  }, []);

  async function loadFunctions(forceRefresh = false) {
    try {
      setLoading(true);
      setError(null);

      const projectId = await getProjectId();
      const cacheKey = getCacheKey("cloud-functions", projectId);

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedFunctions = getCachedData<GCPFunction[]>(cacheKey, CACHE_TTL.FUNCTIONS);
        if (cachedFunctions) {
          showToast(Toast.Style.Success, "Loaded from cache", `${cachedFunctions.length} functions`);
          setFunctions(cachedFunctions);
          setLoading(false);
          return;
        }
      }

      showToast(Toast.Style.Animated, "Loading", "Fetching Cloud Functions...");

      // Create Cloud Functions client
      const functionsClient = new CloudFunctionsServiceClient();

      // Define all possible Cloud Functions regions
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

      const allFunctions: GCPFunction[] = [];
      showToast(Toast.Style.Animated, "Loading", `Checking ${regions.length} regions...`);

      // Check each region for functions
      const regionPromises = regions.map(async (region) => {
        try {
          const parent = `projects/${projectId}/locations/${region}`;

          // List functions in this region
          const [functions] = await functionsClient.listFunctions({
            parent,
            pageSize: 100,
          });

          const regionFunctions: GCPFunction[] = [];

          for (const func of functions) {
            if (func.name) {
              const functionName = func.name.split("/").pop() || "";

              // Cast to our interface to access properties safely
              const functionData = func as unknown as CloudFunctionResponse;

              // Map the state property correctly
              const status = functionData.state === "ACTIVE" ? "ACTIVE" : "INACTIVE";

              // Handle updateTime which might be a Timestamp object
              let lastModified = "";
              if (functionData.updateTime) {
                if (typeof functionData.updateTime === "string") {
                  lastModified = functionData.updateTime;
                } else if (functionData.updateTime.seconds) {
                  // Convert Google Timestamp to Date
                  lastModified = new Date(functionData.updateTime.seconds * 1000).toISOString();
                }
              }

              regionFunctions.push({
                name: functionName,
                region,
                status,
                runtime: functionData.runtime || "Unknown",
                trigger: functionData.httpsTrigger ? "HTTP" : functionData.eventTrigger ? "Event" : "Unknown",
                lastModified,
                sourceArchiveUrl: functionData.sourceArchiveUrl || undefined,
              });
            }
          }

          return regionFunctions;
        } catch (regionError) {
          // Skip regions without access or no functions
          const error = regionError as { code?: number };
          if (error.code === 7 || error.code === 5) {
            // PERMISSION_DENIED or NOT_FOUND
            return [];
          }
          return [];
        }
      });

      const results = await Promise.all(regionPromises);
      for (const regionFunctions of results) {
        allFunctions.push(...regionFunctions);
      }

      // Cache the results
      setCachedData(cacheKey, allFunctions);

      showToast(Toast.Style.Success, "Success!", `Found ${allFunctions.length} Cloud Functions`);

      setFunctions(allFunctions);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load Cloud Functions";

      if (errorMsg.includes("403") || errorMsg.includes("PERMISSION_DENIED")) {
        setError(`🚫 Cloud Functions API Access Denied

The service account lacks permission to access Cloud Functions.

📋 To fix this:

1. Go to Google Cloud Console → IAM & Admin → IAM
2. Find your service account
3. Click 'Edit' and add the role: 'Cloud Functions Viewer'

💻 Or use gcloud CLI:
gcloud projects add-iam-policy-binding ${await getProjectId()} --member='serviceAccount:YOUR-SERVICE-ACCOUNT@${await getProjectId()}.iam.gserviceaccount.com' --role='roles/cloudfunctions.viewer'`);
      } else {
        setError(errorMsg);
      }

      showToast(Toast.Style.Failure, "Error", errorMsg);
    } finally {
      setLoading(false);
    }
  }

  function FunctionDetail({ func }: { func: GCPFunction }) {
    const projectId = getProjectId();
    const markdown = `
# ${func.name}

## Function Details
- **Status**: ${getStatusIcon(func.status)} ${func.status}
- **Region**: ${func.region}
- **Runtime**: ${func.runtime}
- **Trigger**: ${func.trigger}
- **Last Modified**: ${formatDate(func.lastModified)}

## Deployment Commands
\`\`\`bash
# Deploy function
gcloud functions deploy ${func.name} --region=${func.region}

# View logs
gcloud functions logs read ${func.name} --region=${func.region}

# Get function details
gcloud functions describe ${func.name} --region=${func.region}

# Test function (if HTTP trigger)
curl -X POST https://${func.region}-${projectId}.cloudfunctions.net/${func.name}
\`\`\`
    `;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open in Console"
              url={`https://console.cloud.google.com/functions/details/${func.region}/${func.name}`}
            />
            <Action.CopyToClipboard title="Copy Function Name" content={func.name} />
            <Action.CopyToClipboard
              title="Copy Deploy Command"
              content={`gcloud functions deploy ${func.name} --region=${func.region}`}
            />
            {func.trigger === "HTTP" && (
              <Action.CopyToClipboard
                title="Copy Http URL"
                content={`https://${func.region}-${projectId}.cloudfunctions.net/${func.name}`}
              />
            )}
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
            <Action title="Retry" onAction={() => loadFunctions(true)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search Cloud Functions...">
      {functions.map((func, index) => (
        <List.Item
          key={`${func.name}-${func.region}-${index}`}
          title={func.name}
          subtitle={`${func.region} • ${func.runtime} • ${func.trigger}`}
          accessories={[
            {
              text: func.trigger,
              tooltip: "Trigger type",
            },
            {
              text: func.status,
              icon: {
                source: func.status === "ACTIVE" ? Icon.Circle : Icon.CircleDisabled,
                tintColor: func.status === "ACTIVE" ? Color.Green : Color.Red,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<FunctionDetail func={func} />} icon={Icon.Eye} />
              <Action.OpenInBrowser
                title="Open in Console"
                url={`https://console.cloud.google.com/functions/details/${func.region}/${func.name}`}
              />
              <Action.CopyToClipboard title="Copy Function Name" content={func.name} />
              {func.trigger === "HTTP" && (
                <Action.CopyToClipboard
                  title="Copy Http URL"
                  content={`https://${func.region}-${getProjectId()}.cloudfunctions.net/${func.name}`}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => loadFunctions(true)}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
