import type { WebsiteData, Website, Category, ActionType } from "./types";
import { getPreferenceValues, LocalStorage, showToast, Toast, Clipboard, open } from "@raycast/api";
import fetch from "node-fetch";
import { addToHistory } from "./storage";

const CACHE_KEY = "websites-data";
const CACHE_TIMESTAMP_KEY = "websites-data-timestamp";

interface Preferences {
  githubToken?: string;
  cacheDuration?: string;
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

export async function fetchWebsitesData(forceRefresh = false): Promise<WebsiteData> {
  const preferences = getPreferenceValues<Preferences>();
  const CACHE_TTL = Number.parseInt(preferences.cacheDuration ?? "24", 10) * 60 * 60 * 1000; // Convert hours to milliseconds

  // Check cache first
  if (!forceRefresh) {
    const cachedData = await LocalStorage.getItem<string>(CACHE_KEY);
    const cachedTimestamp = await LocalStorage.getItem<string>(CACHE_TIMESTAMP_KEY);

    if (cachedData && cachedTimestamp) {
      const timestamp = Number.parseInt(cachedTimestamp, 10);
      if (Date.now() - timestamp < CACHE_TTL) {
        const parsed = JSON.parse(cachedData);
        if (isValidWebsiteData(parsed)) {
          return parsed;
        }
        // If cached data is invalid, continue to fetch fresh data
      }
    }
  }

  // Fetch fresh data
  const { githubToken } = getPreferenceValues<Preferences>();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.raw",
  };

  if (githubToken) {
    headers.Authorization = `token ${githubToken}`;
  }

  try {
    const response = await fetch("https://raw.githubusercontent.com/thedaviddias/llms-txt-hub/main/websites.json", {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data: HTTP ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    if (!isValidWebsiteData(data)) {
      throw new Error("Invalid data format received from the server");
    }

    // Update cache
    await LocalStorage.setItem(CACHE_KEY, JSON.stringify(data));
    await LocalStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());

    return data;
  } catch (error) {
    // Fall back to cached data if available
    const cachedData = await LocalStorage.getItem<string>(CACHE_KEY);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      if (isValidWebsiteData(parsed)) {
        return parsed;
      }
    }

    throw new Error(
      error instanceof Error ? `Failed to fetch websites data: ${error.message}` : "Failed to fetch websites data",
    );
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
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to perform action",
      message: String(error),
    });
  }
}
