import { getLokaliseClient, getProjectId } from "./lokalise";
import { readFileSync } from "fs";
import type {
  CreateKeyData,
  SupportedPlatforms,
  ScreenshotData,
  Filenames,
  File,
  Key,
  KeyParamsWithPagination,
  Translation as LokaliseTranslation,
} from "@lokalise/node-api";
import { getAllKeys, hasKeys, addSingleKey, SortOption, getKeyById, type DatabaseFilters } from "./database";
import * as syncService from "./sync-service";
import { getLanguageName } from "../data/languages";
import type { Platform } from "../types";

export interface TranslationFile {
  fileId: number;
  filename: string;
}

export interface CreateTranslationKeyParams {
  keyName: string;
  translationValue: string;
  description?: string;
  screenshotPaths?: string[];
  isPlural?: boolean;
  platform: Platform | string;
  assignedFile?: string;
}

export interface ListKeysParams {
  platform?: SupportedPlatforms;
  searchQuery?: string;
  limit?: number;
  page?: number;
  includeTranslations?: boolean;
  includeScreenshots?: boolean;
}

export interface ListKeysFromDatabaseParams {
  platforms?: string[];
  searchQuery?: string;
  searchInTranslations?: boolean;
  limit?: number;
  sortBy?: SortOption;
}

export interface ProcessedTranslationKey {
  keyId: number;
  keyName: string;
  defaultTranslation: string;
  mainTranslation: string;
  platforms: string[];
  isPlural: boolean;
  tags: string[];
  description?: string;
  context?: string;
  createdAt?: string; // ISO date string
  modifiedAt?: string; // ISO date string
  filenames?: Record<string, string | null>; // Platform-specific filenames
  translations: Array<{
    languageIso: string;
    languageName: string;
    text: string;
  }>;
  screenshots: Array<{
    url: string;
    title: string;
  }>;
}

// Domain utility functions
function normalizePlatform(platform: string): SupportedPlatforms {
  if (platform === "ios" || platform === "android" || platform === "other") {
    return platform;
  }
  return "web";
}

function processScreenshotPath(filePath: string): ScreenshotData | null {
  try {
    const fileBuffer = readFileSync(filePath);
    const base64Data = fileBuffer.toString("base64");
    const mimeType = getMimeType(filePath);
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    return {
      data: dataUri,
      title: getFileName(filePath),
    };
  } catch {
    return null;
  }
}

function getMimeType(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  };
  return mimeTypes[extension || ""] || "image/png";
}

function getFileName(filePath: string): string {
  return filePath.split("/").pop() || "Screenshot";
}

function isTranslation(obj: unknown): obj is LokaliseTranslation {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const candidate = obj as Record<string, unknown>;
  return "translation" in candidate && typeof candidate.translation === "string";
}

function extractKeyName(key: Key): string {
  if (typeof key.key_name === "string") {
    return key.key_name;
  }
  const keyName = key.key_name;
  if (!keyName) {
    return "Unknown";
  }
  return keyName.web || keyName.ios || keyName.android || keyName.other || "Unknown";
}

function extractMainTranslation(key: Key): string {
  if (!key.translations) {
    return "";
  }
  const firstTranslation = Object.values(key.translations)[0];
  if (isTranslation(firstTranslation)) {
    return firstTranslation.translation || "";
  }
  return "";
}

function extractDefaultTranslation(key: Key): string {
  if (!key.translations) {
    return "";
  }

  // Prefer English translation if available
  const englishTranslation = Object.values(key.translations).find((trans) => {
    if (isTranslation(trans)) {
      return trans.language_iso?.toLowerCase() === "en";
    }
    return false;
  });

  if (isTranslation(englishTranslation)) {
    return englishTranslation.translation || "";
  }

  // Fallback to first available translation
  return extractMainTranslation(key);
}

