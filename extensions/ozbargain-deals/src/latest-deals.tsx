import { Action, ActionPanel, List, Detail, Icon, getPreferenceValues } from "@raycast/api";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import * as xml2js from "xml2js";
import TurndownService from "turndown";
import sanitizeHtml from "sanitize-html";
import he from "he"; // HTML entity encoder/decoder
import { showFailureToast } from "@raycast/utils";

// --- Type Definitions ---

// Define preferences interface for type safety
interface Preferences {
  itemLimit: string; // Stored as string, will be parsed to number
}

// Define the structure that matches the actual OzBargain RSS feed
interface OzBargainFeedItem {
  title: string;
  link: string;
  description: string;
  comments?: string;
  category?: string | string[];
  "ozb:meta"?: {
    $: {
      "comment-count"?: string;
      "votes-pos"?: string;
      "votes-neg"?: string;
      image?: string;
      url?: string;
    };
  };
  "media:thumbnail"?: {
    $: {
      url: string;
    };
  };
  "dc:creator"?: string;
  pubDate: string;
  guid?: string;
}

// Define the structured data for a deal after parsing
interface Deal {
  id: string;
  title: string;
  link: string;
  descriptionHtml: string; // Raw HTML description from feed
  descriptionMarkdown: string; // HTML converted to Markdown
  upvotes: number;
  downvotes: number;
  comments: number;
  store: string;
  creator: string;
  pubDate: Date;
  categories: string[];
  imageUrl?: string; // Optional main image
  netVotes: number; // upvotes - downvotes
}

// --- Constants & Helpers ---

const OZB_FEED_URL = "https://www.ozbargain.com.au/feed";
const MAX_DESCRIPTION_LENGTH = 1500; // Truncate long descriptions in Detail view

