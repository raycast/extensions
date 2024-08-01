import { useState, useEffect } from "react";
import { List, Detail, showToast, Toast, ActionPanel, Action, open } from "@raycast/api";
import { exec } from "child_process";

// Interface for Link data structure
interface Link {
  id: string;
  title: string;
  url: string;
  tags: string[];
  summary: string;
}

// Main function for the Raycast extension
export default function Command() {
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchLinks() {
      try {
        const linksData = await runAppleScript(`
          tell application "GoodLinks"
            set allLinks to every link
            set output to ""
            repeat with aLink in allLinks
              set output to output & id of aLink & "||" & title of aLink & "||" & url of aLink & "||" & tag names of aLink & "||" & summary of aLink & "\\n"
            end repeat
            return output
          end tell
        `);
        setLinks(parseLinks(linksData));
      } catch (error) {
        console.error("Error fetching links:", error);
        showToast(Toast.Style.Failure, "Failed to fetch links");
      } finally {
        setIsLoading(false);
      }
    }
    fetchLinks();
  }, []);

  function parseLinks(linksData: string): Link[] {
    try {
      const linkRecords = linksData.trim().split("\n");
      return linkRecords.map((record) => {
        const [id, title, url, tags, summary] = record.split("||");
        return {
          id: id.trim(),
          title: title.trim(),
          url: url.trim(),
          tags: tags.trim() ? tags.trim().split(",") : [],
          summary: summary.trim(),
        };
      });
    } catch (error) {
      console.error("Failed to parse links data:", error);
      return [];
    }
  }

  const handleSelect = (linkId: string | null) => {
    if (linkId === null) {
      setSelectedLink(null);
    } else {
      const link = links.find((l) => l.id === linkId) || null;
      setSelectedLink(link);
    }
  };

  const handleOpenInBrowser = (url: string) => {
    open(url);
  };

  const renderListView = () => (
    <List isLoading={isLoading} onSelectionChange={(id) => handleSelect(id)}>
      {links.map((link) => (
        <List.Item
          key={link.id}
          id={link.id}
          title={link.title}
          subtitle={link.tags.join(", ")}
          actions={
            <ActionPanel>
              <Action title="Open in Browser" onAction={() => handleOpenInBrowser(link.url)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );

  const renderDetailView = () => {
    if (!selectedLink) return null;

    return (
      <Detail
        markdown={`# ${selectedLink.title}\n\n${selectedLink.summary}`}
        actions={
          <ActionPanel>
            <Action title="Open in Browser" onAction={() => handleOpenInBrowser(selectedLink.url)} />
          </ActionPanel>
        }
      />
    );
  };

  return selectedLink ? renderDetailView() : renderListView();
}

// Function to run AppleScript commands
async function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`osascript -e '${script}'`, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}
