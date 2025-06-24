import { Cache } from "@raycast/api";
import fetch from "node-fetch";
import JSZip from "jszip";
import * as yaml from "js-yaml";

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
}

interface FileMetadata {
  title?: string;
  description?: string;
  path: string;
  type: string;
  subitems?: Array<{
    type: string;
    title: string;
    description?: string;
  }>;
}

interface YAMLDocData {
  name?: string;
  type?: string;
  summary?: string;
  properties?: Array<{ name: string; summary?: string; tags?: string[] }>;
  methods?: Array<{ name: string; summary?: string; tags?: string[] }>;
  events?: Array<{ name: string; summary?: string; tags?: string[] }>;
  callbacks?: Array<{ name: string; summary?: string; tags?: string[] }>;
  items?: Array<{ name: string; summary?: string; tags?: string[] }>;
  functions?: Array<{ name: string; summary?: string; tags?: string[] }>;
  [key: string]: unknown;
}

interface SubitemData {
  type: string;
  title: string;
  description?: string;
}

class RobloxDocsDataFetcher {
  private cache: Cache;
  private cacheKey = "roblox-docs-data";
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours as fallback

  // Memory optimization constants
  private readonly BATCH_SIZE = 25; // Process files in smaller batches
  private readonly GC_INTERVAL = 50; // Trigger GC more frequently

  constructor() {
    this.cache = new Cache();
  }

  clearCache(): void {
    this.cache.remove(this.cacheKey);
    console.log("Cache cleared");
  }

  private async getLatestCommitSha(): Promise<string | null> {
    try {
      const response = await fetch("https://api.github.com/repos/Roblox/creator-docs/commits/main");
      if (!response.ok) {
        console.error(`Failed to fetch commit info: ${response.statusText}`);
        return null;
      }
      const data = (await response.json()) as { sha: string };
      return data.sha;
    } catch (error) {
      console.error("Error fetching latest commit SHA:", error);
      return null;
    }
  }

  async fetchDocsData(): Promise<DocItem[]> {
    // Get the latest commit SHA first
    const latestSha = await this.getLatestCommitSha();

    // Check cache first
    const cachedData = this.cache.get(this.cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const now = Date.now();

        // Check if we have a SHA and it matches the latest SHA
        if (latestSha && parsed.sha && parsed.sha === latestSha) {
          console.log(`Using cached docs data - SHA match (${parsed.data.length} items)`);
          // If cached data is empty, force a fresh fetch
          if (parsed.data.length === 0) {
            console.log("Cached data is empty, forcing fresh fetch");
          } else {
            return parsed.data;
          }
        }
        // Fallback to time-based check if SHA comparison fails
        else if (!latestSha && now - parsed.timestamp < this.cacheExpiry) {
          console.log(`Using cached docs data - time-based fallback (${parsed.data.length} items)`);
          if (parsed.data.length === 0) {
            console.log("Cached data is empty, forcing fresh fetch");
          } else {
            return parsed.data;
          }
        }
        // Log cache invalidation reason
        else if (latestSha && parsed.sha && parsed.sha !== latestSha) {
          console.log(
            `Cache invalidated - SHA mismatch (cached: ${parsed.sha.substring(0, 8)}, latest: ${latestSha.substring(0, 8)})`,
          );
        } else if (latestSha && !parsed.sha) {
          console.log("Cache invalidated - no SHA in cached data, upgrading cache format");
        } else {
          console.log("Cache invalidated - fallback time expiration");
        }
      } catch (error) {
        console.error("Error parsing cached data:", error);
      }
    }

