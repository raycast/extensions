import { ActionPanel, Action, List, Detail, showToast, Toast, Icon, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { CloudFunctionsServiceClient } from "@google-cloud/functions";
import { GCPFunction } from "./types";
import { getProjectId, formatDate, getStatusIcon } from "./utils";
import { getCachedData, setCachedData, getCacheKey, CACHE_TTL } from "./cache";

// Helper function to get status icon and color for function status
function getFunctionStatusDisplay(status: string) {
  const normalizedStatus = status.toUpperCase();

  if (normalizedStatus === "ACTIVE") {
    return {
      icon: Icon.Circle,
      color: Color.Green,
    };
  } else if (normalizedStatus === "DEPLOYING" || normalizedStatus === "UPDATING") {
    return {
      icon: Icon.CircleProgress,
      color: Color.Orange,
    };
  } else {
    return {
      icon: Icon.CircleDisabled,
      color: Color.Red,
    };
  }
}

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
  const [projectId, setProjectId] = useState<string>("");

  useEffect(() => {
    // loadFunctions will also set the projectId, no need for separate call
    loadFunctions();
  }, []);

  async function loadFunctions(forceRefresh = false) {
    // Declare project ID variable at function level to access it in both try and catch blocks
    let currentProjectId = "";
    try {
      setLoading(true);
      setError(null);

      // Get and cache the project ID to avoid multiple awaits
      currentProjectId = await getProjectId();
      // Update the component state to use in rendering
      setProjectId(currentProjectId);
      const cacheKey = getCacheKey("cloud-functions", currentProjectId);

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
          const parent = `projects/${currentProjectId}/locations/${region}`;

          // List functions in this region with pagination support
          const allRegionFunctions: GCPFunction[] = [];
          let pageToken: string | undefined;

          do {
            const [functions, , response] = await functionsClient.listFunctions({
              parent,
              pageSize: 100,
              pageToken,
            });

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

                allRegionFunctions.push({
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

            pageToken = response?.nextPageToken || undefined;
          } while (pageToken);

          return allRegionFunctions;
        } catch {
          // Skip regions without access or no functions
          // PERMISSION_DENIED or NOT_FOUND
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
        // Use the cached project ID from earlier
        const projectIdForError = currentProjectId || "YOUR-PROJECT-ID";
        setError(`🚫 Cloud Functions API Access Denied

The service account lacks permission to access Cloud Functions.

📋 To fix this:

1. Go to Google Cloud Console → IAM & Admin → IAM
2. Find your service account
3. Click 'Edit' and add the role: 'Cloud Functions Viewer'

💻 Or use gcloud CLI:
gcloud projects add-iam-policy-binding ${projectIdForError} --member='serviceAccount:YOUR-SERVICE-ACCOUNT@${projectIdForError}.iam.gserviceaccount.com' --role='roles/cloudfunctions.viewer'`);
      } else {
        setError(errorMsg);
      }

      await showFailureToast(err instanceof Error ? err : new Error(errorMsg), {
        title: "Error loading Cloud Functions",
      });
    } finally {
      setLoading(false);
    }
  }

  function FunctionDetail({ func, projectId }: { func: GCPFunction; projectId: string }) {
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
      <List.EmptyView
        icon={Icon.Code}
        title="No Cloud Functions Found"
        description="No Cloud Functions were found in your GCP project. Deploy a function in the Google Cloud Console."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Deploy Function"
              icon={Icon.Plus}
              url="https://console.cloud.google.com/functions"
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={() => loadFunctions(true)}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />
      {functions.map((func) => {
        const statusDisplay = getFunctionStatusDisplay(func.status);
        return (
          <List.Item
            key={`${func.region}/${func.name}`}
            title={func.name}
            subtitle={`${func.region} • ${func.runtime} • ${func.trigger}`}
            accessories={[
              {
                text: func.trigger,
                tooltip: `Trigger type: ${func.trigger}`,
              },
              {
                text: func.status,
                icon: {
                  source: statusDisplay.icon,
                  tintColor: statusDisplay.color,
                },
                tooltip: `Function status: ${func.status}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  target={<FunctionDetail func={func} projectId={projectId} />}
                  icon={Icon.Eye}
                />
                <Action.OpenInBrowser
                  title="Open in Console"
                  url={`https://console.cloud.google.com/functions/details/${func.region}/${func.name}`}
                />
                <Action.CopyToClipboard title="Copy Function Name" content={func.name} />
                {func.trigger === "HTTP" && projectId && (
                  <Action.CopyToClipboard
                    title="Copy Http URL"
                    content={`https://${func.region}-${projectId}.cloudfunctions.net/${func.name}`}
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
        );
      })}
    </List>
  );
}
