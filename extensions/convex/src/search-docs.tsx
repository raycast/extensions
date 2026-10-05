/**
 * Search Docs Command
 *
 * Search and browse Convex documentation.
 * Clean interface with section headers and Convex branding.
 */

import { Action, ActionPanel, Image, List } from "@raycast/api";
import { useState } from "react";

interface DocLink {
  url: string;
  title: string;
}

interface DocSection {
  title: string;
  links: DocLink[];
}

const DOC_SECTIONS: DocSection[] = [
  {
    title: "Docs",
    links: [
      { url: "https://docs.convex.dev/home", title: "Home" },
      { url: "https://docs.convex.dev/tutorial/", title: "Tutorial" },
      { url: "https://docs.convex.dev/quickstarts", title: "Quickstarts" },
      {
        url: "https://docs.convex.dev/understanding/",
        title: "Understand Convex",
      },
    ],
  },
  {
    title: "Features",
    links: [
      { url: "https://docs.convex.dev/functions", title: "Functions" },
      { url: "https://docs.convex.dev/database", title: "Database" },
      { url: "https://docs.convex.dev/realtime", title: "Realtime" },
      { url: "https://docs.convex.dev/auth", title: "Authentication" },
      { url: "https://docs.convex.dev/scheduling", title: "Scheduling" },
      { url: "https://docs.convex.dev/file-storage", title: "File Storage" },
      { url: "https://docs.convex.dev/search", title: "Search" },
      { url: "https://docs.convex.dev/components", title: "Components" },
    ],
  },
  {
    title: "AI",
    links: [
      { url: "https://docs.convex.dev/ai", title: "AI Code Gen" },
      { url: "https://docs.convex.dev/agents", title: "Agents" },
      { url: "https://docs.convex.dev/chef", title: "Chef" },
    ],
  },
  {
    title: "Guides",
    links: [
      { url: "https://docs.convex.dev/cli", title: "CLI" },
      { url: "https://docs.convex.dev/testing", title: "Testing" },
      { url: "https://docs.convex.dev/production", title: "Production" },
      { url: "https://docs.convex.dev/self-hosting", title: "Self Hosting" },
      { url: "https://docs.convex.dev/dashboard", title: "Dashboard" },
    ],
  },
  {
    title: "Client Libraries",
    links: [
      { url: "https://docs.convex.dev/client/react", title: "React" },
      {
        url: "https://docs.convex.dev/client/nextjs/app-router/",
        title: "Next.js",
      },
      {
        url: "https://docs.convex.dev/client/tanstack/tanstack-query/",
        title: "TanStack",
      },
      {
        url: "https://docs.convex.dev/client/react-native",
        title: "React Native",
      },
      { url: "https://docs.convex.dev/client/javascript", title: "JavaScript" },
      { url: "https://docs.convex.dev/client/vue", title: "Vue" },
      { url: "https://docs.convex.dev/client/svelte", title: "Svelte" },
      { url: "https://docs.convex.dev/client/python", title: "Python" },
      { url: "https://docs.convex.dev/client/swift", title: "Swift" },
      {
        url: "https://docs.convex.dev/client/android",
        title: "Android Kotlin",
      },
      { url: "https://docs.convex.dev/client/rust", title: "Rust" },
    ],
  },
  {
    title: "Quickstarts",
    links: [
      { url: "https://docs.convex.dev/quickstart/react", title: "React" },
      { url: "https://docs.convex.dev/quickstart/nextjs", title: "Next.js" },
      { url: "https://docs.convex.dev/quickstart/remix", title: "Remix" },
      {
        url: "https://docs.convex.dev/quickstart/tanstack-start",
        title: "TanStack Start",
      },
      {
        url: "https://docs.convex.dev/quickstart/react-native",
        title: "React Native",
      },
      { url: "https://docs.convex.dev/quickstart/vue", title: "Vue" },
      { url: "https://docs.convex.dev/quickstart/nuxt", title: "Nuxt" },
      { url: "https://docs.convex.dev/quickstart/svelte", title: "Svelte" },
      { url: "https://docs.convex.dev/quickstart/nodejs", title: "Node.js" },
      { url: "https://docs.convex.dev/quickstart/bun", title: "Bun" },
      { url: "https://docs.convex.dev/quickstart/python", title: "Python" },
    ],
  },
  {
    title: "API Reference",
    links: [
      { url: "https://docs.convex.dev/api/", title: "Convex API" },
      {
        url: "https://docs.convex.dev/generated-api/",
        title: "Generated Code",
      },
      {
        url: "https://docs.convex.dev/deployment-api",
        title: "Deployment API",
      },
      {
        url: "https://docs.convex.dev/management-api",
        title: "Management API",
      },
      { url: "https://docs.convex.dev/platform-apis", title: "Platform APIs" },
    ],
  },
  {
    title: "Support",
    links: [
      { url: "https://docs.convex.dev/error", title: "Errors" },
      { url: "https://docs.convex.dev/eslint", title: "ESLint" },
      { url: "https://status.convex.dev", title: "Status Page" },
      { url: "https://discord.gg/convex", title: "Discord Community" },
    ],
  },
];

// Convex icon for all items
const CONVEX_ICON: Image.ImageLike = {
  source: "command-icon.png",
};

export default function SearchDocsCommand() {
  const [searchText, setSearchText] = useState("");

  // Flatten all links for search
  const allLinks = DOC_SECTIONS.flatMap((section) =>
    section.links.map((link) => ({ ...link, section: section.title })),
  );

  // Filter based on search
  const filteredLinks = searchText
    ? allLinks.filter(
        (link) =>
          link.title.toLowerCase().includes(searchText.toLowerCase()) ||
          link.section.toLowerCase().includes(searchText.toLowerCase()),
      )
    : null;

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Convex documentation..."
      navigationTitle="Search Docs"
    >
      {filteredLinks ? (
        // Show flat filtered results when searching
        <List.Section
          title="Search Results"
          subtitle={`${filteredLinks.length} results`}
        >
          {filteredLinks.map((link) => (
            <List.Item
              key={link.url}
              title={link.title}
              icon={CONVEX_ICON}
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
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        // Show grouped sections when not searching
        DOC_SECTIONS.map((section) => (
          <List.Section key={section.title} title={section.title}>
            {section.links.map((link) => (
              <List.Item
                key={link.url}
                title={link.title}
                icon={CONVEX_ICON}
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
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}

      {filteredLinks && filteredLinks.length === 0 && (
        <List.EmptyView
          title="No Documentation Found"
          description={`No results for "${searchText}"`}
          icon={CONVEX_ICON}
        />
      )}
    </List>
  );
}
