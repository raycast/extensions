import {
  ActionPanel,
  Action,
  Icon,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  LocalStorage,
  open,
  getSelectedText,
  showHUD,
} from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { useEffect, useState } from "react";

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    // If URL parsing fails, try to extract domain manually
    const match = url.match(/^(?:https?:\/\/)?([^/?]+)/);
    return match ? match[1] : url;
  }
}

function getFaviconUrl(domain: string): string {
  // Extract main domain from subdomains
  const mainDomain = domain.split(".").slice(-2).join(".");
  return `https://www.google.com/s2/favicons?domain=${mainDomain}&sz=32`;
}

interface TrotToLink {
  id: string;
  shortpath: string;
  destination_url: string;
  created: string;
  modified: string;
  namespace: string;
  owner: string;
  mine: boolean;
  unlisted: boolean;
  visits_count: number;
  tags: string[] | null;
  type: string | null;
}

interface Preferences {
  apiToken: string;
}

export default function Command() {
  const [links, setLinks] = useState<TrotToLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function fetchLinks() {
      if (!preferences.apiToken) {
        setError("API token is required. Please set it in the extension preferences.");
        setIsLoading(false);
        return;
      }

      try {
        // Try to load cached data first
        const cachedData = await LocalStorage.getItem<string>("cached_links");
        const cachedTimestamp = await LocalStorage.getItem<number>("cached_timestamp");
        const now = Date.now();
        const cacheAge = now - (cachedTimestamp || 0);
        const cacheValid = cacheAge < 5 * 60 * 1000; // 5 minutes cache

        if (cachedData && cacheValid) {
          try {
            const parsedData = JSON.parse(cachedData) as TrotToLink[];
            setLinks(parsedData);
            setIsLoading(false);
            return;
          } catch {
            // If cached data is invalid, continue to fetch fresh data
          }
        }

        // Fetch fresh data from API
        const response = await fetch("https://trot.to/_/api/links", {
          headers: {
            Authorization: `Bearer ${preferences.apiToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Cache the fresh data
        await LocalStorage.setItem("cached_links", JSON.stringify(data));
        await LocalStorage.setItem("cached_timestamp", now);

        setLinks(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch links";
        setError(errorMessage);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchLinks();
  }, [preferences.apiToken]);

  const handleLinkPress = async (link: TrotToLink) => {
    // Check if the URL contains %s placeholder
    if (link.destination_url.includes("%s")) {
      try {
        // For links requiring input, we'll use the selected text or prompt inline
        const selectedText = await getSelectedText();
        if (selectedText) {
          // If there's selected text, use it as the input
          const substitutedUrl = link.destination_url.replace(/%s/g, selectedText);
          open(substitutedUrl);
        } else {
          // If no selected text, open the original URL (user can modify in browser)
          open(link.destination_url);
        }
      } catch {
        // If getSelectedText fails, show a message and open the original URL
        await showHUD("No text selected. Opening URL with placeholder for manual input.");
        open(link.destination_url);
      }
    } else {
      // Open the URL directly
      open(link.destination_url);
    }
  };

  if (error) {
    return (
      <List>
        <List.Item
          icon={Icon.ExclamationMark}
          title="Error"
          subtitle={error}
          accessories={[{ icon: Icon.ExclamationMark, text: "Failed to load" }]}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {links
        .sort((a, b) => b.visits_count - a.visits_count)
        .map((link) => {
          const domain = extractDomain(link.destination_url);

          return (
            <List.Item
              key={link.id}
              icon={{ source: getFaviconUrl(domain), fallback: Icon.Link }}
              title={link.shortpath || link.destination_url || "Untitled Link"}
              subtitle={domain}
              accessories={[
                { icon: Icon.Eye, text: `${link.visits_count}` },
                { icon: getAvatarIcon(link.owner), tooltip: link.owner },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Open Link" icon={Icon.Link} onAction={() => handleLinkPress(link)} />
                  <Action.OpenInBrowser url={link.destination_url} title="Open Original URL" />
                  <Action.CopyToClipboard content={link.destination_url} title="Copy URL" />
                  <Action.CopyToClipboard content={link.shortpath || link.destination_url} title="Copy Shortpath" />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
