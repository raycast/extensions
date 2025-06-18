import {
  Clipboard,
  BrowserExtension,
  Toast,
  showToast,
  List,
  Action,
  ActionPanel,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import {
  PageInfo,
  withTimeout,
  getActiveTabContent,
  extractPageMetadata,
  extractMainContent,
} from "./utils/page-content-extractor";
import { formatForTana } from "./utils/tana-formatter";

const execAsync = promisify(exec);

/**
 * Enhanced Copy Page Content to Tana with Tab Selection
 *
 * Provides a list of available browser tabs for selection, then extracts clean content
 * using Raycast's reader mode and applies comprehensive metadata extraction.
 */

/**
 * Browser tab information from the Raycast Browser Extension API
 *
 * @interface BrowserTab
 * @property {number} id - Unique identifier for the browser tab
 * @property {string} title - The page title displayed in the tab
 * @property {string} url - The full URL of the page
 * @property {boolean} active - Whether this tab is currently active (Note: unreliable across windows)
 */
interface BrowserTab {
  id: number;
  title: string;
  url: string;
  active: boolean;
}

/**
 * Process active tab directly using the reliable method
 */
/**
 * Shared logic for processing tab content and formatting for Tana
 * @param getInfo - Function that retrieves page information
 * @param toastMessage - Initial toast message
 */
async function processTabContent(
  getInfo: () => Promise<PageInfo>,
  toastMessage: string,
) {
  const preferences = getPreferenceValues<Preferences>();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Extracting Page Content",
    message: toastMessage,
  });

  try {
    // Get page information using the provided function
    const pageInfo = await getInfo();

    console.log(
      `🔍 Final page info - Title: "${pageInfo.title}", Content length: ${pageInfo.content.length}`,
    );

    toast.message = "Converting to Tana format...";

    // Format for Tana using unified formatter
    const tanaFormat = formatForTana({
      title: pageInfo.title,
      url: pageInfo.url,
      description: pageInfo.description,
      author: pageInfo.author,
      content: pageInfo.content,
      useSwipeTag: true,
      articleTag: preferences.articleTag,
      videoTag: preferences.videoTag,
      transcriptTag: preferences.transcriptTag,
      urlField: preferences.urlField,
      authorField: preferences.authorField,
      transcriptField: preferences.transcriptField,
      contentField: preferences.contentField,
      includeAuthor: preferences.includeAuthor,
      includeDescription: preferences.includeDescription,
    });
    await Clipboard.copy(tanaFormat);

    // Open Tana and update toast to success
    try {
      await execAsync("open tana://");
      toast.style = Toast.Style.Success;
      toast.title = "Success!";
      toast.message = "Page content copied to clipboard and Tana opened";
    } catch (error) {
      console.error("Error opening Tana:", error);
      toast.style = Toast.Style.Success;
      toast.title = "Content Copied (Tana failed to open)";
      toast.message = "";
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    toast.style = Toast.Style.Failure;
    toast.title = "Failed to extract page content";
    toast.message = errorMessage;

    console.error("Page content extraction error:", error);
  }
}

/**
 * Process the currently active/focused browser tab for content extraction
 *
 * Uses the focused tab title matching approach to identify the correct tab
 * and extract its content with metadata. This is the most reliable method
 * for getting content from the tab the user is actually viewing.
 *
 * @returns Promise that resolves when processing completes
 */
async function processActiveTab() {
  await processTabContent(async () => {
    // Get content and tab info from focused window's active tab
    const { content, tabInfo, metadata } = await getActiveTabContent();

    // Combine all info using the metadata already fetched
    return {
      title: metadata.title || tabInfo.title || "Web Page",
      url: metadata.url || tabInfo.url,
      description: metadata.description,
      author: metadata.author,
      content,
    };
  }, "Processing active tab...");
}

