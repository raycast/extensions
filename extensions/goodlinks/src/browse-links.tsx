import { useState, useEffect } from "react";
import { List, showToast, Toast, ActionPanel, Action, open } from "@raycast/api";

interface Link {
  id: string;
  title: string;
  url: string;
  tags: string[];
  summary: string;
}

export default function Command() {
  const [links, setLinks] = useState<Link[]>([]);
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
          tags: tags.trim() ? tags.trim().split(",").map(tag => tag.trim()) : [],
          summary: summary.trim(),
        };
      });
    } catch (error) {
      console.error("Failed to parse links data:", error);
      return [];
    }
  }

  const handleOpenInBrowser = (url: string) => {
    open(url);
  };

  const handleShowSummary = (summary: string) => {
    // This will show the summary within Raycast
    showToast({
      style: Toast.Style.Success,
      title: "Article Summary",
      message: summary,
    });
  };

  return (
    <List isLoading={isLoading}>
      {links.map((link) => (
        <List.Item
          key={link.id}
          title={link.title}
          subtitle={link.url}
          accessories={link.tags.map(tag => ({
            text: tag,
            icon: { source: "dot.png", tintColor: "red" }
          }))}
          actions={
            <ActionPanel>
              <Action title="Show Summary" onAction={() => handleShowSummary(link.summary)} />
              <Action.OpenInBrowser url={link.url} shortcut={{ modifiers: ["cmd"], key: "return" }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { exec } = require("child_process");
    exec(`osascript -e '${script}'`, (error: Error, stdout: string, stderr: string) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}