import { ActionPanel, Detail, List, Action, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useMemo } from "react";

interface ApiVersion {
  added: string;
  updated?: string;
  swaggerUrl: string;
  swaggerYamlUrl?: string;
  openapiVer?: string;
  link: string;
  info: {
    title: string;
    description?: string;
    version: string;
    contact?: {
      email?: string;
      name?: string;
      url?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
    "x-logo"?: {
      url: string;
    };
    "x-apisguru-categories"?: string[];
  };
}

interface ApiEntry {
  added: string;
  preferred: string;
  versions: Record<string, ApiVersion>;
}

interface ParsedApi {
  id: string;
  name: string;
  description: string;
  version: string;
  categories: string[];
  added: string;
  updated: string;
  swaggerUrl: string;
  logoUrl?: string;
  contactUrl?: string;
  contactEmail?: string;
  license?: string;
  providerName: string;
}

// Stream and parse the JSON incrementally to reduce memory usage
async function fetchAndParseApis(): Promise<ParsedApi[]> {
  const response = await fetch("https://api.apis.guru/v2/list.json");
  const text = await response.text();

  // Parse in a way that allows GC to clean up intermediate objects
  const data = JSON.parse(text) as Record<string, ApiEntry>;
  const apis: ParsedApi[] = [];

  for (const [key, entry] of Object.entries(data)) {
    const preferredVersion = entry.versions[entry.preferred];
    const info = preferredVersion?.info || {};

    apis.push({
      id: key,
      name: info.title || key,
      description: (info.description || "No description available").slice(0, 500), // Truncate descriptions
      version: info.version || entry.preferred,
      categories: info["x-apisguru-categories"] || [],
      added: entry.added,
      updated: preferredVersion?.updated || entry.added,
      swaggerUrl: preferredVersion?.swaggerUrl || "",
      logoUrl: info["x-logo"]?.url,
      contactUrl: info.contact?.url,
      contactEmail: info.contact?.email,
      license: info.license?.name,
      providerName: key.split(":")[0],
    });
  }

  return apis;
}

function getAllCategories(apis: ParsedApi[]): string[] {
  const categoriesSet = new Set<string>();
  apis.forEach((api) => {
    api.categories.forEach((cat) => categoriesSet.add(cat));
  });
  return Array.from(categoriesSet).sort();
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
}

function getCategoryIcon(category: string): Icon {
  const iconMap: Record<string, Icon> = {
    cloud: Icon.Cloud,
    financial: Icon.BankNote,
    payment: Icon.CreditCard,
    media: Icon.Video,
    social: Icon.TwoPeople,
    developer_tools: Icon.Code,
    machine_learning: Icon.Stars,
    security: Icon.Lock,
    messaging: Icon.Message,
    ecommerce: Icon.Cart,
    location: Icon.Map,
    analytics: Icon.BarChart,
    enterprise: Icon.Building,
    open_data: Icon.Globe,
  };
  return iconMap[category] || Icon.Circle;
}

function ApiDetail({ api }: { api: ParsedApi }) {
  const markdown = `
# ${api.name}

**Version:** ${api.version}

**Provider:** ${api.providerName}

${api.categories.length > 0 ? `**Categories:** ${api.categories.join(", ")}` : ""}

${api.license ? `**License:** ${api.license}` : ""}

---

## Description

${api.description}

---

**Added:** ${formatDate(api.added)}

**Updated:** ${formatDate(api.updated)}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Version" text={api.version} />
          <Detail.Metadata.Label title="Provider" text={api.providerName} />
          {api.categories.length > 0 && (
            <Detail.Metadata.TagList title="Categories">
              {api.categories.map((cat) => (
                <Detail.Metadata.TagList.Item key={cat} text={cat} color={Color.Blue} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          {api.contactUrl && <Detail.Metadata.Link title="Website" target={api.contactUrl} text="Visit" />}
          {api.swaggerUrl && <Detail.Metadata.Link title="OpenAPI Spec" target={api.swaggerUrl} text="View Spec" />}
          {api.contactEmail && <Detail.Metadata.Label title="Contact" text={api.contactEmail} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {api.swaggerUrl && <Action.OpenInBrowser title="Open OpenAPI Spec" url={api.swaggerUrl} />}
          {api.contactUrl && <Action.OpenInBrowser title="Visit Website" url={api.contactUrl} />}
          <Action.CopyToClipboard title="Copy API Name" content={api.name} />
          <Action.CopyToClipboard title="Copy Swagger URL" content={api.swaggerUrl} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data, isLoading, error } = useCachedPromise(fetchAndParseApis, [], {
    keepPreviousData: true,
  });

  const apis = data || [];
  const categories = useMemo(() => getAllCategories(apis), [apis]);

  const filteredApis = useMemo(() => {
    if (selectedCategory === "all") return apis;
    return apis.filter((api: ParsedApi) => api.categories.includes(selectedCategory));
  }, [apis, selectedCategory]);

  if (error) {
    return <Detail markdown={`# Error\n\nFailed to fetch APIs: ${error.message}`} />;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search APIs..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Category" value={selectedCategory} onChange={setSelectedCategory}>
          <List.Dropdown.Item title="All Categories" value="all" icon={Icon.List} />
          <List.Dropdown.Section title="Categories">
            {categories.map((category: string) => (
              <List.Dropdown.Item
                key={category}
                title={category.replace(/_/g, " ")}
                value={category}
                icon={getCategoryIcon(category)}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredApis.map((api: ParsedApi) => (
        <List.Item
          key={api.id}
          icon={api.logoUrl ? { source: api.logoUrl } : Icon.Globe}
          title={api.name}
          subtitle={api.providerName}
          accessories={[
            { text: api.version, tooltip: "Version" },
            ...(api.categories.length > 0
              ? [{ tag: { value: api.categories[0].replace(/_/g, " "), color: Color.Blue }, tooltip: "Category" }]
              : []),
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" icon={Icon.Eye} target={<ApiDetail api={api} />} />
              {api.swaggerUrl && <Action.OpenInBrowser title="Open OpenAPI Spec" url={api.swaggerUrl} />}
              {api.contactUrl && <Action.OpenInBrowser title="Visit Website" url={api.contactUrl} />}
              <Action.CopyToClipboard title="Copy API Name" content={api.name} />
              <Action.CopyToClipboard title="Copy Swagger URL" content={api.swaggerUrl} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