    console.log("Fetching fresh docs data from GitHub...");
    try {
      // Download ZIP archive from Roblox creator-docs repository
      console.log("Downloading ZIP archive...");
      const zipResponse = await fetch("https://github.com/Roblox/creator-docs/archive/refs/heads/main.zip");

      if (!zipResponse.ok) {
        throw new Error(`Failed to download docs: ${zipResponse.statusText}`);
      }

      console.log("Processing ZIP archive...");
      const zipBuffer = await zipResponse.buffer();
      const docItems = await this.processZipArchiveOptimized(zipBuffer);

      console.log(`Successfully processed ${docItems.length} documentation items`);

      // Cache the results with SHA and timestamp
      const cacheData = {
        data: docItems,
        timestamp: Date.now(),
        sha: latestSha, // Store the SHA for future comparisons
      };
      this.cache.set(this.cacheKey, JSON.stringify(cacheData));

      return docItems;
    } catch (error) {
      console.error("Error fetching docs data:", error);
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

      console.log(`Found ${relevantFiles.length} relevant files to process`);

      // Process files in batches to manage memory
      for (let i = 0; i < relevantFiles.length; i += this.BATCH_SIZE) {
        const batch = relevantFiles.slice(i, i + this.BATCH_SIZE);
        console.log(
          `Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(relevantFiles.length / this.BATCH_SIZE)} (${batch.length} files)`,
        );

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

      console.log(`Processed ${docItems.length} documentation items`);
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
        };
      }

      const metadataStr = metadataMatch[1];
      const metadata = yaml.load(metadataStr) as Record<string, unknown>;

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
      const data = yaml.load(content) as YAMLDocData;
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
      const engineRefItems = ["properties", "methods", "events", "callbacks", "items", "functions"];

      for (const key of engineRefItems) {
        const keyData = data[key as keyof YAMLDocData];
        if (keyData && Array.isArray(keyData)) {
          // Limit subitems to prevent memory bloat
          const items = keyData.slice(0, 50); // Max 50 subitems per category

          for (const item of items) {
            // Skip deprecated items
            if (item.tags && Array.isArray(item.tags) && item.tags.includes("Deprecated")) {
              continue;
            }

            let title: string;
            if (data.type === "enum") {
              title = `${data.name}.${item.name}`;
            } else {
              title = item.name;
            }

            metadata.subitems!.push({
              type: key,
              title,
              description: this.truncateDescription(item.summary),
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
    };
  }

  private subitemToDocItem(subitem: SubitemData, parentMetadata: FileMetadata): DocItem | null {
    if (!subitem.title) {
      return null;
    }

    const category = this.getCategoryFromPath(parentMetadata.path);
    const baseUrl = this.pathToUrl(parentMetadata.path);

    // Extract just the property/method name for the anchor (remove class prefix if present)
    const anchorName = subitem.title.includes(".") ? subitem.title.split(".").pop() : subitem.title;

    // Generate URL with anchor link for direct navigation to the specific property/method/event
    const url = `${baseUrl}#${anchorName}`;

    // Determine the specific type based on subitem.type
    let itemType: DocItem["type"];
    switch (subitem.type) {
      case "properties":
        itemType = "property";
        break;
      case "methods":
        itemType = "method";
        break;
      case "events":
        itemType = "event";
        break;
      case "callbacks":
        itemType = "callback";
        break;
      case "functions":
        itemType = "function";
        break;
      default:
        itemType = "reference";
    }

    return {
      id: `${this.generateIdFromPath(parentMetadata.path)}-${subitem.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      title: subitem.title,
      description: subitem.description || `${subitem.type.slice(0, -1)} of ${parentMetadata.title}`, // Remove 's' from end (e.g., "properties" -> "property")
      url,
      category,
      keywords: this.generateKeywords(subitem.title, subitem.description || "", parentMetadata.path),
      type: itemType,
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
    return path
      .replace(/^content\/en-us\//, "")
      .replace(/\.(md|yaml)$/, "")
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase();
  }

  private pathToUrl(path: string): string {
    // Convert internal path to public documentation URL
    const cleanPath = path.replace(/^content\/en-us\//, "").replace(/\.(md|yaml)$/, "");
    return `https://create.roblox.com/docs/${cleanPath}`;
  }
}

export default RobloxDocsDataFetcher;
