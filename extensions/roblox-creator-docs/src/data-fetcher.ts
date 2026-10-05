import { Cache } from "@raycast/api";
import fetch from "node-fetch";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const unzip = require("unzip-stream");
import { load as yamlLoad } from "js-yaml";
import packageJson from "../package.json";
import { Readable } from "stream";

export interface DocItem {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  type:
    | "class"
    | "service"
    | "tutorial"
    | "guide"
    | "reference"
    | "enum"
    | "global"
    | "datatype"
    | "property"
    | "method"
    | "event"
    | "callback"
    | "function";
  signature?: string; // For methods/functions: "(param: Type, ...) → ReturnType"
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
  subitems?: Array<{
    type: string;
    title: string;
    description?: string;
    signature?: string;
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
  signature?: string;
}

class RobloxDocsDataFetcher {
  private cache: Cache;
  private cacheKey = "roblox-docs-data";
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  private lastUpdateCheckKey = "roblox-docs-last-update-check";
  private updateCheckInterval = 60 * 60 * 1000; // Check for updates once per hour
  private extensionVersion: string;

  // Memory optimization constants
  private readonly GC_INTERVAL = 10; // Trigger GC every N files

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
   * If cache is stale, returns stale data while refreshing in background (no downtime)
   */
  async fetchDocsData(): Promise<DocItem[]> {
    // Try to load from cache first for instant startup
    const cachedData = this.getCachedData();

    if (cachedData && cachedData.data.length > 0) {
      // Check for updates in background (non-blocking)
      this.checkForUpdatesInBackground(cachedData.sha);
      return cachedData.data;
    }

    // No valid cache - check if we have stale data we can use while refreshing
    const staleData = this.getCachedData(true);

    if (staleData && staleData.data.length > 0) {
      // Return stale data - background refresh disabled due to memory constraints
      // User can manually refresh via "Clear Cache & Refresh" action
      return staleData.data;
    }

    // No cache at all, fetch fresh data (blocking)
    return this.fetchFreshData();
  }

  /**
   * Check if the current cache is stale (expired or version mismatch)
   * Returns true if using stale data, false if cache is fresh or empty
   */
  isCacheStale(): boolean {
    const validCache = this.getCachedData(false);
    if (validCache) return false; // Cache is valid

    const staleCache = this.getCachedData(true);
    return staleCache !== null; // Has stale data
  }