// Configure sanitize-html options for safe HTML processing
const sanitizeOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "b",
    "i",
    "a",
    "img",
    "div",
    "span",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "blockquote",
  ],
  allowedAttributes: {
    a: ["href", "title"],
    img: ["src", "alt", "title", "width", "height"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};

// Type for TurndownService node elements
interface TurndownNode {
  getAttribute: (name: string) => string | null;
}

// Initialize TurndownService for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

turndownService.addRule("dealImage", {
  filter: "img",
  replacement: function (content, node) {
    const element = node as TurndownNode;
    const src = element.getAttribute("src");
    const alt = element.getAttribute("alt") || "";
    if (src) {
      return `![${alt}](${src})`;
    }
    return "";
  },
});

turndownService.addRule("dealLink", {
  filter: "a",
  replacement: function (content, node) {
    const element = node as TurndownNode;
    const href = element.getAttribute("href");
    if (href && content) {
      return `[${he.decode(content).trim()}](${href})`;
    }
    return content;
  },
});

// Helper function to extract store name from title
function extractStoreFromTitle(title: string): string {
  // Look for patterns like "@ Store Name" at the end of titles
  const storeMatch = title.match(/@\s*([^@]+?)(?:\s*$|\s*\[|\s*\()/);
  if (storeMatch && storeMatch[1]) {
    return storeMatch[1].trim();
  }
  return "";
}

// Helper function to format time ago
function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000; // Years
  if (interval > 1) return `${Math.floor(interval)}y`;
  interval = seconds / 2592000; // Months
  if (interval > 1) return `${Math.floor(interval)}mo`;
  interval = seconds / 86400; // Days
  if (interval > 1) return `${Math.floor(interval)}d`;
  interval = seconds / 3600; // Hours
  if (interval > 1) return `${Math.floor(interval)}h`;
  interval = seconds / 60; // Minutes
  if (interval > 1) return `${Math.floor(interval)}m`;
  return `${Math.floor(seconds)}s`;
}

// --- DealDetail Component (displays individual deal details) ---
function DealDetail({ deal }: { deal: Deal }) {
  // Construct the Markdown content for the Detail view
  const markdownContent = `
  # ${deal.title}
  
  *   **Store:** ${deal.store}
  *   **Posted:** ${timeAgo(deal.pubDate)} by ${deal.creator}
  *   **Votes:** 👍 ${deal.upvotes} | 👎 ${deal.downvotes} (**${deal.netVotes} Net**)
  *   **Comments:** ${deal.comments}
  *   **Categories:** ${deal.categories.join(", ")}
  
  ---
  
  ${deal.descriptionMarkdown.substring(0, MAX_DESCRIPTION_LENGTH)}
  ${deal.descriptionMarkdown.length > MAX_DESCRIPTION_LENGTH ? "\n\n... (Description Truncated)" : ""}
    `;

  return (
    <Detail
      navigationTitle={deal.title} // Title shown in the navigation bar
      markdown={markdownContent}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={deal.link} title="Open Deal in Browser" />
          <Action.CopyToClipboard content={deal.link} title="Copy Deal Link" />
          <Action.CopyToClipboard content={deal.title} title="Copy Deal Title" />
          <Action.OpenInBrowser
            url={`${deal.link}#comments`}
            title="Open Comments in Browser"
            icon={Icon.SpeechBubble}
          />
          {deal.imageUrl && (
            <Action.OpenInBrowser url={deal.imageUrl} title="View Image in Browser" icon={Icon.Image} />
          )}
        </ActionPanel>
      }
      // Metadata section provides structured information
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Store" text={deal.store} icon={Icon.Tag} />
          <Detail.Metadata.Label title="Posted By" text={deal.creator} icon={Icon.Person} />
          <Detail.Metadata.Label title="Posted At" text={deal.pubDate.toLocaleString()} icon={Icon.Calendar} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Upvotes" text={deal.upvotes.toString()} icon={Icon.ArrowUp} />
          <Detail.Metadata.Label title="Downvotes" text={deal.downvotes.toString()} icon={Icon.ArrowDown} />
          <Detail.Metadata.Label title="Net Votes" text={deal.netVotes.toString()} icon={Icon.Gauge} />
          <Detail.Metadata.Label title="Comments" text={deal.comments.toString()} icon={Icon.SpeechBubble} />
          {deal.categories && deal.categories.length > 0 && (
            <Detail.Metadata.TagList title="Categories">
              {deal.categories.map((cat) => (
                <Detail.Metadata.TagList.Item key={cat} text={cat} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Original Link" target={deal.link} text="View on OzBargain" />
        </Detail.Metadata>
      }
    />
  );
}

// --- Main List Component (displays the list of deals) ---
export default function LatestDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");

  // Get user preferences (e.g., how many items to display)
  const preferences = getPreferenceValues<Preferences>();
  const itemLimit = Number(preferences.itemLimit);

  // Callback function to fetch deals, memoized for efficiency
  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(OZB_FEED_URL);
      // Initialize XML parser using xml2js.Parser
      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: false, // Keep attributes separate
        ignoreAttrs: false, // Include attributes in parsing
      });
      const result = await parser.parseStringPromise(response.data);

      // Access the items array with proper error handling
      const items: OzBargainFeedItem[] = Array.isArray(result?.rss?.channel?.item)
        ? result.rss.channel.item
        : result?.rss?.channel?.item
          ? [result.rss.channel.item]
          : [];

      // Process and map raw feed items to Deal objects
      const parsedDeals: Deal[] = items.slice(0, itemLimit).map((item, index) => {
        // Sanitize HTML description
        const descriptionHtml = sanitizeHtml(item.description || "", sanitizeOptions);
        const descriptionMarkdown = turndownService.turndown(descriptionHtml);

        // Extract vote data from ozb:meta attributes
        const ozbMeta = item["ozb:meta"];
        const upvotes = parseInt(ozbMeta?.$?.["votes-pos"] || "0");
        const downvotes = parseInt(ozbMeta?.$?.["votes-neg"] || "0");
        const comments = parseInt(ozbMeta?.$?.["comment-count"] || "0");

        // Extract store from title
        const store = extractStoreFromTitle(item.title);

        // Handle categories - can be string or array, ensure all are strings
        const rawCategories = item.category ? (Array.isArray(item.category) ? item.category : [item.category]) : [];
        const categories = rawCategories.filter((cat) => typeof cat === "string");

        // Get image URL from ozb:meta or media:thumbnail
        const imageUrl = ozbMeta?.$?.image || item["media:thumbnail"]?.$?.url;

        return {
          id: item.guid || item.link || `deal-${index}`,
          title: he.decode(item.title),
          link: item.link,
          descriptionHtml: descriptionHtml,
          descriptionMarkdown: descriptionMarkdown,
          upvotes: upvotes,
          downvotes: downvotes,
          comments: comments,
          store: store,
          creator: item["dc:creator"] || "Anonymous",
          pubDate: new Date(item.pubDate),
          categories: categories,
          imageUrl: imageUrl,
          netVotes: upvotes - downvotes,
        };
      });
      setDeals(parsedDeals);
    } catch (error: unknown) {
      console.error("Failed to fetch OzBargain deals:", error);
      setError("Failed to load deals. Please check your internet connection or try again later.");
      showFailureToast(error, { title: "Failed to Load Deals" });
    } finally {
      setLoading(false);
    }
  }, [itemLimit]); // Dependency array: re-run if itemLimit preference changes

  // Fetch deals when the component mounts or fetchDeals callback changes
  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Filter deals based on user's search input
  const filteredDeals = deals.filter((deal) => {
    if (!searchText) return true; // If no search text, show all deals
    const lowerSearchText = searchText.toLowerCase();
    return (
      deal.title.toLowerCase().includes(lowerSearchText) ||
      deal.store.toLowerCase().includes(lowerSearchText) ||
      deal.categories.some((cat) => typeof cat === "string" && cat.toLowerCase().includes(lowerSearchText)) ||
      deal.descriptionMarkdown.toLowerCase().includes(lowerSearchText) // Search within description too
    );
  });

  // Display an error view if an error occurred
  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error" description={error} />
      </List>
    );
  }

  // Main List component for displaying deals
  return (
    <List
      isLoading={loading}
      onSearchTextChange={setSearchText} // Handle live search filtering
      searchBarPlaceholder="Filter deals by title, store, or keywords..."
      throttle // Delay search processing for better performance
    >
      <List.Section title="Latest Deals" subtitle={filteredDeals.length > 0 ? `${filteredDeals.length} found` : ""}>
        {filteredDeals.map((deal) => (
          <List.Item
            key={`${deal.id}-${deal.pubDate.getTime()}`}
            title={deal.title.split(" @ ")[0]}
            subtitle={deal.store}
            // Accessories provide additional info on the right side of the list item
            accessories={[
              {
                text: `${deal.netVotes}`,
                icon: deal.netVotes >= 0 ? Icon.ArrowUp : Icon.ArrowDown, // Up or down arrow based on net votes
              },
              {
                text: `${deal.comments}`,
                icon: Icon.SpeechBubble,
              },
              {
                text: timeAgo(deal.pubDate), // e.g., "5m ago", "2h ago"
              },
            ]}
            actions={
              <ActionPanel>
                {/* Push to the Detail view when item is selected */}
                <Action.Push title="View Deal Details" icon={Icon.Eye} target={<DealDetail deal={deal} />} />
                <Action.OpenInBrowser url={deal.link} title="Open Deal in Browser" />
                <Action.CopyToClipboard content={deal.link} title="Copy Deal Link" />
                <Action.CopyToClipboard content={deal.title} title="Copy Deal Title" />
                <Action.OpenInBrowser url={`${deal.link}#comments`} title="Open Comments" icon={Icon.SpeechBubble} />
                {deal.imageUrl && <Action.OpenInBrowser url={deal.imageUrl} title="View Image" icon={Icon.Image} />}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
