import { Cache } from "@raycast/api";
import fetch from "node-fetch";
import JSZip from "jszip";
import { load as yamlLoad } from "js-yaml";
import packageJson from "../package.json";

export interface DocItem {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  keywords: string[];
  type:
    | "class"
    | "service"
    | "tutorial"
    | "guide"
    | "reference"
    | "enum"
    | "global"
    | "property"
    | "method"
    | "event"
    | "callback"
    | "function";
  content?: string; // Full markdown/YAML content for detail view
  metadata?: {
    // For API references (classes, enums, etc.)
    parameters?: Array<{ name: string; type: string; description?: string }>;
    returnType?: string;
    security?: string;
    tags?: string[];
  };
}

// Constants
const ENGINE_REF_ITEMS = ["properties", "methods", "events", "callbacks", "items", "functions"] as const;

const SUBITEM_TYPE_MAP: Record<string, DocItem["type"]> = {
  properties: "property",
  methods: "method",
  events: "event",
  callbacks: "callback",
  functions: "function",
};

// Helper functions
const cleanPath = (path: string): string => {
  return path.replace(/^content\/en-us\//, "").replace(/\.(md|yaml)$/, "");
};

const isDeprecated = (item: { tags?: string[] }): boolean => {
  return Boolean(item.tags && Array.isArray(item.tags) && item.tags.includes("Deprecated"));
};

interface FileMetadata {
  title?: string;
  description?: string;
  path: string;
  type: string;
  content?: string; // Store full content for detail view
  subitems?: Array<{
    type: string;
    title: string;
    description?: string;
    summary?: string;
    parameters?: Array<{ name: string; type: string; default?: string }>;
    returnType?: string;
    security?: string;
    tags?: string[];
  }>;
}

interface YAMLDocData {
  name?: string;
  type?: string;
  summary?: string;
  description?: string;
  properties?: Array<{
    name: string;
    summary?: string;
    description?: string;
    tags?: string[];
    property_type?: string;
  }>;
  methods?: Array<{
    name: string;
    summary?: string;
    description?: string;
    tags?: string[];
    parameters?: Array<{ name: string; type: string; default?: string; summary?: string }>;
    return_type?: string;
  }>;
  events?: Array<{
    name: string;
    summary?: string;
    description?: string;
    tags?: string[];
    parameters?: Array<{ name: string; type: string; default?: string; summary?: string }>;
  }>;
  callbacks?: Array<{
    name: string;
    summary?: string;
    description?: string;
    tags?: string[];
    parameters?: Array<{ name: string; type: string; default?: string; summary?: string }>;
    return_type?: string;
  }>;
  items?: Array<{
    name: string;
    summary?: string;
    description?: string;
    tags?: string[];
  }>;
  functions?: Array<{
    name: string;
    summary?: string;
    description?: string;
    tags?: string[];
    parameters?: Array<{ name: string; type: string; default?: string; summary?: string }>;
    return_type?: string;
  }>;
  [key: string]: unknown;
}

interface SubitemData {
  type: string;
  title: string;
  description?: string;
  summary?: string;
  parameters?: Array<{ name: string; type: string; default?: string; summary?: string }>;
  returnType?: string;
  security?: string;
  tags?: string[];
}

class RobloxDocsDataFetcher {
  private cache: Cache;
  private cacheKey = "roblox-docs-data";
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours as fallback
  private lastUpdateCheckKey = "roblox-docs-last-update-check";
  private updateCheckInterval = 60 * 60 * 1000; // Check for updates once per hour
  private extensionVersion: string;

  // Memory optimization constants
  private readonly BATCH_SIZE = 15; // Process files in smaller batches
  private readonly GC_INTERVAL = 30; // Trigger GC more frequently

  constructor() {
    this.cache = new Cache();
    this.extensionVersion = packageJson.version;
  }

  clearCache(): void {
    this.cache.remove(this.cacheKey);
    console.log("Cache cleared");
  }

  private async getLatestCommitSha(): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch("https://api.github.com/repos/Roblox/creator-docs/commits/main", {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as { sha: string };
      return data.sha;
    } catch {
      return null;
    }
  }

  /**
   * Load docs data immediately from cache, then check for updates in background
   * Returns cached data instantly if available, otherwise fetches fresh data
   */
  async fetchDocsData(): Promise<DocItem[]> {
    // Try to load from cache first for instant startup
    const cachedData = this.getCachedData();

    if (cachedData && cachedData.data.length > 0) {
      // Check for updates in background (non-blocking)
      this.checkForUpdatesInBackground(cachedData.sha);

      return cachedData.data;
    }

    // No valid cache, fetch fresh data (blocking)
    return this.fetchFreshData();
  }

  private getCachedData(): { data: DocItem[]; sha: string | null; timestamp: number; version?: string } | null {
    const cachedData = this.cache.get(this.cacheKey);
    if (!cachedData) return null;

    try {
      const parsed = JSON.parse(cachedData);
      const now = Date.now();

      // Validate version and expiry
      if (parsed.version !== this.extensionVersion || now - parsed.timestamp > this.cacheExpiry) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Check for updates in background without blocking the UI
   */
  private checkForUpdatesInBackground(cachedSha: string | null): void {
    // Check if we recently checked for updates (throttle to once per hour)
    const lastCheckStr = this.cache.get(this.lastUpdateCheckKey);
    if (lastCheckStr) {
      const lastCheck = parseInt(lastCheckStr, 10);
      const now = Date.now();
      if (now - lastCheck < this.updateCheckInterval) {
        return;
      }
    }

    // Update the last check timestamp
    this.cache.set(this.lastUpdateCheckKey, Date.now().toString());

    // Fire and forget - don't await
    this.getLatestCommitSha()
      .then((latestSha) => {
        if (!latestSha || (cachedSha && cachedSha === latestSha)) {
          return;
        }
        // Update available, but will be fetched on next restart
      })
      .catch(() => {
        // Silently fail - this is a background check
      });
  }

  private async fetchFreshData(): Promise<DocItem[]> {
    const latestSha = await this.getLatestCommitSha();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const zipResponse = await fetch("https://github.com/Roblox/creator-docs/archive/refs/heads/main.zip", {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!zipResponse.ok) throw new Error(`Failed to download docs: ${zipResponse.statusText}`);

      const zipBuffer = await zipResponse.buffer();
      const docItems = await this.processZipArchiveOptimized(zipBuffer);

      // Cache results
      const cacheData = {
        data: docItems,
        timestamp: Date.now(),
        sha: latestSha,
        version: this.extensionVersion,
      };
      this.cache.set(this.cacheKey, JSON.stringify(cacheData));

      return docItems;
    } catch (error) {
      console.error("Error fetching docs:", error);
      return [];
    }
  }

  private async processZipArchiveOptimized(zipBuffer: Buffer): Promise<DocItem[]> {
    try {
      const zip = await JSZip.loadAsync(zipBuffer);
      const docItems: DocItem[] = [];

      // Filter relevant files first
      const relevantFiles: { path: string; file: JSZip.JSZipObject }[] = [];

      zip.forEach((relativePath, file) => {
        // Filter for relevant files in content/en-us directory
        if (
          relativePath.includes("content/en-us/") &&
          (relativePath.endsWith(".md") || relativePath.endsWith(".yaml")) &&
          !file.dir
        ) {
          relevantFiles.push({ path: relativePath, file });
        }
      });

      // Process files in batches to manage memory
      for (let i = 0; i < relevantFiles.length; i += this.BATCH_SIZE) {
        const batch = relevantFiles.slice(i, i + this.BATCH_SIZE);

        const batchPromises = batch.map(async ({ path, file }) => {
          try {
            const content = await file.async("text");
            const url = path.substring(path.indexOf("content/en-us/"));

            if (path.endsWith(".md")) {
              return this.parseMarkdownFile(path, url, content);
            } else if (path.endsWith(".yaml")) {
              return this.parseYamlFile(path, url, content);
            }
            return null;
          } catch (error) {
            console.error(`Error processing ${path}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const validMetadata = batchResults.filter((m): m is FileMetadata => m !== null);

        // Convert metadata to DocItems and add to results
        for (const metadata of validMetadata) {
          const docItem = this.metadataToDocItem(metadata);
          if (docItem) {
            docItems.push(docItem);

            // Add subitems as separate entries
            if (metadata.subitems) {
              for (const subitem of metadata.subitems) {
                const subDocItem = this.subitemToDocItem(subitem, metadata);
                if (subDocItem) {
                  docItems.push(subDocItem);
                }
              }
            }
          }
        }

        // Force garbage collection periodically to free memory
        if (i > 0 && i % this.GC_INTERVAL === 0) {
          if (global.gc) {
            global.gc();
          }
        }

        // Small delay to prevent overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      return docItems;
    } catch (error) {
      console.error("Error processing ZIP archive:", error);
      throw error;
    }
  }

  private parseMarkdownFile(filePath: string, url: string, content: string): FileMetadata | null {
    try {
      // Extract frontmatter metadata
      const metadataMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (!metadataMatch) {
        return {
          path: url,
          type: "article",
          title: this.extractTitleFromPath(filePath),
          content: this.truncateContent(content), // Truncate content to save memory
        };
      }

      const metadataStr = metadataMatch[1];
      const metadata = yamlLoad(metadataStr) as Record<string, unknown>;

      // Extract the markdown content after frontmatter
      const markdownContent = content.substring(metadataMatch[0].length).trim();

      return {
        title: (metadata.title as string) || this.extractTitleFromPath(filePath),
        description: this.truncateDescription(metadata.description as string),
        path: url,
        type: "article",
        content: this.truncateContent(markdownContent), // Truncate to save memory
      };
    } catch (error) {
      console.error(`Error parsing YAML frontmatter in ${filePath}:`, error);
      return {
        path: url,
        type: "article",
        title: this.extractTitleFromPath(filePath),
        content: this.truncateContent(content),
      };
    }
  }

  private parseYamlFile(filePath: string, url: string, content: string): FileMetadata | null {
    try {
      const data = yamlLoad(content) as YAMLDocData;
      if (!data || !data.name) {
        return null;
      }

      const metadata: FileMetadata = {
        title: data.name,
        type: data.type || "class",
        path: url,
        description: this.truncateDescription(data.summary),
        content: data.summary || "", // Store main summary as content
        subitems: [],
      };

      // Extract subitems (properties, methods, events, etc.) with memory optimization
      for (const key of ENGINE_REF_ITEMS) {
        const keyData = data[key as keyof YAMLDocData];
        if (keyData && Array.isArray(keyData)) {
          // Limit subitems to prevent memory bloat
          const items = keyData.slice(0, 50); // Max 50 subitems per category

          for (const item of items) {
            // Skip deprecated items
            if (isDeprecated(item)) {
              continue;
            }

            let title: string;
            if (data.type === "enum") {
              title = `${data.name}.${item.name}`;
            } else {
              title = item.name;
            }

            const itemWithDescription = item as {
              summary?: string;
              description?: string;
              parameters?: Array<{ name: string; type: string; default?: string; summary?: string }>;
              return_type?: string;
              security?: string | { read?: string; write?: string };
              tags?: string[];
            };

            // Use description if available (contains full content with code blocks), otherwise use summary
            const fullContent = itemWithDescription.description || itemWithDescription.summary || "";

            metadata.subitems!.push({
              type: key,
              title,
              description: this.truncateDescription(itemWithDescription.summary || itemWithDescription.description),
              summary: fullContent, // Store full content (description preferred over summary)
              parameters: itemWithDescription.parameters,
              returnType: itemWithDescription.return_type,
              security: this.formatSecurity(itemWithDescription.security),
              tags: itemWithDescription.tags,
            });
          }
        }
      }

      return metadata;
    } catch (error) {
      console.error(`Error parsing YAML file ${filePath}:`, error);
      return null;
    }
  }

  private truncateDescription(description: string | undefined): string {
    if (!description) return "";

    // Limit description length to prevent memory bloat
    const maxLength = 200;
    if (description.length > maxLength) {
      return description.substring(0, maxLength) + "...";
    }
    return description;
  }

  private truncateContent(content: string | undefined): string {
    if (!content) return "";

    // Limit content to first 2000 characters to prevent memory issues
    // The UI will show a link to view full docs in browser
    const maxLength = 2000;
    if (content.length > maxLength) {
      return content.substring(0, maxLength);
    }
    return content;
  }

  private formatSecurity(security: string | { read?: string; write?: string } | undefined): string | undefined {
    if (!security) return undefined;

    // If it's already a string
    if (typeof security === "string") {
      // Don't show if it's just "None"
      return security === "None" ? undefined : security;
    }

    // If it's an object, format it nicely
    const parts: string[] = [];
    if (security.read && security.read !== "None") {
      parts.push(`Read: ${security.read}`);
    }
    if (security.write && security.write !== "None") {
      parts.push(`Write: ${security.write}`);
    }

    // Only return if there's meaningful security info (not all "None")
    return parts.length > 0 ? parts.join(", ") : undefined;
  }

  private metadataToDocItem(metadata: FileMetadata): DocItem | null {
    if (!metadata.title) {
      return null;
    }

    const category = this.getCategoryFromPath(metadata.path);
    const type = this.getTypeFromMetadata(metadata);
    const url = this.pathToUrl(metadata.path);

    return {
      id: this.generateIdFromPath(metadata.path),
      title: metadata.title,
      description: metadata.description || "",
      url,
      category,
      keywords: this.generateKeywords(metadata.title, metadata.description || "", metadata.path),
      type,
      content: metadata.content, // Pass through full content
    };
  }

  private subitemToDocItem(subitem: SubitemData, parentMetadata: FileMetadata): DocItem | null {
    if (!subitem.title) {
      return null;
    }

    const category = this.getCategoryFromPath(parentMetadata.path);
    const baseUrl = this.pathToUrl(parentMetadata.path);

    // Extract just the property/method name for the anchor (remove class prefix if present)
    // Handle both "Class.Property" and "Class:Method" formats
    let anchorName = subitem.title;
    if (subitem.title.includes(":")) {
      anchorName = subitem.title.split(":").pop() || subitem.title;
    } else if (subitem.title.includes(".")) {
      anchorName = subitem.title.split(".").pop() || subitem.title;
    }

    // Generate URL with anchor link for direct navigation to the specific property/method/event
    const url = `${baseUrl}#${anchorName}`;

    // Determine the specific type based on subitem.type
    const itemType: DocItem["type"] = SUBITEM_TYPE_MAP[subitem.type] || "reference";

    // Just use the summary/description as content
    // Metadata will be displayed separately in the UI to avoid duplication
    const content = subitem.summary || subitem.description || "";

    return {
      id: `${this.generateIdFromPath(parentMetadata.path)}-${subitem.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      title: subitem.title,
      description: subitem.description || "No information provided",
      url,
      category,
      keywords: this.generateKeywords(subitem.title, subitem.description || "", parentMetadata.path),
      type: itemType,
      content, // Include detailed content
      metadata: {
        parameters: subitem.parameters?.map((p) => {
          const parts: string[] = [];
          if (p.summary) parts.push(p.summary);
          if (p.default) parts.push(`default: ${p.default}`);
          return {
            name: p.name,
            type: p.type,
            description: parts.length > 0 ? parts.join(" | ") : undefined,
          };
        }),
        returnType: subitem.returnType,
        security: subitem.security,
        tags: subitem.tags,
      },
    };
  }

  private extractTitleFromPath(filePath: string): string {
    const fileName = filePath.split("/").pop() || "";
    return fileName.replace(/\.(md|yaml)$/, "").replace(/[-_]/g, " ");
  }

  private getCategoryFromPath(path: string): string {
    if (path.includes("/reference/engine/classes/")) return "Classes";
    if (path.includes("/reference/engine/enums/")) return "Enums";
    if (path.includes("/reference/engine/globals/")) return "Globals";
    if (path.includes("/tutorials/")) return "Tutorials";
    if (path.includes("/scripting/")) return "Scripting";
    if (path.includes("/art/")) return "Art";
    if (path.includes("/physics/")) return "Physics";
    if (path.includes("/ui/")) return "UI";
    if (path.includes("/sound/")) return "Sound";
    if (path.includes("/animation/")) return "Animation";
    if (path.includes("/lighting/")) return "Lighting";
    return "Documentation";
  }

  private getTypeFromMetadata(metadata: FileMetadata): DocItem["type"] {
    if (metadata.type === "class") return "class";
    if (metadata.type === "service") return "service";
    if (metadata.type === "enum") return "enum";
    if (metadata.type === "global") return "global";
    if (metadata.path.includes("/tutorials/")) return "tutorial";
    if (metadata.path.includes("/reference/")) return "reference";
    return "guide";
  }

  private generateKeywords(title: string, description: string, path: string): string[] {
    const keywords = new Set<string>();

    // Add title words
    title
      .toLowerCase()
      .split(/\W+/)
      .forEach((word) => {
        if (word.length > 2) keywords.add(word);
      });

    // Add description words
    description
      .toLowerCase()
      .split(/\W+/)
      .forEach((word) => {
        if (word.length > 2) keywords.add(word);
      });

    // Add path-based keywords
    const pathParts = path.toLowerCase().split("/");
    pathParts.forEach((part) => {
      if (part.length > 2) keywords.add(part);
    });

    return Array.from(keywords).slice(0, 10);
  }

  private generateIdFromPath(path: string): string {
    return cleanPath(path)
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase();
  }

  private pathToUrl(path: string): string {
    // Convert internal path to public documentation URL
    return `https://create.roblox.com/docs/${cleanPath(path)}`;
  }
}

export default RobloxDocsDataFetcher;
