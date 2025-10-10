import { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, Toast, LocalStorage } from "@raycast/api";

// TypeScript interfaces
interface MetadataItem {
  title: string;
  type: string;
  path: string;
  description?: string;
  subitems?: SubItem[];
}

interface SubItem {
  title: string;
  type: string;
  description?: string;
}

interface SearchItem {
  title: string;
  type: string;
  url: string;
}

interface ReleaseInfo {
  tag_name: string;
  assets: Array<{
    name: string;
    url: string;
  }>;
}

// Constants
const CHECK_RELEASE_INFO_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour
const METADATA_URL = "https://api.github.com/repos/Sleitnick/rbx-doc-search/releases/latest";

// Caching functions
async function getMetadataFromCache(): Promise<MetadataItem[] | null> {
  try {
    const cached = await LocalStorage.getItem("metadata");
    return cached ? JSON.parse(cached as string) : null;
  } catch {
    return null;
  }
}

async function getLatestCachedTag(): Promise<string | null> {
  try {
    const cached = await LocalStorage.getItem("tagName");
    return cached as string | null;
  } catch {
    return null;
  }
}

async function cacheMetadata(metadata: MetadataItem[], tagName: string): Promise<void> {
  await LocalStorage.setItem("metadata", JSON.stringify(metadata));
  await LocalStorage.setItem("tagName", tagName);
  await LocalStorage.setItem("timestamp", Date.now().toString());
}

async function shouldCheckReleaseInfo(): Promise<boolean> {
  try {
    const timestamp = await LocalStorage.getItem("timestamp");
    if (!timestamp) return true;

    const elapsed = Date.now() - parseInt(timestamp as string);
    return elapsed > CHECK_RELEASE_INFO_INTERVAL;
  } catch {
    return true;
  }
}

async function getLatestReleaseInfo(): Promise<ReleaseInfo> {
  const response = await fetch(METADATA_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch release info: ${response.statusText}`);
  }
  return response.json();
}

async function fetchMetadataFromRelease(releaseInfo: ReleaseInfo): Promise<MetadataItem[]> {
  const tagName = releaseInfo.tag_name;
  const asset = releaseInfo.assets.find((asset) => asset.name === "files_metadata.json");

  if (!asset) {
    throw new Error("files_metadata.json not found in release assets");
  }

  const response = await fetch(asset.url, {
    headers: { Accept: "application/octet-stream" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: ${response.statusText}`);
  }

  const metadata = await response.json();
  await cacheMetadata(metadata, tagName);
  return metadata;
}

async function getMetadata(): Promise<MetadataItem[]> {
  const shouldCheck = await shouldCheckReleaseInfo();

  if (!shouldCheck) {
    const cached = await getMetadataFromCache();
    if (cached) return cached;
  }

  const releaseInfo = await getLatestReleaseInfo();
  const cachedTag = await getLatestCachedTag();

  if (releaseInfo.tag_name === cachedTag) {
    const cached = await getMetadataFromCache();
    if (cached) return cached;
  }

  return await fetchMetadataFromRelease(releaseInfo);
}

// Data transformation functions
function transformMetadataToSearchItems(metadata: MetadataItem[]): SearchItem[] {
  const searchItems: SearchItem[] = [];

  for (const item of metadata) {
    // Extract path from content/en-us/(.+)\.(md|yaml)$
    const pathMatch = item.path.match(/content\/en-us\/(.+)\.(md|yaml)$/);
    if (!pathMatch) continue;

    let path = pathMatch[1];
    if (path.endsWith("/index")) {
      path = path.substring(0, path.length - 6);
    }

    const url = `https://create.roblox.com/docs/${path}`;

    // Add main item (only if title exists)
    if (item.title && item.title.trim().length > 0) {
      searchItems.push({
        title: item.title,
        type: item.type,
        url: url,
      });
    }

    // Add subitems if they exist
    if (item.subitems) {
      for (const subitem of item.subitems) {
        // Extract anchor from subitem title (look for : or . patterns)
        const anchorMatch = subitem.title.match(/(:|\\.)(.+)$/);
        const subitemUrl = anchorMatch ? `${url}#${anchorMatch[2]}` : url;

        searchItems.push({
          title: subitem.title,
          type: subitem.type ? `${item.type} ${subitem.type}` : item.type,
          url: subitemUrl,
        });
      }
    }
  }

  return searchItems;
}

// Main component
export default function SearchRobloxDocs() {
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetadata() {
      try {
        setIsLoading(true);
        setError(null);

        const metadata = await getMetadata();
        const items = transformMetadataToSearchItems(metadata);
        setSearchItems(items);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load metadata";
        setError(errorMessage);
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadMetadata();
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView icon="⚠️" title="Error Loading Documentation" description={error} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Roblox Creator Docs...">
      {searchItems
        .filter((item) => item.title && item.title.trim().length > 0)
        .map((item, index) => (
          <List.Item
            key={`${item.title}-${index}`}
            title={item.title}
            subtitle={item.type}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <Action.CopyToClipboard title="Copy URL" content={item.url} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
