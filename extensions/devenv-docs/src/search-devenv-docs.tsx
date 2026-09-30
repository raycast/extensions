import {
  ActionPanel,
  Detail,
  List,
  Action,
  Icon,
  Cache,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import yaml from "js-yaml";

interface Preferences {
  githubToken?: string;
}

// Cache for GitHub API responses (24 hour TTL)
const cache = new Cache();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Types for navigation structure
type NavItem = string | { [key: string]: string | NavItem[] };
type NavStructure = { nav: NavItem[] };

// Flattened doc item for rendering
type DocItem = {
  title: string;
  path: string;
  isFolder: boolean;
  children?: DocItem[];
};

// Parsed markdown section
type MarkdownSection = {
  title: string;
  content: string;
  type?: string;
  defaultValue?: string;
};

// Folders that should display options as a list instead of raw markdown
const SECTIONED_FOLDERS = ["languages", "services", "supported-process-managers"];

const NAV_URL = "https://raw.githubusercontent.com/cachix/devenv/main/docs/src/.nav.yml";
const DOCS_BASE_URL = "https://raw.githubusercontent.com/cachix/devenv/main/docs/src";
const GITHUB_API_BASE = "https://api.github.com/repos/cachix/devenv/contents/docs/src";
const WEBSITE_BASE_URL = "https://devenv.sh";

type GitHubFile = {
  name: string;
  type: "file" | "dir";
};

// Convert a path to a human-readable title
function pathToTitle(path: string): string {
  return path
    .replace(/\.md$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Parse nav items into DocItem structure
function parseNavItems(items: NavItem[], basePath = ""): DocItem[] {
  const result: DocItem[] = [];

  for (const item of items) {
    if (typeof item === "string") {
      // Simple file reference like "getting-started.md"
      const isFolder = !item.endsWith(".md");
      result.push({
        title: pathToTitle(item),
        path: basePath ? `${basePath}/${item}` : item,
        isFolder,
      });
    } else if (typeof item === "object") {
      // Object with title as key
      for (const [title, value] of Object.entries(item)) {
        if (typeof value === "string") {
          // { "Title": "path.md" }
          const isFolder = !value.endsWith(".md");
          result.push({
            title,
            path: basePath ? `${basePath}/${value}` : value,
            isFolder,
          });
        } else if (Array.isArray(value)) {
          // { "Section Title": [...children] }
          result.push({
            title,
            path: "",
            isFolder: true,
            children: parseNavItems(value, basePath),
          });
        }
      }
    }
  }

  return result;
}

// Extract the Guide section from nav structure
function extractGuideSection(nav: NavStructure): DocItem[] {
  for (const item of nav.nav) {
    if (typeof item === "object" && "Guide" in item) {
      const guideItems = item["Guide"];
      if (Array.isArray(guideItems)) {
        return parseNavItems(guideItems);
      }
    }
  }
  return [];
}

// Resolve a relative path against a base path
function resolveRelativePath(relativePath: string, basePath: string): string {
  // Get the directory of the current document
  const baseDir = basePath.includes("/") ? basePath.substring(0, basePath.lastIndexOf("/")) : "";

  // Handle different relative path formats
  let resolved = relativePath;

  if (relativePath.startsWith("./")) {
    resolved = baseDir ? `${baseDir}/${relativePath.slice(2)}` : relativePath.slice(2);
  } else if (relativePath.startsWith("../")) {
    const parts = baseDir.split("/").filter(Boolean);
    let relParts = relativePath.split("/");

    while (relParts[0] === "..") {
      parts.pop();
      relParts = relParts.slice(1);
    }

    resolved = [...parts, ...relParts].join("/");
  } else if (!relativePath.startsWith("/") && !relativePath.startsWith("http")) {
    // Relative path without ./ prefix
    resolved = baseDir ? `${baseDir}/${relativePath}` : relativePath;
  }

  return resolved;
}

// Convert a doc path to a devenv.sh URL
function pathToWebsiteUrl(path: string): string {
  return `${WEBSITE_BASE_URL}/${path.replace(/\.md$/, "/").replace(/index\/$/, "")}`;
}

// Fix markdown content for Raycast rendering
function fixMarkdown(content: string, docPath: string): string {
  let result = content;

  // Fix admonitions: !!! type "title" -> blockquote
  // Pattern: !!! type "optional title"
  //          optional blank line
  //          indented content (including blank lines within)
  result = result.replace(/^!!! (\w+)(?: "([^"]*)")?\n\n?((?:(?:[ ]{4}.*|)\n)*)/gm, (_, type, title, body) => {
    const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
    const header = title ? `**${typeCapitalized}:** ${title}` : `**${typeCapitalized}**`;
    const bodyLines = body
      .split("\n")
      .map((line: string) => line.replace(/^[ ]{4}/, ""))
      .join("\n")
      .trim();

    const quotedBody = bodyLines
      .split("\n")
      .map((line: string) => (line.trim() === "" ? ">" : `> ${line}`))
      .join("\n");

    return `> ${header}\n${quotedBody}\n\n`;
  });

  // Fix tabs: === "Tab Name" -> ### Tab Name
  result = result.replace(/^=== "([^"]+)"\n((?:[ ]{4}.*\n?)*)/gm, (_, tabName, body) => {
    const bodyLines = body
      .split("\n")
      .map((line: string) => line.replace(/^[ ]{4}/, ""))
      .join("\n")
      .trim();
    return `### ${tabName}\n\n${bodyLines}\n`;
  });

  // Fix relative links: [text](relative/path.md) -> [text](https://devenv.sh/path/)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, href) => {
    // Skip external links and pure anchors
    if (href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) {
      return match;
    }

    // Separate path and anchor
    const [pathPart, anchor] = href.split("#");

    // Resolve relative path and convert to website URL
    const resolved = resolveRelativePath(pathPart, docPath);
    const url = pathToWebsiteUrl(resolved) + (anchor ? `#${anchor}` : "");

    return `[${text}](${url})`;
  });

  // Fix escaped angle brackets: \< -> <, \> -> >
  result = result.replace(/\\</g, "<").replace(/\\>/g, ">");

  return result;
}

