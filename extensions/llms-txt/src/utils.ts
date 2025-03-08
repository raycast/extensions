import type { WebsiteData, Website, Category, ActionType } from "./types";
import { getPreferenceValues, LocalStorage, showToast, Toast, Clipboard, open } from "@raycast/api";
import fetch from "node-fetch";
import { addToHistory } from "./storage";
import { showFailureToast } from "@raycast/utils";

const CACHE_KEY = "websites-data";
const CACHE_TIMESTAMP_KEY = "websites-data-timestamp";
const MAX_RETRY_DEPTH = 1; // Prevent infinite recursion
export const DEFAULT_ACTION: ActionType = "view_llms";

interface Preferences {
  githubToken?: string;
  cacheDuration?: string;
}

const websites = "https://raw.githubusercontent.com/thedaviddias/llms-txt-hub/refs/heads/main/data/websites.json";

// Custom error types for better error handling
class CacheError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "CacheError";
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function isValidWebsite(w: unknown): w is Website {
  if (!w || typeof w !== "object") return false;
  const website = w as Partial<Website>;

  return (
    typeof website.name === "string" &&
    typeof website.domain === "string" &&
    typeof website.description === "string" &&
    typeof website.llmsTxtUrl === "string" &&
    typeof website.category === "string"
  );
}

function isValidWebsiteData(data: unknown): data is WebsiteData {
  return Array.isArray(data) && data.every(isValidWebsite);
}

async function clearCache(): Promise<void> {
  await Promise.all([LocalStorage.removeItem(CACHE_KEY), LocalStorage.removeItem(CACHE_TIMESTAMP_KEY)]);
}

async function validateAndParseCache(cachedData: string, timestamp: number, ttl: number): Promise<WebsiteData | null> {
  // Validate timestamp
  const now = Date.now();
  if (timestamp > now) {
    console.debug("Cache timestamp is in the future, invalidating cache");
    await clearCache();
    return null;
  }

  // Check freshness
  if (now - timestamp >= ttl) {
    console.debug("Cache has expired");
    return null;
  }

  try {
    const parsed = JSON.parse(cachedData);
    if (!isValidWebsiteData(parsed)) {
      throw new ValidationError("Invalid website data structure in cache");
    }
    return parsed;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new CacheError("Failed to parse cached data", error);
  }
}

