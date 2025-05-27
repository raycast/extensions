import { ActionPanel, Action, List, Detail, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { GCPInstance } from "./types";
import { getGoogleAuth, getProjectId, formatDate, getMachineTypeFromSelfLink, getStatusIcon } from "./utils";
import { getCachedData, setCachedData, getCacheKey, CACHE_TTL, clearCache } from "./cache";

interface ZoneResponse {
  items?: Array<{
    name: string;
  }>;
}

interface InstanceResponse {
  items?: Array<{
    id?: string;
    name?: string;
    machineType?: string;
    status?: string;
    creationTimestamp?: string;
    networkInterfaces?: Array<{
      networkIP?: string;
      accessConfigs?: Array<{
        natIP?: string;
      }>;
    }>;
  }>;
}

export default function ComputeInstances() {
  const [instances, setInstances] = useState<GCPInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInstances();
  }, []);

  async function loadInstances(forceRefresh = false) {
    try {
      setLoading(true);
      setError(null);

      const projectId = await getProjectId();
      const cacheKey = getCacheKey("compute-instances", projectId);

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedInstances = getCachedData<GCPInstance[]>(cacheKey, CACHE_TTL.INSTANCES);
        if (cachedInstances) {
          showToast(Toast.Style.Success, "Loaded from cache", `${cachedInstances.length} instances`);
          setInstances(cachedInstances);
          setLoading(false);
          return;
        }
      }

      showToast(Toast.Style.Animated, "Loading", "Fetching compute instances...");

      const auth = await getGoogleAuth();
      const authClient = await auth.getClient();
      const accessToken = await authClient.getAccessToken();

      if (!accessToken.token) {
        throw new Error("Failed to get access token");
      }

      showToast(Toast.Style.Animated, "Loading", "Getting all zones...");

      // First, get all zones using REST API
      const zonesUrl = `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones`;
      const zonesResponse = await fetch(zonesUrl, {
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!zonesResponse.ok) {
        if (zonesResponse.status === 403) {
          throw new Error(`🚫 Compute Engine API Access Denied

The service account lacks permission to access Compute Engine.

📋 To fix this:

1. Go to Google Cloud Console → IAM & Admin → IAM
2. Find your service account
3. Click 'Edit' and add the role: 'Compute Engine Viewer'

💻 Or use gcloud CLI:
gcloud projects add-iam-policy-binding ${projectId} --member='serviceAccount:YOUR-SERVICE-ACCOUNT@${projectId}.iam.gserviceaccount.com' --role='roles/compute.viewer'`);
        }

        throw new Error(`Failed to get zones: HTTP ${zonesResponse.status} - ${zonesResponse.statusText}`);
      }

      const zonesData = (await zonesResponse.json()) as ZoneResponse;
      const zones = zonesData.items || [];

      showToast(Toast.Style.Animated, "Loading", `Checking ${zones.length} zones for instances...`);

      const allInstances: GCPInstance[] = [];

      // Check each zone for instances in parallel for better performance
      const zonePromises = zones.map(async (zone) => {
        try {
          const zoneName = zone.name;
          const instancesUrl = `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${zoneName}/instances`;

          const instancesResponse = await fetch(instancesUrl, {
            headers: {
              Authorization: `Bearer ${accessToken.token}`,
              "Content-Type": "application/json",
            },
          });

          if (!instancesResponse.ok) {
            if (instancesResponse.status === 403 || instancesResponse.status === 404) {
              return []; // No access or no instances in this zone
            }
            return [];
          }

          const instancesData = (await instancesResponse.json()) as InstanceResponse;
          const instances = instancesData.items || [];

          return instances.map((instance) => {
            const networkInterfaces = instance.networkInterfaces || [];
            const externalIp = networkInterfaces[0]?.accessConfigs?.[0]?.natIP;
            const internalIp = networkInterfaces[0]?.networkIP;

            return {
              id: instance.id?.toString() || "",
              name: instance.name || "",
              zone: zoneName,
              machineType: getMachineTypeFromSelfLink(instance.machineType || ""),
              status: instance.status || "",
              externalIp,
              internalIp,
              creationTimestamp: instance.creationTimestamp || "",
            };
          });
        } catch {
          return [];
        }
      });

      const results = await Promise.all(zonePromises);
      for (const zoneInstances of results) {
        allInstances.push(...zoneInstances);
      }

      // Cache the results
      setCachedData(cacheKey, allInstances);

      showToast(Toast.Style.Success, "Success!", `Found ${allInstances.length} compute instances`);

      setInstances(allInstances);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load instances";
      setError(errorMsg);
      showToast(Toast.Style.Failure, "Error", errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function startInstance(instanceName: string, zone: string) {
    try {
      showToast(Toast.Style.Animated, "Starting", `Starting instance ${instanceName}...`);

      const auth = await getGoogleAuth();
      const projectId = await getProjectId();

      const authClient = await auth.getClient();
      const accessToken = await authClient.getAccessToken();

      if (!accessToken.token) {
        throw new Error("Failed to get access token");
      }

      const url = `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${zone}/instances/${instanceName}/start`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Clear cache to force refresh on next load
      const cacheKey = getCacheKey("compute-instances", projectId);
      clearCache(cacheKey);

      showToast(Toast.Style.Success, "Success", `Starting instance ${instanceName}`);
      await loadInstances(true); // Force refresh
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      showToast(Toast.Style.Failure, "Error", `Failed to start instance ${instanceName}: ${errorMsg}`);
    }
  }

  async function stopInstance(instanceName: string, zone: string) {
    try {
      showToast(Toast.Style.Animated, "Stopping", `Stopping instance ${instanceName}...`);

      const auth = await getGoogleAuth();
      const projectId = await getProjectId();

      const authClient = await auth.getClient();
      const accessToken = await authClient.getAccessToken();

      if (!accessToken.token) {
        throw new Error("Failed to get access token");
      }

      const url = `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${zone}/instances/${instanceName}/stop`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Clear cache to force refresh on next load
      const cacheKey = getCacheKey("compute-instances", projectId);
      clearCache(cacheKey);

      showToast(Toast.Style.Success, "Success", `Stopping instance ${instanceName}`);
      await loadInstances(true); // Force refresh
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      showToast(Toast.Style.Failure, "Error", `Failed to stop instance ${instanceName}: ${errorMsg}`);
    }
  }

  async function restartInstance(instanceName: string, zone: string) {
    try {
      showToast(Toast.Style.Animated, "Restarting", `Restarting instance ${instanceName}...`);

      const auth = await getGoogleAuth();
      const projectId = await getProjectId();

      const authClient = await auth.getClient();
      const accessToken = await authClient.getAccessToken();

      if (!accessToken.token) {
        throw new Error("Failed to get access token");
      }

      const url = `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${zone}/instances/${instanceName}/reset`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Clear cache to force refresh on next load
      const cacheKey = getCacheKey("compute-instances", projectId);
      clearCache(cacheKey);

      showToast(Toast.Style.Success, "Success", `Restarting instance ${instanceName}`);
      await loadInstances(true); // Force refresh
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      showToast(Toast.Style.Failure, "Error", `Failed to restart instance ${instanceName}: ${errorMsg}`);
    }
  }

  function InstanceDetail({ instance }: { instance: GCPInstance }) {
    const markdown = `
# ${instance.name}

## Instance Details
- **Status**: ${getStatusIcon(instance.status)} ${instance.status}
- **Machine Type**: ${instance.machineType}
- **Zone**: ${instance.zone}
- **ID**: ${instance.id}

## Network
- **External IP**: ${instance.externalIp || "None"}
- **Internal IP**: ${instance.internalIp || "None"}

## Timestamps
- **Created**: ${formatDate(instance.creationTimestamp)}

## SSH Command
\`\`\`bash
gcloud compute ssh ${instance.name} --zone=${instance.zone}
\`\`\`
    `;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Ssh Command"
              content={`gcloud compute ssh ${instance.name} --zone=${instance.zone}`}
            />
            <Action.OpenInBrowser
              title="Open in Console"
              url={`https://console.cloud.google.com/compute/instancesDetail/zones/${instance.zone}/instances/${instance.name}`}
            />
            {instance.status === "RUNNING" && (
              <Action
                title="Stop Instance"
                icon={Icon.Stop}
                onAction={() => stopInstance(instance.name, instance.zone)}
              />
            )}
            {instance.status === "TERMINATED" && (
              <Action
                title="Start Instance"
                icon={Icon.Play}
                onAction={() => startInstance(instance.name, instance.zone)}
              />
            )}
            {instance.status === "RUNNING" && (
              <Action
                title="Restart Instance"
                icon={Icon.Repeat}
                onAction={() => restartInstance(instance.name, instance.zone)}
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
            <Action title="Retry" onAction={() => loadInstances(true)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search instances...">
      {instances.map((instance) => (
        <List.Item
          key={instance.id}
          title={instance.name}
          subtitle={`${instance.zone} • ${instance.machineType}`}
          accessories={[
            {
              text: instance.externalIp || instance.internalIp || "No IP",
              tooltip: instance.externalIp ? "External IP" : "Internal IP",
            },
            {
              text: instance.status,
              icon: {
                source: instance.status === "RUNNING" ? Icon.Circle : Icon.CircleDisabled,
                tintColor: instance.status === "RUNNING" ? Color.Green : Color.Red,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<InstanceDetail instance={instance} />} icon={Icon.Eye} />
              <Action.CopyToClipboard
                title="Copy Ssh Command"
                content={`gcloud compute ssh ${instance.name} --zone=${instance.zone}`}
              />
              <Action.OpenInBrowser
                title="Open in Console"
                url={`https://console.cloud.google.com/compute/instancesDetail/zones/${instance.zone}/instances/${instance.name}`}
              />
              {instance.status === "RUNNING" && (
                <Action
                  title="Stop Instance"
                  icon={Icon.Stop}
                  onAction={() => stopInstance(instance.name, instance.zone)}
                />
              )}
              {instance.status === "TERMINATED" && (
                <Action
                  title="Start Instance"
                  icon={Icon.Play}
                  onAction={() => startInstance(instance.name, instance.zone)}
                />
              )}
              {instance.status === "RUNNING" && (
                <Action
                  title="Restart Instance"
                  icon={Icon.Repeat}
                  onAction={() => restartInstance(instance.name, instance.zone)}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => loadInstances(true)}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
