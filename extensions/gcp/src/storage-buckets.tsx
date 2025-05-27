import { ActionPanel, Action, List, Detail, showToast, Toast, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Storage } from "@google-cloud/storage";
import { GCPStorageBucket } from "./types";
import { getProjectId, formatDate, formatBytes } from "./utils";
import { getCachedData, setCachedData, getCacheKey, CACHE_TTL } from "./cache";

export default function StorageBuckets() {
  const [buckets, setBuckets] = useState<GCPStorageBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBuckets();
  }, []);

  async function loadBuckets(forceRefresh = false) {
    try {
      setLoading(true);
      setError(null);

      const projectId = await getProjectId();
      const cacheKey = getCacheKey("storage-buckets", projectId);

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedBuckets = getCachedData<GCPStorageBucket[]>(cacheKey, CACHE_TTL.STORAGE);
        if (cachedBuckets) {
          showToast(Toast.Style.Success, "Loaded from cache", `${cachedBuckets.length} buckets`);
          setBuckets(cachedBuckets);
          setLoading(false);
          return;
        }
      }

      showToast(Toast.Style.Animated, "Loading", "Fetching storage buckets...");

      // Create Storage client with project ID only, let it use ADC
      const storage = new Storage({
        projectId: projectId,
      });

      const [buckets] = await storage.getBuckets();
      showToast(Toast.Style.Success, "Success!", `Found ${buckets.length} storage buckets`);

      const bucketsData: GCPStorageBucket[] = await Promise.all(
        buckets.map(async (bucket) => {
          try {
            const [metadata] = await bucket.getMetadata();

            // Try to get bucket size and object count (this might be slow for large buckets)
            let size: string | undefined;
            let objects: number | undefined;

            try {
              const [files] = await bucket.getFiles({ maxResults: 100 }); // Reduced for faster response
              objects = files.length;

              // Calculate total size (for small buckets only)
              if (files.length < 50) {
                let totalSize = 0;
                for (const file of files) {
                  const [fileMetadata] = await file.getMetadata();
                  const fileSizeStr = fileMetadata.size;
                  if (fileSizeStr) {
                    totalSize += parseInt(fileSizeStr.toString(), 10);
                  }
                }
                size = formatBytes(totalSize);
              }
            } catch {
              // Skip size calculation on error
            }

            const bucketData = {
              name: bucket.name,
              location: metadata.location || "Unknown",
              storageClass: metadata.storageClass || "Unknown",
              created: metadata.timeCreated || "",
              updated: metadata.updated || "",
              size,
              objects,
            };

            return bucketData;
          } catch {
            return {
              name: bucket.name,
              location: "Unknown",
              storageClass: "Unknown",
              created: "",
              updated: "",
            };
          }
        }),
      );

      // Cache the results
      setCachedData(cacheKey, bucketsData);

      setBuckets(bucketsData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load storage buckets";
      await showFailureToast(err instanceof Error ? err : new Error(errorMsg), {
        title: "Error loading storage buckets",
      });
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  function BucketDetail({ bucket }: { bucket: GCPStorageBucket }) {
    const markdown = `
# ${bucket.name}

## Bucket Details
- **Location**: ${bucket.location}
- **Storage Class**: ${bucket.storageClass}
- **Created**: ${formatDate(bucket.created)}
- **Updated**: ${formatDate(bucket.updated)}
${bucket.size ? `- **Size**: ${bucket.size}` : ""}
${bucket.objects !== undefined ? `- **Objects**: ${bucket.objects}` : ""}

## Access Commands
\`\`\`bash
# List objects
gsutil ls gs://${bucket.name}

# Upload file
gsutil cp local-file.txt gs://${bucket.name}/

# Download file
gsutil cp gs://${bucket.name}/file.txt ./

# Sync directory
gsutil -m rsync -r local-directory gs://${bucket.name}/directory/
\`\`\`

## Bucket URL
\`gs://${bucket.name}\`
    `;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open in Console"
              url={`https://console.cloud.google.com/storage/browser/${bucket.name}`}
            />
            <Action.CopyToClipboard title="Copy Bucket URL" content={`gs://${bucket.name}`} />
            <Action.CopyToClipboard title="Copy List Command" content={`gsutil ls gs://${bucket.name}`} />
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
            <Action title="Retry" onAction={() => loadBuckets(true)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search storage buckets...">
      {buckets.length === 0 && !loading ? (
        <List.EmptyView
          title="No storage buckets found"
          description="Create a bucket in GCP Console or refresh to try again"
        />
      ) : (
        buckets.map((bucket) => (
          <List.Item
            key={bucket.name}
            title={bucket.name}
            subtitle={`${bucket.location} • ${bucket.storageClass}`}
            accessories={[
              ...(bucket.size ? [{ text: bucket.size, tooltip: "Bucket size" }] : []),
              ...(bucket.objects !== undefined
                ? [{ text: `${bucket.objects} objects`, tooltip: "Number of objects" }]
                : []),
              {
                text: bucket.location,
                icon: Icon.Globe,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="Show Details" target={<BucketDetail bucket={bucket} />} icon={Icon.Eye} />
                <Action.OpenInBrowser
                  title="Open in Console"
                  url={`https://console.cloud.google.com/storage/browser/${bucket.name}`}
                />
                <Action.CopyToClipboard title="Copy Bucket URL" content={`gs://${bucket.name}`} />
                <Action.CopyToClipboard title="Copy List Command" content={`gsutil ls gs://${bucket.name}`} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={() => loadBuckets(true)}
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