export async function fetchWebsitesData(forceRefresh = false, retryDepth = 0): Promise<WebsiteData> {
  const preferences = getPreferenceValues<Preferences>();
  const parsedDuration = Number.parseInt(preferences.cacheDuration ?? "24", 10);
  const CACHE_TTL = Math.max(1, parsedDuration) * 60 * 60 * 1000;

  // Prevent infinite recursion
  if (retryDepth > MAX_RETRY_DEPTH) {
    throw new Error("Max retry depth exceeded while fetching website data");
  }

  // Check cache first unless force refresh
  if (!forceRefresh) {
    try {
      const [cachedData, cachedTimestamp] = await Promise.all([
        LocalStorage.getItem<string>(CACHE_KEY),
        LocalStorage.getItem<string>(CACHE_TIMESTAMP_KEY),
      ]);

      if (cachedData && cachedTimestamp) {
        const timestamp = Number.parseInt(cachedTimestamp, 10);
        if (Number.isNaN(timestamp)) {
          console.debug("Invalid timestamp in cache");
          await clearCache();
        } else {
          try {
            const parsed = await validateAndParseCache(cachedData, timestamp, CACHE_TTL);
            if (parsed) {
              return parsed;
            }
          } catch (error) {
            console.debug(`Cache validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            await clearCache();
          }
        }
      }
    } catch (error) {
      console.debug(`Cache access failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      // Continue to fetch fresh data
    }
  }

  // Fetch fresh data
  const { githubToken } = preferences;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.raw",
  };

  if (githubToken?.trim()) {
    headers.Authorization = `token ${githubToken.trim()}`;
  }

  try {
    const response = await fetch(websites, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch data: HTTP ${response.status} - ${response.statusText}`);
    }

    let data: WebsiteData;

    try {
      data = await response.json();
    } catch (parseError) {
      throw new ValidationError(
        `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}`,
      );
    }

    if (!isValidWebsiteData(data)) {
      throw new ValidationError("Invalid data format received from the server");
    }

    // Update cache
    await Promise.all([
      LocalStorage.setItem(CACHE_KEY, JSON.stringify(data)),
      LocalStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString()),
    ]);

    return data;
  } catch (error) {
    // Fall back to cached data if available
    try {
      const cachedData = await LocalStorage.getItem<string>(CACHE_KEY);
      const cachedTimestamp = await LocalStorage.getItem<string>(CACHE_TIMESTAMP_KEY);

      if (cachedData && cachedTimestamp) {
        const timestamp = Number.parseInt(cachedTimestamp, 10);
        if (!Number.isNaN(timestamp)) {
          const parsed = JSON.parse(cachedData);
          if (isValidWebsiteData(parsed)) {
            console.debug("Falling back to cached data after fetch failure");
            return parsed;
          }
        }
      }
    } catch (cacheError) {
      console.debug("Failed to read cache during fallback");
    }

    // If we get here, both fetch and cache fallback failed
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await showFailureToast("Failed to fetch websites data", {
      title: "Failed to fetch websites data",
      message: errorMessage,
    });
    throw new Error(`Failed to fetch websites data: ${errorMessage}`);
  }
}

export function getCategoryIcon(category: string): string {
  switch (category) {
    case "ai-ml":
      return "🤖";
    case "data-analytics":
      return "📊";
    case "developer-tools":
      return "💻";
    case "infrastructure-cloud":
      return "☁️";
    case "integration-automation":
      return "⚡";
    case "security-identity":
      return "🔒";
    default:
      return "🔍";
  }
}

export function getDomainWithoutProtocol(domain: string): string {
  return domain.replace(/^https?:\/\//, "");
}

export function formatCategoryName(category: Category): string {
  // Special cases for categories that should use "&"
  switch (category) {
    case "ai-ml":
      return "AI & Machine Learning";
    case "data-analytics":
      return "Data & Analytics";
    case "infrastructure-cloud":
      return "Infrastructure & Cloud";
    case "security-identity":
      return "Security & Identity";
    case "integration-automation":
      return "Integration & Automation";
    case "developer-tools":
      return "Developer Tools";
    default:
      // For any other categories, capitalize each word
      return category
        .split("-")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
  }
}

export function shouldShowViewLlmsAction(primaryAction: ActionType, hasFullTxt: boolean): boolean {
  return primaryAction !== DEFAULT_ACTION && !(primaryAction === "view_llms_full" && !hasFullTxt);
}

export async function handleWebsiteAction(website: Website, action: ActionType): Promise<void> {
  try {
    let url: string | undefined;

    // Determine the URL based on action
    switch (action) {
      case "view_llms":
        url = website.llmsTxtUrl;
        break;
      case "view_llms_full":
        url = website.llmsFullTxtUrl || website.llmsTxtUrl;
        break;
      case "copy_llms":
        await Clipboard.copy(website.llmsTxtUrl);
        await showToast({
          style: Toast.Style.Success,
          title: "Copied llms.txt URL",
        });
        break;
      case "copy_llms_full":
        await Clipboard.copy(website.llmsFullTxtUrl || website.llmsTxtUrl);
        await showToast({
          style: Toast.Style.Success,
          title: "Copied llms-full.txt URL",
        });
        break;
    }

    // If we have a URL to open, try to open it
    if (url) {
      try {
        await open(url);
      } catch (openError) {
        // Fallback to system default browser
        await open(url); // Let the system handle it
      }
    }

    // Add to history
    await addToHistory(website, action);
  } catch (error) {
    await showFailureToast("Failed to perform action", {
      title: "Failed to perform action",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
