/**
 * View Convex Components Command
 *
 * Browse and install Convex components - independent, modular,
 * TypeScript building blocks for your backend.
 */

import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";

interface Component {
  name: string;
  package: string;
  description: string;
  category: string;
  url: string;
  downloads: string;
  author: string;
}

const COMPONENTS: Component[] = [
  // AI Category
  {
    name: "AI Agent",
    package: "@convex-dev/agent",
    description:
      "Agents organize your AI workflows into units, with message history and vector search built in.",
    category: "AI",
    url: "https://www.convex.dev/components/agent",
    downloads: "10,813",
    author: "get-convex",
  },
  {
    name: "RAG",
    package: "@convex-dev/rag",
    description:
      "Retrieval-Augmented Generation (RAG) for use with your AI products and Agents",
    category: "AI",
    url: "https://www.convex.dev/components/rag",
    downloads: "4,680",
    author: "get-convex",
  },
  {
    name: "Persistent Text Streaming",
    package: "@convex-dev/persistent-text-streaming",
    description:
      "Stream text like AI chat to the browser in real-time while also efficiently storing it to the database.",
    category: "AI",
    url: "https://www.convex.dev/components/persistent-text-streaming",
    downloads: "2,532",
    author: "get-convex",
  },
  {
    name: "Neutral Cost",
    package: "@neutralbase/neutralcost",
    description:
      "Organizes all of your costs into one place. Seamlessly track your AI usage and Tool costs and charge accordingly.",
    category: "AI",
    url: "https://www.convex.dev/components/neutralcost",
    downloads: "81",
    author: "neutralbase",
  },
  // Backend Category
  {
    name: "Rate Limiter",
    package: "@convex-dev/rate-limiter",
    description:
      "Define and use application-layer rate limits. Type-safe, transactional, fair, safe, and configurable sharding to scale.",
    category: "Backend",
    url: "https://www.convex.dev/components/rate-limiter",
    downloads: "15,387",
    author: "get-convex",
  },
  {
    name: "Presence",
    package: "@convex-dev/presence",
    description: "Track user presence in real-time.",
    category: "Backend",
    url: "https://www.convex.dev/components/presence",
    downloads: "5,342",
    author: "get-convex",
  },
  {
    name: "Action Cache",
    package: "@convex-dev/action-cache",
    description:
      "Cache action results, like expensive AI calls, with optional expiration times.",
    category: "Backend",
    url: "https://www.convex.dev/components/action-cache",
    downloads: "3,886",
    author: "get-convex",
  },
  // Database Category
  {
    name: "Migrations",
    package: "@convex-dev/migrations",
    description: "Framework for long running data migrations of live data.",
    category: "Database",
    url: "https://www.convex.dev/components/migrations",
    downloads: "12,602",
    author: "get-convex",
  },
  {
    name: "Aggregate",
    package: "@convex-dev/aggregate",
    description:
      "Keep track of sums and counts in a denormalized and scalable way.",
    category: "Database",
    url: "https://www.convex.dev/components/aggregate",
    downloads: "5,727",
    author: "get-convex",
  },
  {
    name: "Sharded Counter",
    package: "@convex-dev/sharded-counter",
    description:
      "Scalable counter that can increment and decrement with high throughput.",
    category: "Database",
    url: "https://www.convex.dev/components/sharded-counter",
    downloads: "2,033",
    author: "get-convex",
  },
  {
    name: "Geospatial",
    package: "@convex-dev/geospatial",
    description:
      "Efficiently query points on a map within a selected region of the globe.",
    category: "Database",
    url: "https://www.convex.dev/components/geospatial",
    downloads: "789",
    author: "get-convex",
  },
  // Durable Functions Category
  {
    name: "Workpool",
    package: "@convex-dev/workpool",
    description:
      "Workpools give critical tasks priority by organizing async operations into separate, customizable queues.",
    category: "Durable Functions",
    url: "https://www.convex.dev/components/workpool",
    downloads: "21,581",
    author: "get-convex",
  },
  {
    name: "Workflow",
    package: "@convex-dev/workflow",
    description:
      "Simplify programming long running code flows. Workflows execute durably with configurable retries and delays.",
    category: "Durable Functions",
    url: "https://www.convex.dev/components/workflow",
    downloads: "9,958",
    author: "get-convex",
  },
  {
    name: "Action Retrier",
    package: "@convex-dev/retrier",
    description:
      "Add reliability to an unreliable external service. Retry idempotent calls a set number of times.",
    category: "Durable Functions",
    url: "https://www.convex.dev/components/retrier",
    downloads: "8,755",
    author: "get-convex",
  },
  {
    name: "Crons",
    package: "@convex-dev/crons",
    description: "Use cronspec to run functions on a repeated schedule.",
    category: "Durable Functions",
    url: "https://www.convex.dev/components/crons",
    downloads: "3,788",
    author: "get-convex",
  },
  // Integrations Category
  {
    name: "Resend",
    package: "@convex-dev/resend",
    description:
      "Send reliable transactional emails to your users with Resend.",
    category: "Integrations",
    url: "https://www.convex.dev/components/resend",
    downloads: "10,400",
    author: "get-convex",
  },
  {
    name: "Cloudflare R2",
    package: "@convex-dev/cloudflare-r2",
    description: "Store and serve files from Cloudflare R2.",
    category: "Integrations",
    url: "https://www.convex.dev/components/cloudflare-r2",
    downloads: "5,462",
    author: "get-convex",
  },
  {
    name: "Collaborative Text Editor Sync",
    package: "@convex-dev/prosemirror-sync",
    description:
      "Add a collaborative editor sync engine for the popular ProseMirror-based Tiptap and BlockNote rich text editors.",
    category: "Integrations",
    url: "https://www.convex.dev/components/prosemirror-sync",
    downloads: "2,278",
    author: "get-convex",
  },
  {
    name: "Expo Push Notifications",
    package: "@convex-dev/push-notifications",
    description:
      "Send push notifications with Expo. Manage retries and batching.",
    category: "Integrations",
    url: "https://www.convex.dev/components/push-notifications",
    downloads: "2,062",
    author: "get-convex",
  },
  {
    name: "WorkOS AuthKit",
    package: "@convex-dev/workos-authkit",
    description:
      "Integrate with AuthKit events and actions, and keep auth data synced in your Convex database.",
    category: "Integrations",
    url: "https://www.convex.dev/components/workos-authkit",
    downloads: "1,458",
    author: "get-convex",
  },
  {
    name: "Twilio SMS",
    package: "@convex-dev/twilio",
    description:
      "Easily send and receive SMS via Twilio. Easily query message status from your query function.",
    category: "Integrations",
    url: "https://www.convex.dev/components/twilio",
    downloads: "1,228",
    author: "get-convex",
  },
  {
    name: "LaunchDarkly Feature Flags",
    package: "@convex-dev/launchdarkly",
    description:
      "Sync your LaunchDarkly feature flags with your Convex backend for use in your Convex functions.",
    category: "Integrations",
    url: "https://www.convex.dev/components/launchdarkly",
    downloads: "392",
    author: "get-convex",
  },
  {
    name: "OSS Stats",
    package: "@erquhart/oss-stats",
    description:
      "Keep GitHub and npm data for your open source projects synced to your Convex database.",
    category: "Integrations",
    url: "https://www.convex.dev/components/oss-stats",
    downloads: "142",
    author: "erquhart",
  },
  {
    name: "Better Auth",
    package: "@convex-dev/better-auth",
    description:
      "Provides an integration layer for using Better Auth with Convex.",
    category: "Integrations",
    url: "https://www.convex.dev/components/better-auth",
    downloads: "N/A",
    author: "get-convex",
  },
  // Payments Category
  {
    name: "Stripe",
    package: "@convex-dev/stripe",
    description:
      "A Convex component for integrating Stripe payments, subscriptions, and billing into your Convex application.",
    category: "Payments",
    url: "https://www.convex.dev/components/stripe",
    downloads: "2,186",
    author: "get-convex",
  },
  {
    name: "Autumn",
    package: "@useautumn/autumn",
    description: "Autumn is your application's pricing and billing database.",
    category: "Payments",
    url: "https://www.convex.dev/components/autumn",
    downloads: "1,972",
    author: "useautumn",
  },
  {
    name: "Polar",
    package: "@convex-dev/polar",
    description: "Add subscriptions and billing to your Convex app with Polar.",
    category: "Payments",
    url: "https://www.convex.dev/components/polar",
    downloads: "1,727",
    author: "get-convex",
  },
  {
    name: "Dodo Payments",
    package: "@dodopayments/dodopayments",
    description:
      "Dodo Payments is your complete solution for billing and payments, purpose-built for AI and SaaS applications.",
    category: "Payments",
    url: "https://www.convex.dev/components/dodopayments",
    downloads: "108",
    author: "dodopayments",
  },
];