  private getCachedData(
    allowStale = false,
  ): { data: DocItem[]; sha: string | null; timestamp: number; version?: string } | null {
    const cachedData = this.cache.get(this.cacheKey);
    if (!cachedData) return null;

    try {
      const parsed = JSON.parse(cachedData);
      const now = Date.now();

      // If allowing stale data, return it as long as it has data
      if (allowStale && parsed.data && parsed.data.length > 0) {
        return parsed;
      }

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
      const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout for streaming

      const zipResponse = await fetch("https://github.com/Roblox/creator-docs/archive/refs/heads/main.zip", {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!zipResponse.ok) throw new Error(`Failed to download docs: ${zipResponse.statusText}`);
      if (!zipResponse.body) throw new Error("No response body");

      // Stream the ZIP and process files as they arrive - never loads entire ZIP into memory
      const docItems = await this.processZipStream(zipResponse.body as unknown as Readable);

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

  private processZipStream(stream: Readable): Promise<DocItem[]> {
    const docItems: DocItem[] = [];

    return new Promise((resolve, reject) => {
      const parser = unzip.Parse();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parser.on("entry", (entry: any) => {
        const filePath = entry.path as string;
        const type = entry.type as string;

        // Only process relevant files
        if (
          type === "File" &&
          filePath.includes("content/en-us/") &&
          (filePath.endsWith(".md") || filePath.endsWith(".yaml"))
        ) {
          const chunks: Buffer[] = [];

          entry.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
          });

          entry.on("end", () => {
            try {
              const contentStr = Buffer.concat(chunks).toString("utf-8");
              const url = filePath.substring(filePath.indexOf("content/en-us/"));

              let metadata: FileMetadata | null = null;
              if (filePath.endsWith(".md")) {
                metadata = this.parseMarkdownFile(filePath, url, contentStr);
              } else if (filePath.endsWith(".yaml")) {
                metadata = this.parseYamlFile(filePath, url, contentStr);
              }

              if (metadata) {
                const docItem = this.metadataToDocItem(metadata);
                if (docItem) {
                  docItems.push(docItem);

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
            } catch (error) {
              console.error(`Error processing ${filePath}:`, error);
            }
          });
        } else {
          // Skip non-relevant files
          entry.autodrain();
        }
      });

      parser.on("close", () => {
        resolve(docItems);
      });

      parser.on("error", (error: Error) => {
        reject(error);
      });

      stream.pipe(parser);
    });
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
        };
      }

      const metadataStr = metadataMatch[1];
      const metadata = yamlLoad(metadataStr) as Record<string, unknown>;

      return {
        title: (metadata.title as string) || this.extractTitleFromPath(filePath),
        description: this.truncateDescription(metadata.description as string),
        path: url,
        type: "article",
      };
    } catch (error) {
      console.error(`Error parsing YAML frontmatter in ${filePath}:`, error);
      return {
        path: url,
        type: "article",
        title: this.extractTitleFromPath(filePath),
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
        subitems: [],
      };

      // Extract subitems (properties, methods, events, etc.) with memory optimization
      for (const key of ENGINE_REF_ITEMS) {
        const keyData = data[key as keyof YAMLDocData];
        if (keyData && Array.isArray(keyData)) {
          // Limit subitems to prevent memory bloat
          const items = keyData.slice(0, 15); // Max 15 subitems per category

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

            const itemData = item as {
              summary?: string;
              description?: string;
              parameters?: Array<{ name: string; type: string; summary?: string }>;
              return_type?: string;
            };

            // Build signature for methods/functions/events/callbacks
            // Store raw types - UI will resolve links based on available docs
            let signature: string | undefined;
            if (itemData.parameters && itemData.parameters.length > 0) {
              const params = itemData.parameters.map((p) => `${p.name}: ${p.type}`).join(", ");
              signature = `(${params})` + (itemData.return_type ? ` → ${itemData.return_type}` : "");
            } else if (itemData.return_type) {
              signature = `() → ${itemData.return_type}`;
            }

            metadata.subitems!.push({
              type: key,
              title,
              description: this.truncateDescription(itemData.summary || itemData.description),
              signature,
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

    // Limit description to 150 chars (enough for params + brief summary)
    const maxLength = 150;
    if (description.length > maxLength) {
      return description.substring(0, maxLength) + "...";
    }
    return description;
  }

  private metadataToDocItem(metadata: FileMetadata): DocItem | null {
    if (!metadata.title) {
      return null;
    }

    return {
      id: this.generateIdFromPath(metadata.path),
      title: metadata.title,
      description: metadata.description || "",
      url: this.pathToUrl(metadata.path),
      category: this.getCategoryFromPath(metadata.path),
      type: this.getTypeFromMetadata(metadata),
    };
  }

  private subitemToDocItem(subitem: SubitemData, parentMetadata: FileMetadata): DocItem | null {
    if (!subitem.title) {
      return null;
    }

    const baseUrl = this.pathToUrl(parentMetadata.path);

    // Extract anchor name for direct navigation
    let anchorName = subitem.title;
    if (subitem.title.includes(":")) {
      anchorName = subitem.title.split(":").pop() || subitem.title;
    } else if (subitem.title.includes(".")) {
      anchorName = subitem.title.split(".").pop() || subitem.title;
    }

    return {
      id: `${this.generateIdFromPath(parentMetadata.path)}-${subitem.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      title: subitem.title,
      description: subitem.description || "",
      url: `${baseUrl}#${anchorName}`,
      category: this.getCategoryFromPath(parentMetadata.path),
      type: SUBITEM_TYPE_MAP[subitem.type] || "reference",
      signature: subitem.signature,
    };
  }

  private extractTitleFromPath(filePath: string): string {
    const fileName = filePath.split("/").pop() || "";
    return fileName.replace(/\.(md|yaml)$/, "").replace(/[-_]/g, " ");
  }

  private getCategoryFromPath(path: string): string {
    if (path.includes("/reference/engine/classes/")) return "Classes";
    if (path.includes("/reference/engine/enums/")) return "Enums";
    if (path.includes("/reference/engine/datatypes/")) return "Datatypes";
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
    if (metadata.path.includes("/reference/engine/datatypes/")) return "datatype";
    if (metadata.path.includes("/tutorials/")) return "tutorial";
    if (metadata.path.includes("/reference/")) return "reference";
    return "guide";
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
