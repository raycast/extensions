import { ActionPanel, List, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import Parser from "rss-parser";

// Define the structure of an RSS item
interface NRKItem {
  title: string;
  link: string;
  contentSnippet?: string;
  isoDate?: string;
  enclosure?: { url: string };
  categories?: string[];
  creator?: string;
  mediaContent?: {
    $: {
      url: string;
    };
  };
  "dc:creator"?: string; // Added to fix type issue
  "media:content"?: {
    $: {
      url: string;
      medium?: string;
      type?: string;
    };
  };
}

// Function to extract the image URL
function getImageUrl(item: NRKItem): string | undefined {
  const mediaContent = item["media:content"];
  if (mediaContent && mediaContent.$ && mediaContent.$.url) {
    return mediaContent.$.url;
  }

  if (item.enclosure?.url) {
    return item.enclosure.url;
  }

  return undefined; // No image found
}

// Convert GMT date from RSS feed to local time in "hh:mm | dd/mm" format
function formatDateToLocal(isoDate?: string): string {
  if (!isoDate) return "Unknown";
  const date = new Date(isoDate);

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${hours}:${minutes} | ${day}/${month}`;
}

// Main command to display the list of NRK news with a detail view
export default function Command() {
  const [newsItems, setNewsItems] = useState<NRKItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      const parser = new Parser({
        customFields: {
          item: ["media:content", "dc:creator"],
        },
      });

      try {
        const feed = await parser.parseURL("https://www.nrk.no/toppsaker.rss");
        const items = feed.items.slice(0, 20) as NRKItem[];
        setNewsItems(items);
      } catch (error) {
        console.error("Failed to fetch NRK news:", error);
        showToast({ style: Toast.Style.Failure, title: "Failed to fetch NRK news" });
      } finally {
        setIsLoading(false);
      }
    }

    fetchNews();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search NRK news..." isShowingDetail>
      {newsItems.map((item) => (
        <List.Item
          key={item.link}
          id={item.link} // Unique ID for selection
          title={item.title}
          detail={<NewsDetail item={item} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Browser" url={item.link} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Detail view for a selected news article using List.Item.Detail
function NewsDetail({ item }: { item: NRKItem }) {
  const imageUrl = getImageUrl(item);
  const author = item["dc:creator"] || "Unknown Author"; // Moved inside the function to fix the error
  const categories = item.categories?.join(" | ") || "No categories";

  const markdown = `${
    imageUrl
      ? `<img src="${imageUrl}" alt="Article Image" style="width: 100%; max-height: 200px; object-fit: cover;" />\n\n`
      : ""
  }## ${item.title}

${item.contentSnippet || "No summary available."}


---

**Author:** ${author}  
**Published:** ${formatDateToLocal(item.isoDate)}  
**Categories:** ${categories}  
`;

  return <List.Item.Detail markdown={markdown.trim()} />;
}
