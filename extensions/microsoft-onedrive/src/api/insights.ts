import { getAccessToken } from "../oauth";
import type { DriveItem } from "../types";
import { BATCH_SIZE, DRIVE_ITEM_SELECT, GRAPH_API_BASE, graphRequest } from "./client";

interface BatchRequest {
  id: string;
  method: string;
  url: string;
}

interface BatchResponse {
  responses: Array<{
    id: string;
    status: number;
    body: DriveItem;
  }>;
}

export interface UsedInsight {
  id: string;
  lastUsed: {
    lastAccessedDateTime: string;
    lastModifiedDateTime: string;
  };
  resourceVisualization: {
    title: string;
    type: string;
    mediaType: string;
    previewImageUrl?: string;
    previewText: string;
    containerWebUrl: string;
    containerDisplayName: string;
    containerType: string;
  };
  resourceReference: {
    webUrl: string;
    id: string;
    type: string;
  };
}

export interface UsedInsightsResult {
  value: UsedInsight[];
  "@odata.nextLink"?: string;
}

/**
 * Get recently used files using Insights API
 * Note: Only works with work/school accounts, not personal accounts
 */
export async function getRecentFiles(top = 50): Promise<UsedInsightsResult> {
  const endpoint = `/me/insights/used?$orderby=LastUsed/LastAccessedDateTime desc&$top=${top}`;
  const response = await graphRequest(endpoint);
  return (await response.json()) as UsedInsightsResult;
}

/**
 * Check if Insights API is available (returns false for personal accounts)
 */
export async function isInsightsAvailable(): Promise<boolean> {
  try {
    // Try to fetch just one item to check if the API is available
    await graphRequest("/me/insights/used?$top=1");
    return true;
  } catch {
    // Insights API not available (likely personal account or disabled)
    return false;
  }
}

/**
 * Get full DriveItem from a resource reference ID
 * The resource reference is in format: "drives/{driveId}/items/{itemId}"
 */
export async function getDriveItemFromResourceId(resourceId: string): Promise<DriveItem | null> {
  try {
    // resourceId format: "drives/{driveId}/items/{itemId}" or "sites/.../drives/.../items/..."
    // Extract the path after the Graph API base URL
    const endpoint = `/${resourceId}?${DRIVE_ITEM_SELECT}`;
    const response = await graphRequest(endpoint);
    return (await response.json()) as DriveItem;
  } catch {
    console.error(`Failed to fetch DriveItem for ${resourceId}`);
    return null;
  }
}

/**
 * Batch request to get full DriveItems for multiple insights efficiently
 * Returns a map of resourceId -> DriveItem
 */
export async function batchGetDriveItems(resourceIds: string[]): Promise<Map<string, DriveItem>> {
  const result = new Map<string, DriveItem>();

  if (resourceIds.length === 0) return result;

  // Process in batches of BATCH_SIZE (20)
  for (let i = 0; i < resourceIds.length; i += BATCH_SIZE) {
    const batch = resourceIds.slice(i, i + BATCH_SIZE);

    const batchRequests: BatchRequest[] = batch.map((resourceId, index) => ({
      id: `${index}`,
      method: "GET",
      url: `/${resourceId}?${DRIVE_ITEM_SELECT}`,
    }));

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`${GRAPH_API_BASE}/$batch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests: batchRequests }),
      });

      if (!response.ok) {
        console.error(`Batch request failed: ${response.status} ${response.statusText}`);
        continue;
      }

      const batchResult = (await response.json()) as BatchResponse;

      batchResult.responses.forEach((batchResponse) => {
        const itemIndex = parseInt(batchResponse.id);
        const resourceId = batch[itemIndex];

        if (batchResponse.status === 200 && batchResponse.body) {
          result.set(resourceId, batchResponse.body);
        }
      });
    } catch (error) {
      console.error("Batch request error:", error);
    }
  }

  return result;
}
