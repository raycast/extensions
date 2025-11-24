import { ActionPanel, Action, List, showToast } from "@raycast/api";
import { useCachedPromise, getFavicon } from "@raycast/utils";
import { CREATE_ERROR_TOAST_OPTIONS } from "./constants";
import fetch from "node-fetch";

const REGISTRIES_API_URL = "https://ui.shadcn.com/r/registries.json";

interface Registry {
  name: string;
  url: string;
  domain: string;
}

/**
 * Extract the base domain from a registry URL template
 * Example: "https://reui.io/r/{name}.json" -> "https://reui.io"
 */
function getDomain(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    // Fallback: try to extract domain manually if URL parsing fails
    const match = url.match(/^https?:\/\/([^/]+)/);
    return match ? `https://${match[1]}` : url;
  }
}

/**
 * Fetch the list of registries from the shadcn API
 */
async function getRegistries(): Promise<Registry[]> {
  const response = await fetch(REGISTRIES_API_URL);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const data = (await response.json()) as Record<string, string>;

  return Object.entries(data).map(([name, url]) => ({
    name,
    url,
    domain: getDomain(url),
  }));
}

export default function SearchRegistries() {
  const { isLoading, data } = useCachedPromise(getRegistries, [], {
    keepPreviousData: true,
    onError: async (e) => {
      await showToast(CREATE_ERROR_TOAST_OPTIONS(e));
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search registries...">
      {data?.map((registry) => (
        <RegistryListItem key={registry.name} registry={registry} />
      ))}
    </List>
  );
}

function RegistryListItem({ registry }: { registry: Registry }) {
  return (
    <List.Item
      title={registry.name}
      subtitle={registry.url}
      icon={getFavicon(registry.domain)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Registry Name" content={registry.name} />
            <Action.CopyToClipboard title="Copy Registry URL" content={registry.url} />
            <Action.OpenInBrowser title="Visit Website" url={registry.domain} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