export default function ViewComponentsCommand() {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Get unique categories
  const categories = ["all", ...new Set(COMPONENTS.map((c) => c.category))];

  // Filter components
  const filteredComponents = COMPONENTS.filter((component) => {
    const matchesCategory =
      selectedCategory === "all" || component.category === selectedCategory;
    const matchesSearch =
      searchText === "" ||
      component.name.toLowerCase().includes(searchText.toLowerCase()) ||
      component.description.toLowerCase().includes(searchText.toLowerCase()) ||
      component.package.toLowerCase().includes(searchText.toLowerCase()) ||
      component.category.toLowerCase().includes(searchText.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Group by category for display
  const groupedComponents = filteredComponents.reduce(
    (acc, component) => {
      if (!acc[component.category]) {
        acc[component.category] = [];
      }
      acc[component.category].push(component);
      return acc;
    },
    {} as Record<string, Component[]>,
  );

  // Sort categories
  const sortedCategories = Object.keys(groupedComponents).sort();

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search components..."
      navigationTitle="View Convex Components"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by category"
          value={selectedCategory}
          onChange={setSelectedCategory}
        >
          <List.Dropdown.Item title="All Categories" value="all" />
          <List.Dropdown.Section>
            {categories
              .filter((cat) => cat !== "all")
              .map((category) => (
                <List.Dropdown.Item
                  key={category}
                  title={`${category} (${COMPONENTS.filter((c) => c.category === category).length})`}
                  value={category}
                />
              ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {sortedCategories.map((category) => (
        <List.Section
          key={category}
          title={category}
          subtitle={`${groupedComponents[category].length} component${groupedComponents[category].length !== 1 ? "s" : ""}`}
        >
          {groupedComponents[category].map((component) => (
            <List.Item
              key={component.package}
              title={component.name}
              subtitle={component.description}
              icon={getCategoryIcon(component.category)}
              accessories={[
                {
                  text: formatDownloads(component.downloads),
                  tooltip: `${component.downloads} weekly downloads`,
                },
                {
                  tag: {
                    value: component.category,
                    color: getCategoryColor(component.category),
                  },
                },
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Package"
                        text={component.package}
                        icon={Icon.Box}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Install Command"
                        text={`npm i ${component.package}`}
                        icon={Icon.Download}
                      />

                      <List.Item.Detail.Metadata.Separator />

                      <List.Item.Detail.Metadata.Label
                        title="Category"
                        text={component.category}
                        icon={getCategoryIcon(component.category)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Weekly Downloads"
                        text={component.downloads}
                        icon={Icon.BarChart}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Author"
                        text={component.author}
                        icon={Icon.Person}
                      />

                      <List.Item.Detail.Metadata.Separator />

                      <List.Item.Detail.Metadata.Label
                        title="Description"
                        text={component.description}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      title="View Documentation"
                      url={component.url}
                      icon={Icon.Book}
                    />
                    <Action.CopyToClipboard
                      title="Copy Install Command"
                      content={`npm i ${component.package}`}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Package Name"
                      content={component.package}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      title="View on npm"
                      url={`https://www.npmjs.com/package/${component.package}`}
                      icon={Icon.Link}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                    <Action.OpenInBrowser
                      title="Browse All Components"
                      url="https://www.convex.dev/components"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {filteredComponents.length === 0 && (
        <List.EmptyView
          title="No Components Found"
          description={
            searchText
              ? `No results for "${searchText}"`
              : "No components in this category"
          }
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}

function getCategoryIcon(category: string): Icon {
  const iconMap: Record<string, Icon> = {
    AI: Icon.Stars,
    Backend: Icon.Code,
    Database: Icon.HardDrive,
    "Durable Functions": Icon.Clock,
    Integrations: Icon.Plug,
    Payments: Icon.Wallet,
  };

  return iconMap[category] || Icon.Box;
}

function getCategoryColor(category: string): Color {
  const colorMap: Record<string, Color> = {
    AI: Color.Purple,
    Backend: Color.Blue,
    Database: Color.Green,
    "Durable Functions": Color.Orange,
    Integrations: Color.Yellow,
    Payments: Color.Magenta,
  };

  return colorMap[category] || Color.SecondaryText;
}

function formatDownloads(downloads: string): string {
  if (downloads === "N/A") return "N/A";

  // Remove commas and parse
  const num = parseInt(downloads.replace(/,/g, ""));

  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k/wk`;
  }

  return `${num}/wk`;
}