function processScreenshots(screenshots: Key["screenshots"]): Array<{ url: string; title: string }> {
  if (!screenshots) {
    return [];
  }

  return screenshots
    .map((screenshot) => {
      if (typeof screenshot !== "object" || !screenshot) {
        return null;
      }

      // Handle direct screenshot object with url and title
      if ("url" in screenshot && typeof screenshot.url === "string") {
        return {
          url: screenshot.url,
          title:
            ("title" in screenshot && typeof screenshot.title === "string" ? screenshot.title : null) || "Screenshot",
        };
      }

      // Handle nested screenshot structure
      if ("screenshot" in screenshot && typeof screenshot.screenshot === "object" && screenshot.screenshot) {
        const nestedScreenshot = screenshot.screenshot;
        if ("url" in nestedScreenshot && typeof nestedScreenshot.url === "string") {
          return {
            url: nestedScreenshot.url,
            title:
              ("title" in nestedScreenshot && typeof nestedScreenshot.title === "string"
                ? nestedScreenshot.title
                : null) || "Screenshot",
          };
        }
      }

      // Handle url_thumbnail fallback
      if ("url_thumbnail" in screenshot && typeof screenshot.url_thumbnail === "string") {
        return {
          url: screenshot.url_thumbnail,
          title:
            ("title" in screenshot && typeof screenshot.title === "string" ? screenshot.title : null) || "Screenshot",
        };
      }

      return null;
    })
    .filter((s): s is { url: string; title: string } => s !== null);
}

function processTranslations(
  translations: Key["translations"],
  getLanguageName: (isoCode: string) => string,
): Array<{ languageIso: string; languageName: string; text: string }> {
  if (!translations) {
    return [];
  }

  return Object.entries(translations)
    .map(([, trans]) => {
      if (isTranslation(trans)) {
        const isoCode = trans.language_iso || "Unknown";
        return {
          languageIso: isoCode,
          languageName: getLanguageName(isoCode),
          text: trans.translation || "",
        };
      }
      return null;
    })
    .filter((t): t is { languageIso: string; languageName: string; text: string } => t !== null);
}

/**
 * Client for extension domain logic
 * Provides a clean abstraction over the Lokalise SDK and handles all business logic
 */
export class Client {
  private get projectId(): string {
    return getProjectId();
  }

  private get client() {
    return getLokaliseClient();
  }

  /**
   * List all files in the project
   */
  async listFiles(): Promise<TranslationFile[]> {
    const response = await this.client.files().list({ project_id: this.projectId });
    return (response.items || []).map((file: File) => ({
      fileId: file.file_id,
      filename: file.filename,
    }));
  }

  /**
   * Create a new translation key
   * Processes screenshot paths and handles all domain logic internally
   * Automatically adds the key to the local database
   */
  async createTranslationKey(params: CreateTranslationKeyParams): Promise<void> {
    const platform = normalizePlatform(params.platform);

    // Process screenshots: read files and convert to base64
    const screenshots: ScreenshotData[] = [];
    if (params.screenshotPaths && params.screenshotPaths.length > 0) {
      for (const filePath of params.screenshotPaths) {
        const processedScreenshot = processScreenshotPath(filePath);
        if (processedScreenshot) {
          screenshots.push(processedScreenshot);
        }
        // Silently skip failed screenshots - they'll be logged but won't block the operation
      }
    }

    // Build filenames object if file is assigned
    const filenames: Filenames | undefined =
      params.assignedFile && params.assignedFile !== "none" && params.assignedFile.trim()
        ? {
            [platform]: params.assignedFile.trim(),
          }
        : undefined;

    // Build key_name as per-platform object (required for projects with per-platform key names)
    const keyName: Filenames = {
      web: params.keyName,
      ios: params.keyName,
      android: params.keyName,
      other: params.keyName,
    };

    const keyData: CreateKeyData = {
      key_name: keyName,
      platforms: [platform],
      is_plural: params.isPlural || false,
      description: params.description || undefined,
      screenshots: screenshots.length > 0 ? screenshots : undefined,
      filenames,
      translations: [
        {
          language_iso: "en",
          translation: params.translationValue,
        },
      ],
    };

    const response = await this.client.keys().create(
      {
        keys: [keyData],
      },
      { project_id: this.projectId },
    );

    // Add the created key to local database
    try {
      const createdKey = response.items[0];
      const processedKey = this.processKey(createdKey, getLanguageName);
      await addSingleKey(processedKey);
    } catch (error) {
      console.error("Failed to add key to local database:", error);
      // Continue anyway - the key was created successfully in Lokalise
    }
  }

