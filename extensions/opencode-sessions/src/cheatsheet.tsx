import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { CheatsheetItem } from "./types";

const CHEATSHEET_DATA: CheatsheetItem[] = [
  // TUI
  { command: "/connect", description: "Add a provider to OpenCode", category: "TUI" },
  { command: "/compact", description: "Compact the current session (Alias: /summarize)", category: "TUI" },
  { command: "/details", description: "Toggle tool execution details", category: "TUI" },
  { command: "/editor", description: "Open external editor for composing messages", category: "TUI" },
  { command: "/exit", description: "Exit OpenCode (Aliases: /quit, /q)", category: "TUI" },
  { command: "/export", description: "Export current conversation to Markdown", category: "TUI" },
  { command: "/help", description: "Show the help dialog", category: "TUI" },
  { command: "/init", description: "Create or update AGENTS.md file", category: "TUI" },
  { command: "/models", description: "List available models", category: "TUI" },
  { command: "/new", description: "Start a new session (Alias: /clear)", category: "TUI" },
  { command: "/redo", description: "Redo a previously undone message", category: "TUI" },
  {
    command: "/sessions",
    description: "List and switch between sessions (Aliases: /resume, /continue)",
    category: "TUI",
  },
  { command: "/share", description: "Share current session", category: "TUI" },
  { command: "/theme", description: "List available themes", category: "TUI" },
  { command: "/thinking", description: "Toggle visibility of thinking/reasoning blocks", category: "TUI" },
  { command: "/undo", description: "Undo last message in the conversation", category: "TUI" },
  { command: "/unshare", description: "Unshare current session", category: "TUI" },

  // CLI
  { command: "opencode agent list", description: "List all available agents", category: "CLI" },
  { command: "opencode agent create", description: "Create a new agent with custom configuration", category: "CLI" },
  { command: "opencode auth login", description: "Configure API keys for providers", category: "CLI" },
  { command: "opencode auth list", description: "List authenticated providers", category: "CLI" },
  { command: "opencode models", description: "List all available models", category: "CLI" },
  { command: "opencode run [prompt]", description: "Run opencode in non-interactive mode", category: "CLI" },
  { command: "opencode serve", description: "Start a headless OpenCode server for API access", category: "CLI" },
  { command: "opencode session list", description: "List all OpenCode sessions", category: "CLI" },
  { command: "opencode stats", description: "Show token usage and cost statistics", category: "CLI" },
  { command: "opencode web", description: "Start a headless OpenCode server with a web interface", category: "CLI" },

  // Web
  { command: "opencode web --port [port]", description: "Specify a port for the web server", category: "Web" },
  {
    command: "opencode web --hostname [host]",
    description: "Make OpenCode accessible on your network (e.g., 0.0.0.0)",
    category: "Web",
  },
  { command: "opencode web --mdns", description: "Enable mDNS discovery for the local network", category: "Web" },
];

export default function Command() {
  const [filter, setFilter] = useState<string>("all");

  const filteredItems = CHEATSHEET_DATA.filter((item) => {
    if (filter === "all") return true;
    return item.category.toLowerCase() === filter.toLowerCase();
  });

  return (
    <List
      searchBarPlaceholder="Search usage cheatsheet..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Category" storeValue={true} onChange={setFilter}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="TUI" value="tui" />
          <List.Dropdown.Item title="CLI" value="cli" />
          <List.Dropdown.Item title="Web" value="web" />
        </List.Dropdown>
      }
    >
      <List.Section title={filter === "all" ? "Usage Cheatsheet" : `${filter.toUpperCase()} Commands`}>
        {filteredItems.map((item, index) => (
          <List.Item
            key={index}
            title={item.command}
            subtitle={item.description}
            accessories={[{ text: item.category, icon: getCategoryIcon(item.category) }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy Command" content={item.command} />
                  <Action.Paste
                    title="Paste in Active App"
                    content={item.command}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "TUI":
      return Icon.Terminal;
    case "CLI":
      return Icon.CommandSymbol;
    case "Web":
      return Icon.Globe;
    default:
      return Icon.List;
  }
}