// Fetch and parse nav.yml
async function fetchNavYaml(): Promise<DocItem[]> {
  const response = await fetch(NAV_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch nav.yml: ${response.statusText}`);
  }
  const text = await response.text();
  const parsed = yaml.load(text) as NavStructure;
  return extractGuideSection(parsed);
}

// Extract type from section content
function extractType(content: string): string | undefined {
  const match = content.match(/\*Type:\*\s*(.+?)(?:\n|$)/);
  return match ? match[1].trim() : undefined;
}

// Extract default value from section content
function extractDefault(content: string): string | undefined {
  // Check for multiline code block first
  const multilineMatch = content.match(/\*Default:\*\s*```[\w]*\n([\s\S]*?)```/);
  if (multilineMatch) {
    return multilineMatch[1]
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join(" ");
  }

  // Fall back to single line inline code
  const match = content.match(/\*Default:\*\s*(.+?)(?:\n|$)/);
  return match ? match[1].trim().replace(/^`|`$/g, "") : undefined;
}

// Parse markdown into sections based on ### headings
function parseMarkdownSections(content: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const lines = content.split("\n");

  let currentTitle = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^### (.+)$/);
    if (headingMatch) {
      // Save previous section if exists
      if (currentTitle) {
        const sectionContent = currentContent.join("\n").trim();
        sections.push({
          title: currentTitle,
          content: sectionContent,
          type: extractType(sectionContent),
          defaultValue: extractDefault(sectionContent),
        });
      }
      currentTitle = headingMatch[1];
      currentContent = [];
    } else if (currentTitle) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentTitle) {
    const sectionContent = currentContent.join("\n").trim();
    sections.push({
      title: currentTitle,
      content: sectionContent,
      type: extractType(sectionContent),
      defaultValue: extractDefault(sectionContent),
    });
  }

  return sections;
}

// Fetch raw markdown content (without fixes, for section parsing)
async function fetchRawMarkdown(path: string): Promise<string> {
  const url = `${DOCS_BASE_URL}/${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
  }
  return response.text();
}

// Fetch and parse markdown into sections
async function fetchMarkdownSections(path: string): Promise<MarkdownSection[]> {
  const content = await fetchRawMarkdown(path);
  return parseMarkdownSections(content);
}

// Check if a path is in a sectioned folder
function isSectionedPath(path: string): boolean {
  return SECTIONED_FOLDERS.some((folder) => path.startsWith(`${folder}/`));
}

// Fetch folder contents from GitHub API with caching
async function fetchFolderContents(folderPath: string, token?: string): Promise<DocItem[]> {
  const cacheKey = `folder:${folderPath}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL_MS) {
      return data;
    }
  }

  const url = `${GITHUB_API_BASE}/${folderPath}`;

  // Build headers - add auth token if provided
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  // Handle rate limiting
  if (response.status === 403 || response.status === 429) {
    if (!token) {
      // Not authenticated - throw special error to prompt for token
      const error = new Error(
        "GitHub API rate limit exceeded. Add a Personal Access Token in preferences to continue.",
      );
      error.name = "RateLimitError";
      throw error;
    }
    // Authenticated but still rate limited
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    throw new Error("GitHub API rate limit exceeded. Please try again later.");
  }

  if (!response.ok) {
    // Return stale cache on other errors
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    throw new Error(`Failed to fetch folder ${folderPath}: ${response.statusText}`);
  }

  const files = (await response.json()) as GitHubFile[];

  const items = files
    .filter((file) => file.name.endsWith(".md") || file.type === "dir")
    .filter((file) => file.name !== "index.md") // Skip index files in listing
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((file) => ({
      title: pathToTitle(file.name),
      path: `${folderPath}/${file.name}`,
      isFolder: file.type === "dir",
    }));

  // Store in cache
  cache.set(cacheKey, JSON.stringify({ data: items, timestamp: Date.now() }));

  return items;
}

// Detail view for markdown files
function DocsDetailView({ path, title }: { path: string; title: string }) {
  const { data, isLoading, revalidate, error } = useCachedPromise(
    async (p: string) => fixMarkdown(await fetchRawMarkdown(p), p),
    [path],
    { keepPreviousData: true },
  );

  const websiteUrl = pathToWebsiteUrl(path);
  const isEmpty = !isLoading && !data;

  if (error && isEmpty) {
    return (
      <Detail
        markdown="## Failed to Load Documentation\n\nUnable to fetch the documentation. Please try again."
        isLoading={false}
        navigationTitle={title}
        actions={
          <ActionPanel>
            <Action icon={Icon.ArrowClockwise} title="Retry" onAction={() => revalidate()} />
            <Action.OpenInBrowser url={websiteUrl} title={`Open ${title} on Devenv.sh`} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      markdown={data || ""}
      isLoading={isLoading}
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={websiteUrl} title="Open on Devenv.sh" />
          <Action
            icon={Icon.ArrowClockwise}
            title="Refresh"
            onAction={() => revalidate()}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}

// Detail view for a single section
function SectionDetailView({ section, path, docTitle }: { section: MarkdownSection; path: string; docTitle: string }) {
  const unescapedTitle = section.title.replace(/\\\./g, ".").replace(/\\</g, "<").replace(/\\>/g, ">");
  const markdown = fixMarkdown(`### ${unescapedTitle}\n\n${section.content}`, path);
  const websiteUrl = pathToWebsiteUrl(path);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={unescapedTitle}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={websiteUrl} title={`Open ${docTitle} on Devenv.sh`} />
          <Action.CopyToClipboard content={unescapedTitle} title="Copy Option Name" />
        </ActionPanel>
      }
    />
  );
}

