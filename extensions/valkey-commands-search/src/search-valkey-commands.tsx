import fetch from "node-fetch";
if (!globalThis.fetch) {
  globalThis.fetch = fetch as unknown as typeof globalThis.fetch;
}

import { List, ActionPanel, Action, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import * as cheerio from "cheerio";

interface Command {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
}

const CACHE_KEY = "valkey-commands";
const CACHE_TIMESTAMP_KEY = "valkey-commands-timestamp";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Fetch and parse commands from the Valkey commands page.
async function fetchValkeyCommands(): Promise<Command[]> {
  try {
    const response = await fetch("https://valkey.io/commands/");
    const html = await response.text();
    const $ = cheerio.load(html);
    const commands: Command[] = [];

    // Loop through each command group.
    $(".command-group").each((_, groupEl) => {
      const group = $(groupEl);
      const groupName = group.find("h2").first().text().trim();

      // For each command entry inside this group:
      group.find(".command-entry").each((_, entryEl) => {
        const entry = $(entryEl);
        // Find the <code> element that contains an <a> with the command name and link.
        const a = entry.find("code a");
        const name = a.text().trim();
        const href = a.attr("href");
        if (name && href) {
          // Get the description by cloning the element, removing the <code> children, and then extracting the remaining text.
          let description = entry.clone().children("code").remove().end().text().trim();
          // Remove wrapping double quotes if present.
          if (description.startsWith('"') && description.endsWith('"')) {
            description = description.substring(1, description.length - 1);
          }
          description = description.replace(/\s+/g, " ").trim();

          commands.push({
            id: name,
            name,
            description,
            url: href, // Use the absolute URL as provided.
            category: groupName,
          });
        }
      });
    });

    if (commands.length === 0) {
      showFailureToast("The page structure might have changed.", { title: "No commands found" });
    }
    return commands;
  } catch (error) {
    if (error instanceof Error) {
      showFailureToast(error, { title: "Failed to fetch commands" });
    }
    return [];
  }
}

// Retrieves commands from cache or fetches fresh data if needed.
async function getCommands(forceRefresh: boolean = false): Promise<Command[]> {
  const cachedData = await LocalStorage.getItem<string>(CACHE_KEY);
  const cachedTimestamp = await LocalStorage.getItem<number>(CACHE_TIMESTAMP_KEY);
  const now = Date.now();

  if (!forceRefresh && cachedData && cachedTimestamp && now - cachedTimestamp < ONE_DAY_MS) {
    try {
      const commands = JSON.parse(cachedData) as Command[];
      return commands;
    } catch {
      // Fall back to fetching new data if parsing fails.
    }
  }

  const commands = await fetchValkeyCommands();
  if (commands.length > 0) {
    await LocalStorage.setItem(CACHE_KEY, JSON.stringify(commands));
    await LocalStorage.setItem(CACHE_TIMESTAMP_KEY, now);
  }

  return commands;
}

export default function CommandSearch() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function loadCommands(forceRefresh: boolean = false) {
    setIsLoading(true);
    const cmds = await getCommands(forceRefresh);
    setCommands(cmds);
    setIsLoading(false);
  }

  useEffect(() => {
    loadCommands();
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Valkey commands..."
      actions={
        <ActionPanel>
          <Action title="Refresh Commands" onAction={() => loadCommands(true)} />
        </ActionPanel>
      }
    >
      {commands.map((command) => (
        <List.Item
          key={command.id}
          title={command.name}
          subtitle={command.description}
          accessories={[{ text: command.category }]}
          keywords={[command.category]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={command.url} title="Open in Browser" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