/**
 * Process a user-selected browser tab for content extraction
 *
 * Extracts content and metadata from the specified tab using the Browser Extension API.
 * This allows users to choose any tab from the available tabs list.
 *
 * @param selectedTab - The browser tab object selected by the user
 * @returns Promise that resolves when processing completes
 */
async function processTab(selectedTab: BrowserTab) {
  await processTabContent(async () => {
    // Extract metadata
    const metadata = await extractPageMetadata(
      selectedTab.id,
      selectedTab.url,
      selectedTab.title,
    );

    // Extract main content using Raycast's reader mode
    const content = await extractMainContent(selectedTab.id, selectedTab.url);

    // Combine all info
    return {
      title: metadata.title || "Web Page",
      url: metadata.url || selectedTab.url,
      description: metadata.description,
      author: metadata.author,
      content,
    };
  }, `Processing "${selectedTab.title}"...`);
}

/**
 * Extract clean domain name from URL for display purposes
 *
 * Removes protocol, www prefix, and handles invalid URLs gracefully.
 * Used in the tab selection interface to show readable domain names.
 *
 * @param url - The full URL to extract domain from
 * @returns Clean domain name (e.g., "example.com") or "Unknown" if URL is invalid
 */
function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return "Unknown";
  }
}

/**
 * Interactive browser tab selection command for content extraction
 *
 * Displays a list of all available browser tabs, allowing users to either:
 * - Select "Active Tab" to process the currently focused tab
 * - Choose any specific tab from the list to extract its content
 *
 * Each tab shows its title, domain, and URL for easy identification.
 * After selection, extracts page content and converts to Tana Paste format.
 *
 * Requirements:
 * - Raycast Browser Extension must be installed and enabled
 * - At least one browser tab must be open
 *
 * @returns React component for tab selection interface
 */
export default function Command() {
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTabs() {
      try {
        console.log("🔍 Loading browser tabs...");
        const browserTabs = await withTimeout(
          BrowserExtension.getTabs(),
          6000,
          "Getting browser tabs",
        );

        if (!browserTabs || browserTabs.length === 0) {
          throw new Error(
            "No browser tabs found. Please ensure you have browser tabs open and Raycast has permission to access your browser.",
          );
        }

        console.log(`✅ Found ${browserTabs.length} tabs`);

        // Convert to our format and sort by active status and title
        const formattedTabs: BrowserTab[] = browserTabs
          .map((tab) => ({
            id: tab.id,
            title: tab.title || "Untitled",
            url: tab.url || "",
            active: tab.active || false,
          }))
          .sort((a, b) => {
            // Active tabs first, then sort by title
            if (a.active && !b.active) return -1;
            if (!a.active && b.active) return 1;
            return a.title.localeCompare(b.title);
          });

        setTabs(formattedTabs);
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        console.error("❌ Failed to load tabs:", errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    loadTabs();
  }, []);

  if (error) {
    return (
      <List>
        <List.Item title="Error Loading Tabs" subtitle={error} icon="❌" />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search browser tabs...">
      <List.Item
        title="🎯 Extract Active Tab"
        subtitle="Process the currently focused browser tab"
        icon="⚡"
        actions={
          <ActionPanel>
            <Action
              title="Extract Active Tab to Tana"
              onAction={processActiveTab}
            />
          </ActionPanel>
        }
      />
      {tabs.map((tab) => (
        <List.Item
          key={tab.id}
          title={tab.title}
          subtitle={getDomainFromUrl(tab.url)}
          accessories={[
            ...(tab.active ? [{ text: "Active" }] : []),
            { text: getDomainFromUrl(tab.url) },
          ]}
          icon={tab.active ? "✅" : "🌐"}
          actions={
            <ActionPanel>
              <Action
                title="Extract Content to Tana"
                onAction={() => processTab(tab)}
              />
              <Action.OpenInBrowser title="Open in Browser" url={tab.url} />
              <Action.CopyToClipboard title="Copy URL" content={tab.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
