/**
 * View Documentation Command
 *
 * Browse and search Convex documentation links.
 * Quick access to tutorials, guides, API references, and more.
 */

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";

interface DocLink {
  url: string;
  title: string;
  category: string;
}

const DOC_LINKS: DocLink[] = [
  {
    url: "https://docs.convex.dev/home",
    title: "Home",
    category: "home",
  },
  {
    url: "https://docs.convex.dev/tutorial/",
    title: "Tutorial: Build a chat app",
    category: "tutorial",
  },
  {
    url: "https://docs.convex.dev/quickstarts",
    title: "Quickstarts",
    category: "quickstarts",
  },
  {
    url: "https://docs.convex.dev/understanding/",
    title: "Understand Convex",
    category: "understanding",
  },
  {
    url: "https://docs.convex.dev/functions",
    title: "Functions",
    category: "functions",
  },
  {
    url: "https://docs.convex.dev/database",
    title: "Database",
    category: "database",
  },
  {
    url: "https://docs.convex.dev/realtime",
    title: "Realtime",
    category: "realtime",
  },
  {
    url: "https://docs.convex.dev/auth",
    title: "Authentication",
    category: "auth",
  },
  {
    url: "https://docs.convex.dev/scheduling",
    title: "Scheduling",
    category: "scheduling",
  },
  {
    url: "https://docs.convex.dev/file-storage",
    title: "File Storage",
    category: "file-storage",
  },
  {
    url: "https://docs.convex.dev/search",
    title: "Search",
    category: "search",
  },
  {
    url: "https://docs.convex.dev/components",
    title: "Components",
    category: "components",
  },
  {
    url: "https://docs.convex.dev/ai",
    title: "AI Code Gen",
    category: "ai",
  },
  {
    url: "https://docs.convex.dev/agents",
    title: "Agents",
    category: "agents",
  },
  {
    url: "https://docs.convex.dev/chef",
    title: "Chef",
    category: "chef",
  },
  {
    url: "https://docs.convex.dev/testing",
    title: "Testing",
    category: "testing",
  },
  {
    url: "https://docs.convex.dev/production",
    title: "Production",
    category: "production",
  },
  {
    url: "https://docs.convex.dev/self-hosting",
    title: "Self Hosting",
    category: "self-hosting",
  },
  {
    url: "https://docs.convex.dev/platform-apis",
    title: "Platform APIs",
    category: "platform-apis",
  },
  {
    url: "https://docs.convex.dev/dashboard",
    title: "Dashboard",
    category: "dashboard",
  },
  {
    url: "https://docs.convex.dev/cli",
    title: "CLI",
    category: "cli",
  },
  {
    url: "https://docs.convex.dev/api/",
    title: "Convex API",
    category: "api",
  },
  {
    url: "https://docs.convex.dev/generated-api/",
    title: "Generated Code",
    category: "generated-api",
  },
  {
    url: "https://docs.convex.dev/deployment-api",
    title: "Deployment API",
    category: "deployment-api",
  },
  {
    url: "https://docs.convex.dev/management-api",
    title: "Management API",
    category: "management-api",
  },
  {
    url: "https://docs.convex.dev/error",
    title: "Errors",
    category: "error",
  },
  {
    url: "https://docs.convex.dev/eslint",
    title: "ESLint",
    category: "eslint",
  },
];

// Client library links
const CLIENT_LINKS: DocLink[] = [
  {
    url: "https://docs.convex.dev/client/react",
    title: "React",
    category: "client",
  },
  {
    url: "https://docs.convex.dev/client/nextjs/app-router/",
    title: "Next.js",
    category: "client",
  },
  {
    url: "https://docs.convex.dev/client/tanstack/tanstack-query/",
    title: "TanStack",
    category: "client",
  },
  {
    url: "https://docs.convex.dev/client/react-native",
    title: "React Native",
    category: "client",
  },
  {
    url: "https://docs.convex.dev/client/javascript",
    title: "JavaScript",
    category: "client",
  },
  {
    url: "https://docs.convex.dev/client/vue",
    title: "Vue",
    category: "client",
  },
  {
    url: "https://docs.convex.dev/client/svelte",
    title: "Svelte",
    category: "client",
  },
  {
    url: "https://docs.convex.dev/client/python",
    title: "Python",
    category: "client",
  },
  {
    url: "https://docs.convex.dev/client/swift",
    title: "Swift",
    category: "client",
  },
  {
    url: "https://docs.convex.dev/client/android",
    title: "Android Kotlin",
    category: "client",
  },
  {
    url: "https://docs.convex.dev/client/rust",
    title: "Rust",
    category: "client",
  },
  {
    url: "https://docs.convex.dev/client/open-api",
    title: "OpenAPI",
    category: "client",
  },
];

