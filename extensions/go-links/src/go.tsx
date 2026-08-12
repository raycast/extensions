import { useEffect, useMemo, useState } from "react";
import { ActionPanel, Action, List, Icon, showToast, Toast } from "@raycast/api";

interface GoLink {
  Short: string;
  Long: string;
  Created: string;
  LastEdit: string;
  Owner: string;
  Clicks: number;
}

export default function GoLinksCommand() {
  const [searchText, setSearchText] = useState("");
  const [goLinks, setGoLinks] = useState<GoLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchGoLinks() {
      try {
        const response = await fetch("http://go/.export");
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const textData = await response.text();
        const lines = textData.split(/\r?\n/).filter((line) => line.trim().length > 0);

        const parsedLinks: GoLink[] = lines.map((line) => JSON.parse(line) as GoLink);
        setGoLinks(parsedLinks);
      } catch (error) {
        console.error(error);
        await showToast(Toast.Style.Failure, "Failed to fetch goLinks", "Make sure you're connected to Tailscale");
      } finally {
        setIsLoading(false);
      }
    }

    fetchGoLinks();
  }, []);

  // Memoize the filtered & sorted array to avoid unnecessary recalculations
  const filteredLinks = useMemo(() => {
    const query = searchText.toLowerCase();

    return goLinks
      .map((link) => {
        let score = 0;
        if (link.Short.toLowerCase().includes(query)) {
          score += 2; // prioritize Short matches
        }
        if (link.Long.toLowerCase().includes(query)) {
          score += 1;
        }
        return { link, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score) // higher score => earlier in the list
      .map((item) => item.link);
  }, [goLinks, searchText]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search goLinks...">
      {filteredLinks.map((link) => (
        <List.Item
          key={link.Short}
          icon={Icon.Link}
          title={`go/${link.Short}`}
          subtitle={link.Long}
          accessories={link.Clicks != null ? [{ text: `${link.Clicks} clicks` }] : []}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={link.Long} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
