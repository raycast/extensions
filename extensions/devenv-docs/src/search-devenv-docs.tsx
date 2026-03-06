import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import yaml from "js-yaml";

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

// Fetch markdown content for a doc
async function fetchMarkdown(path: string): Promise<string> {
  const url = `${DOCS_BASE_URL}/${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
  }
  const text = await response.text();
  return fixMarkdown(text, path);
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

// Fetch folder contents from GitHub API
async function fetchFolderContents(folderPath: string): Promise<DocItem[]> {
  const url = `${GITHUB_API_BASE}/${folderPath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch folder ${folderPath}: ${response.statusText}`);
  }
  const files = (await response.json()) as GitHubFile[];

  return files
    .filter((file) => file.name.endsWith(".md") || file.type === "dir")
    .filter((file) => file.name !== "index.md") // Skip index files in listing
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((file) => ({
      title: pathToTitle(file.name),
      path: `${folderPath}/${file.name}`,
      isFolder: file.type === "dir",
    }));
}

// Detail view for markdown files
function DocsDetailView({ path, title }: { path: string; title: string }) {
  const { data, isLoading, revalidate } = useCachedPromise((p: string) => fetchMarkdown(p), [path], {
    keepPreviousData: true,
  });

  const websiteUrl = pathToWebsiteUrl(path);

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
  } = useCachedPromise((p: string) => fetchMarkdownSections(p), [path], { keepPreviousData: true });

  const websiteUrl = pathToWebsiteUrl(path);

  return (
    <List navigationTitle={title} isLoading={isLoading} searchBarPlaceholder="Search options...">
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
function DocsList({ items, title, revalidate }: { items: DocItem[]; title?: string; revalidate?: () => void }) {
  return (
    <List navigationTitle={title}>
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
  const {
    data: items,
    isLoading,
    revalidate,
  } = useCachedPromise((path: string) => fetchFolderContents(path), [folderPath], { keepPreviousData: true });

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

  if (item.isFolder && item.children) {
    // Folder with known children - push to nested list
    return (
      <List.Item
        title={item.title}
        icon={icon}
        actions={
          <ActionPanel>
            <Action.Push
              title="Open"
              target={<DocsList items={item.children} title={item.title} revalidate={revalidate} />}
            />
            {revalidate && (
              <Action
                icon={Icon.ArrowClockwise}
                title="Refresh Cache"
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  if (item.isFolder && item.path) {
    // Folder without predefined children - fetch contents dynamically
    return (
      <List.Item
        title={item.title}
        icon={icon}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<FolderDocsList folderPath={item.path} title={item.title} />} />
            {revalidate && (
              <Action
                icon={Icon.ArrowClockwise}
                title="Refresh Cache"
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  // Markdown file
  const websiteUrl = pathToWebsiteUrl(item.path);

  // Use sectioned view for files in special folders
  if (isSectionedPath(item.path)) {
    return (
      <List.Item
        title={item.title}
        icon={icon}
        actions={
          <ActionPanel>
            <Action.Push title="View Options" target={<SectionedDocsList path={item.path} title={item.title} />} />
            <Action.OpenInBrowser url={websiteUrl} title="Open on Devenv.sh" />
            {revalidate && (
              <Action
                icon={Icon.ArrowClockwise}
                title="Refresh Cache"
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  // Regular markdown file - push to detail view
  return (
    <List.Item
      title={item.title}
      icon={icon}
      actions={
        <ActionPanel>
          <Action.Push title="View" target={<DocsDetailView path={item.path} title={item.title} />} />
          <Action.OpenInBrowser url={websiteUrl} title="Open on Devenv.sh" />
          {revalidate && (
            <Action
              icon={Icon.ArrowClockwise}
              title="Refresh Cache"
              onAction={revalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const {
    data: items,
    isLoading,
    revalidate,
  } = useCachedPromise(fetchNavYaml, [], {
    keepPreviousData: true,
  });

  if (isLoading && !items) {
    return <List isLoading={true} />;
  }

  return <DocsList items={items || []} title="DevEnv Docs" revalidate={revalidate} />;
}