// Quickstart links
const QUICKSTART_LINKS: DocLink[] = [
  {
    url: "https://docs.convex.dev/quickstart/react",
    title: "React",
    category: "quickstart",
  },
  {
    url: "https://docs.convex.dev/quickstart/nextjs",
    title: "Next.js",
    category: "quickstart",
  },
  {
    url: "https://docs.convex.dev/quickstart/remix",
    title: "Remix",
    category: "quickstart",
  },
  {
    url: "https://docs.convex.dev/quickstart/tanstack-start",
    title: "TanStack Start",
    category: "quickstart",
  },
  {
    url: "https://docs.convex.dev/quickstart/react-native",
    title: "React Native",
    category: "quickstart",
  },
  {
    url: "https://docs.convex.dev/quickstart/vue",
    title: "Vue",
    category: "quickstart",
  },
  {
    url: "https://docs.convex.dev/quickstart/nuxt",
    title: "Nuxt",
    category: "quickstart",
  },
  {
    url: "https://docs.convex.dev/quickstart/svelte",
    title: "Svelte",
    category: "quickstart",
  },
  {
    url: "https://docs.convex.dev/quickstart/nodejs",
    title: "Node.js",
    category: "quickstart",
  },
  {
    url: "https://docs.convex.dev/quickstart/bun",
    title: "Bun",
    category: "quickstart",
  },
  {
    url: "https://docs.convex.dev/quickstart/script-tag",
    title: "Script tag",
    category: "quickstart",
  },
  {
    url: "https://docs.convex.dev/quickstart/python",
    title: "Python",
    category: "quickstart",
  },
  {
    url: "https://docs.convex.dev/quickstart/swift",
    title: "iOS Swift",
    category: "quickstart",
  },
  {
    url: "https://docs.convex.dev/quickstart/android",
    title: "Android Kotlin",
    category: "quickstart",
  },
  {
    url: "https://docs.convex.dev/quickstart/rust",
    title: "Rust",
    category: "quickstart",
  },
];

export default function ViewDocumentationCommand() {
  const [searchText, setSearchText] = useState("");

  // Combine all links
  const allLinks = [...DOC_LINKS, ...CLIENT_LINKS, ...QUICKSTART_LINKS];

  // Filter links based on search
  const filteredLinks = allLinks.filter((link) => {
    const search = searchText.toLowerCase();
    return (
      link.title.toLowerCase().includes(search) ||
      link.category.toLowerCase().includes(search) ||
      link.url.toLowerCase().includes(search)
    );
  });

  // Group links by category
  const groupedLinks = filteredLinks.reduce(
    (acc, link) => {
      const category = getCategoryLabel(link.category);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(link);
      return acc;
    },
    {} as Record<string, DocLink[]>,
  );

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Convex documentation..."
      navigationTitle="View Documentation"
    >
      {Object.entries(groupedLinks).map(([category, links]) => (
        <List.Section
          key={category}
          title={category}
          subtitle={`${links.length} links`}
        >
          {links.map((link) => (
            <List.Item
              key={link.url}
              title={link.title}
              subtitle={link.url}
              icon={getCategoryIcon(link.category)}
              accessories={[
                {
                  tag: link.category,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={link.url}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={link.url}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Title"
                    content={link.title}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {filteredLinks.length === 0 && (
        <List.EmptyView
          title="No Documentation Found"
          description={`No results for "${searchText}"`}
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}

function getCategoryLabel(category: string): string {
  const categoryMap: Record<string, string> = {
    home: "Getting Started",
    tutorial: "Tutorial",
    quickstarts: "Quickstarts",
    quickstart: "Quickstarts",
    understanding: "Core Concepts",
    functions: "Features",
    database: "Features",
    realtime: "Features",
    auth: "Features",
    scheduling: "Features",
    "file-storage": "Features",
    search: "Features",
    components: "Features",
    ai: "Features",
    agents: "Features",
    chef: "Tools",
    testing: "Development",
    production: "Deployment",
    "self-hosting": "Deployment",
    "platform-apis": "Platform",
    client: "Client Libraries",
    dashboard: "Tools",
    cli: "Tools",
    api: "API Reference",
    "generated-api": "API Reference",
    "deployment-api": "API Reference",
    "management-api": "API Reference",
    error: "Reference",
    eslint: "Tools",
  };

  return categoryMap[category] || "Other";
}

function getCategoryIcon(category: string): Icon {
  const iconMap: Record<string, Icon> = {
    home: Icon.House,
    tutorial: Icon.Book,
    quickstarts: Icon.Rocket,
    quickstart: Icon.Rocket,
    understanding: Icon.LightBulb,
    functions: Icon.Code,
    database: Icon.HardDrive,
    realtime: Icon.Signal3,
    auth: Icon.Lock,
    scheduling: Icon.Clock,
    "file-storage": Icon.Folder,
    search: Icon.MagnifyingGlass,
    components: Icon.Box,
    ai: Icon.Stars,
    agents: Icon.SpeechBubble,
    chef: Icon.Terminal,
    testing: Icon.Checkmark,
    production: Icon.Cloud,
    "self-hosting": Icon.HardDrive,
    "platform-apis": Icon.Plug,
    client: Icon.Desktop,
    dashboard: Icon.AppWindow,
    cli: Icon.Terminal,
    api: Icon.Code,
    "generated-api": Icon.Code,
    "deployment-api": Icon.Code,
    "management-api": Icon.Code,
    error: Icon.ExclamationMark,
    eslint: Icon.Warning,
  };

  return iconMap[category] || Icon.Document;
}