  /**
   * List translation keys with optional filtering
   */
  async listKeys(params: ListKeysParams = {}): Promise<Key[]> {
    const {
      platform,
      searchQuery,
      limit = 200,
      page = 1,
      includeTranslations = true,
      includeScreenshots = true,
    } = params;

    const baseParams: KeyParamsWithPagination = {
      project_id: this.projectId,
      limit,
      page,
      include_translations: includeTranslations ? 1 : 0,
      include_screenshots: includeScreenshots ? 1 : 0,
    };

    // Filter by platform on the server side
    if (platform && (platform === "web" || platform === "ios" || platform === "android" || platform === "other")) {
      baseParams.filter_platforms = platform;
    }

    // Filter by search query on the server side
    if (searchQuery && searchQuery.trim()) {
      baseParams.filter_keys = searchQuery.trim();
    }

    const response = await this.client.keys().list(baseParams);

    // Log pagination info for debugging
    console.log(`Lokalise API response - Page: ${page}, Items: ${response.items?.length || 0}`);

    return response.items || [];
  }

  /**
   * Get a single translation key by ID
   */
  async getKey(keyId: number): Promise<Key> {
    const response = await this.client.keys().get(keyId, {
      project_id: this.projectId,
    });
    return response;
  }

  /**
   * Process a Key into a ProcessedTranslationKey with all domain logic applied
   * This method handles all data transformation and extraction logic
   */
  processKey(key: Key, getLanguageName: (isoCode: string) => string): ProcessedTranslationKey {
    return {
      keyId: key.key_id,
      keyName: extractKeyName(key),
      defaultTranslation: extractDefaultTranslation(key),
      mainTranslation: extractMainTranslation(key),
      platforms: key.platforms || [],
      isPlural: key.is_plural || false,
      tags: key.tags || [],
      description: key.description,
      context: key.context,
      createdAt: key.created_at,
      modifiedAt: key.modified_at,
      filenames: key.filenames,
      translations: processTranslations(key.translations, getLanguageName),
      screenshots: processScreenshots(key.screenshots),
    };
  }

  /**
   * Process multiple keys into ProcessedTranslationKey array
   */
  processKeys(keys: Key[], getLanguageName: (isoCode: string) => string): ProcessedTranslationKey[] {
    return keys.map((key) => this.processKey(key, getLanguageName));
  }

  /**
   * List keys from the local database with advanced filtering
   * Supports multiple platforms and advanced search capabilities
   */
  async listKeysFromDatabase(params: ListKeysFromDatabaseParams = {}): Promise<ProcessedTranslationKey[]> {
    const filters: DatabaseFilters = {
      platforms: params.platforms && params.platforms.length > 0 ? params.platforms : undefined,
      searchQuery: params.searchQuery,
      searchInTranslations: params.searchInTranslations ?? true,
      limit: params.limit || 200, // Default to 200 results max
      sortBy: params.sortBy,
    };

    return await getAllKeys(filters);
  }

  /**
   * Get a single key from the database by ID
   */
  async getKeyFromDatabase(keyId: number): Promise<ProcessedTranslationKey | null> {
    return await getKeyById(keyId);
  }

  /**
   * Check if the database has been initialized with keys
   */
  async hasDatabaseKeys(): Promise<boolean> {
    return await hasKeys();
  }

  /**
   * Sync all keys from Lokalise to the local database
   * Fetches keys in batches and stores them in a transaction
   */
  async syncFromLokalise(
    onProgress?: (current: number, total: number) => void,
  ): Promise<{ success: boolean; error?: Error; keysCount: number }> {
    return await syncService.syncFromLokalise(onProgress);
  }

  /**
   * Check if an initial sync is needed (database is empty)
   */
  async needsInitialSync(): Promise<boolean> {
    return await syncService.needsInitialSync();
  }

  /**
   * Get the current sync status
   */
  getSyncStatus(): {
    status: "idle" | "syncing" | "error";
    error?: Error;
    progress?: { current: number; total: number };
  } {
    return syncService.getSyncStatus();
  }

  /**
   * Start background sync with a specified interval
   * @param intervalMinutes - Interval in minutes between syncs
   */
  startBackgroundSync(intervalMinutes?: number): void {
    syncService.startBackgroundSync(intervalMinutes);
  }

  /**
   * Stop background sync
   */
  stopBackgroundSync(): void {
    syncService.stopBackgroundSync();
  }
}

// Export a singleton instance for convenience
export const client = new Client();