// List view for markdown sections (options)
function SectionedDocsList({ path, title }: { path: string; title: string }) {
  const {
    data: sections,
    isLoading,
    revalidate,
    error,
  } = useCachedPromise((p: string) => fetchMarkdownSections(p), [path], { keepPreviousData: true });

  const websiteUrl = pathToWebsiteUrl(path);

  const isEmpty = !isLoading && (!sections || sections.length === 0);

  return (
    <List navigationTitle={title} isLoading={isLoading} searchBarPlaceholder="Search options...">
      {isEmpty && (
        <List.EmptyView
          title={error ? "Failed to Load Options" : "No Options Found"}
          description={
            error
              ? "Unable to fetch the documentation. Please try again."
              : "This document has no configuration options."
          }
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Retry" onAction={() => revalidate()} />
              <Action.OpenInBrowser url={websiteUrl} title={`Open ${title} on Devenv.sh`} />
            </ActionPanel>
          }
        />
      )}
      {(sections || []).map((section, index) => {
        const unescapedTitle = section.title.replace(/\\\./g, ".").replace(/\\</g, "<").replace(/\\>/g, ">");
        const accessories: List.Item.Accessory[] = [];
        const hasType = !!section.type;
        const hasDefault = !!section.defaultValue;
        const limit = hasType && hasDefault ? 30 : 70;

        if (section.type) {
          const truncatedType = section.type.length > limit ? `${section.type.slice(0, limit)}...` : section.type;
          accessories.push({ tag: { value: `Type: ${truncatedType}` } });
        }
        if (section.defaultValue) {
          const truncatedDefault =
            section.defaultValue.length > limit ? `${section.defaultValue.slice(0, limit)}...` : section.defaultValue;
          accessories.push({ tag: { value: `Default: ${truncatedDefault}` } });
        }

        return (
          <List.Item
            key={index}
            title={unescapedTitle}
            icon={Icon.Gear}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View"
                  target={<SectionDetailView section={section} path={path} docTitle={title} />}
                />
                <Action.OpenInBrowser url={websiteUrl} title={`Open ${title} on Devenv.sh`} />
                <Action.CopyToClipboard content={unescapedTitle} title="Copy Option Name" />
                {revalidate && (
                  <Action
                    icon={Icon.ArrowClockwise}
                    title="Refresh"
                    onAction={revalidate}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

// List component for doc items (reusable for nested navigation)
function DocsList({
  items,
  title,
  revalidate,
  isLoading,
  error,
}: {
  items: DocItem[];
  title?: string;
  revalidate?: () => void;
  isLoading?: boolean;
  error?: Error;
}) {
  const isEmpty = !isLoading && items.length === 0;

  return (
    <List navigationTitle={title} isLoading={isLoading}>
      {isEmpty && (
        <List.EmptyView
          title={error ? "Failed to Load Documentation" : "No Documentation Found"}
          description={
            error ? "Unable to fetch the documentation. Please try again." : "Unable to load documentation items."
          }
          actions={
            revalidate ? (
              <ActionPanel>
                <Action icon={Icon.ArrowClockwise} title="Retry" onAction={() => revalidate()} />
              </ActionPanel>
            ) : undefined
          }
        />
      )}
      {items.map((item, index) => {
        if (item.children && item.children.length > 0) {
          // Section with children
          return (
            <List.Section key={`section-${index}`} title={item.title}>
              {item.children.map((child, childIndex) => (
                <DocListItem key={`${index}-${childIndex}`} item={child} revalidate={revalidate} />
              ))}
            </List.Section>
          );
        }
        return <DocListItem key={index} item={item} revalidate={revalidate} />;
      })}
    </List>
  );
}

// List component for dynamically loaded folder contents
function FolderDocsList({ folderPath, title }: { folderPath: string; title: string }) {
  const { githubToken } = getPreferenceValues<Preferences>();

  const {
    data: items,
    isLoading,
    revalidate,
    error,
  } = useCachedPromise((path: string, token?: string) => fetchFolderContents(path, token), [folderPath, githubToken], {
    keepPreviousData: true,
  });

  const isEmpty = !isLoading && (!items || items.length === 0);

  // Show rate limit message with action to open preferences
  if (error?.name === "RateLimitError" && isEmpty) {
    return (
      <List navigationTitle={title}>
        <List.EmptyView
          title="GitHub Rate Limit Reached"
          description="Add a Personal Access Token in preferences to continue browsing. Create one at github.com/settings/tokens (no scopes needed)."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error && isEmpty) {
    return (
      <List navigationTitle={title}>
        <List.EmptyView
          title="Failed to Load Documentation"
          description="Unable to fetch the documentation. Please try again."
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Retry" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List navigationTitle={title} isLoading={isLoading}>
      {(items || []).map((item, index) => (
        <DocListItem key={index} item={item} revalidate={revalidate} />
      ))}
    </List>
  );
}

// Individual list item component
function DocListItem({ item, revalidate }: { item: DocItem; revalidate?: () => void }) {
  const icon = item.isFolder ? Icon.Folder : Icon.Document;
  const websiteUrl = pathToWebsiteUrl(item.path);
  const refreshCacheAction = (
    <Action
      icon={Icon.ArrowClockwise}
      title="Refresh Cache"
      onAction={revalidate}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );

  let actions = undefined;
  if (item.isFolder && item.children) {
    // Folder with known children - push to nested list
    actions = (
      <ActionPanel>
        <Action.Push
          title="Open"
          target={<DocsList items={item.children} title={item.title} revalidate={revalidate} />}
        />
        {revalidate && refreshCacheAction}
      </ActionPanel>
    );
  } else if (item.isFolder && item.path) {
    // Folder without predefined children - fetch contents dynamically
    actions = (
      <ActionPanel>
        <Action.Push title="Open" target={<FolderDocsList folderPath={item.path} title={item.title} />} />
        {revalidate && refreshCacheAction}
      </ActionPanel>
    );
  } else if (isSectionedPath(item.path)) {
    // Markdown file
    // Use sectioned view for files in special folders
    actions = (
      <ActionPanel>
        <Action.Push title="View Options" target={<SectionedDocsList path={item.path} title={item.title} />} />
        <Action.OpenInBrowser url={websiteUrl} title="Open on Devenv.sh" />
        {revalidate && refreshCacheAction}
      </ActionPanel>
    );
  } else {
    // Markdown file
    // Regular markdown file - push to detail view
    actions = (
      <ActionPanel>
        <Action.Push title="View" target={<DocsDetailView path={item.path} title={item.title} />} />
        <Action.OpenInBrowser url={websiteUrl} title="Open on Devenv.sh" />
        {revalidate && refreshCacheAction}
      </ActionPanel>
    );
  }

  return <List.Item title={item.title} icon={icon} actions={actions} />;
}

export default function Command() {
  const {
    data: items,
    isLoading,
    revalidate,
    error,
  } = useCachedPromise(fetchNavYaml, [], {
    keepPreviousData: true,
  });

  if (error && (!items || items.length === 0)) {
    return (
      <List navigationTitle="DevEnv Docs">
        <List.EmptyView
          title="Failed to Load Documentation"
          description="Unable to fetch the documentation index. Please try again."
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Retry" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <DocsList
      items={items || []}
      title="DevEnv Docs"
      revalidate={revalidate}
      isLoading={isLoading}
      error={error as Error | undefined}
    />
  );
}
