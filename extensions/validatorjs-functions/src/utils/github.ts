// src/utils/github.ts

import fetch, { Response, Headers as NodeFetchHeaders } from "node-fetch";
import { showToast, Toast, LocalStorage, environment } from "@raycast/api";
import {
  GitHubResponse,
  RateLimit,
  FetchOptions,
  GitHubContent,
  ValidatorFunction,
  ValidatorFunctionWithImpl,
} from "../types/index";
import { delay, createCacheEntry, isValidCache } from "./cache";

export const GITHUB_API_BASE = "https://api.github.com/repos/validatorjs/validator.js/contents";
export const README_URL = `${GITHUB_API_BASE}/README.md`;
export const RATE_LIMIT_DELAY = 100; // 100ms between requests

/**
 * Custom error class for handling GitHub API errors.
 */
class GitHubAPIError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "GitHubAPIError";
  }
}

/**
 * Parses rate limit information from HTTP headers.
 * @param headers - The headers from the HTTP response.
 * @returns An object containing rate limit information.
 */
function parseRateLimitHeaders(headers: NodeFetchHeaders): RateLimit {
  const parseHeader = (name: string) => parseInt(headers.get(name) || "0", 10);
  return {
    limit: parseHeader("x-ratelimit-limit"),
    remaining: parseHeader("x-ratelimit-remaining"),
    reset: new Date(parseHeader("x-ratelimit-reset") * 1000),
    used: parseHeader("x-ratelimit-used"),
  };
}

/**
 * Logs the current rate limit status and shows a toast notification if the remaining requests are low.
 * @param rateLimit - The rate limit information.
 */
function checkRateLimit(rateLimit: RateLimit) {
  environment.isDevelopment &&
    console.log("Rate limit status:", {
      remaining: rateLimit.remaining,
      limit: rateLimit.limit,
      used: rateLimit.used,
      reset: rateLimit.reset.toLocaleString(),
    });

  if (rateLimit.remaining < 50) {
    showToast(
      Toast.Style.Failure,
      "Rate limit running low",
      `${rateLimit.remaining} requests remaining. Resets at ${rateLimit.reset.toLocaleTimeString()}`,
    );
  }
}

/**
 * Handles errors from HTTP fetch requests.
 * @param response - The HTTP response object.
 * @throws GitHubAPIError with the response status and error text.
 */
async function handleFetchError(response: Response): Promise<void> {
  const errorText = await response.text();
  console.error(`API Error (${response.status}):`, errorText);
  throw new GitHubAPIError(`HTTP error! status: ${response.status} - ${errorText}`, response.status);
}

/**
 * Generates a cache key for storing GitHub content.
 * @param url - The URL of the GitHub content.
 * @returns A string representing the cache key.
 */
function generateCacheKey(url: string): string {
  return `github-content-${url}`;
}

/**
 * Fetches data from a URL with rate limiting and error handling.
 * @param url - The URL to fetch data from.
 * @param options - Fetch options including headers.
 * @returns A promise that resolves to the fetched data and rate limit information.
 */
export async function fetchWithRateLimit<T>(url: string, options: FetchOptions): Promise<GitHubResponse<T>> {
  await delay(RATE_LIMIT_DELAY);

  const response = await fetch(url, options);
  const rateLimit = parseRateLimitHeaders(response.headers);

  checkRateLimit(rateLimit);

  if (!response.ok) {
    await handleFetchError(response);
  }

  const data = (await response.json()) as T;
  return { data, rateLimit };
}

/**
 * Fetches content from GitHub, checking the cache first and updating it after fetching.
 * @param path - The path to the content in the GitHub repository.
 * @param options - Fetch options including headers.
 * @returns A promise that resolves to the decoded content as a string.
 * @throws GitHubAPIError if no content is found at the specified path.
 */
export async function fetchGitHubContent(path: string, options: FetchOptions): Promise<string> {
  const url = path.startsWith("http") ? path : `${GITHUB_API_BASE}/${path}`;
  const cacheKey = generateCacheKey(url);

  try {
    const cachedData = await LocalStorage.getItem(cacheKey);

    if (cachedData && typeof cachedData === "string") {
      const parsed = JSON.parse(cachedData);
      if (isValidCache(parsed) && typeof parsed.content === "string") {
        return parsed.content;
      }
    }
  } catch (error) {
    console.error("Cache read error:", error);
  }

  const { data } = await fetchWithRateLimit<GitHubContent>(url, options);

  if (!data.content) {
    throw new GitHubAPIError("No content found at the specified path.", 404);
  }

  const decodedContent = Buffer.from(data.content, "base64").toString("utf-8");

  try {
    await LocalStorage.setItem(cacheKey, JSON.stringify(createCacheEntry(decodedContent)));
  } catch (error) {
    console.error("Cache write error:", error);
  }

  return decodedContent;
}

/**
 * Constructs a full file path for imports, assuming a specific directory structure.
 * @param importPath - The relative import path.
 * @returns The full path to the file.
 */
function constructFullPath(importPath: string): string {
  return importPath.startsWith("./") ? `src/lib${importPath.slice(1)}` : `src/lib/${importPath}`;
}

/**
 * Finds import statements in a file, fetches the imported content, and inlines it into the main content.
 * @param content - The content containing import statements.
 * @param headers - Headers to use for fetching imported content.
 * @returns A promise that resolves to the content with inlined imports.
 */
async function fetchAndInlineImports(content: string, headers: Record<string, string>): Promise<string> {
  const importRegex = /import\s+(\w+)\s+from\s+'([^']+)';?\s*/g;
  let result = content;
  const imports = Array.from(content.matchAll(importRegex));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    imports.map(async ([fullImport, importName, importPath]) => {
      try {
        const fullPath = constructFullPath(importPath);
        const importedContent = await fetchGitHubContent(`${fullPath}.js`, { headers });
        result = result.replace(fullImport, `// Inlined from ${importPath}:\n${importedContent}\n`);
      } catch (error) {
        console.error(`Failed to fetch import ${importPath}:`, error);
      }
    }),
  );

  return result;
}

/**
 * Loads a JavaScript file from the GitHub repository, inlines its imports, and returns a function with its full implementation.
 * @param func - The validator function to load.
 * @param headers - Optional headers for the fetch request.
 * @returns A promise that resolves to the validator function with its full implementation.
 * @throws Error if the implementation cannot be loaded.
 */
export async function loadImplementation(
  func: ValidatorFunction,
  headers?: Record<string, string>,
): Promise<ValidatorFunctionWithImpl> {
  const options = {
    headers: headers || {},
  };

  try {
    const content = await fetchGitHubContent(`src/lib/${func.name}.js`, options);
    const contentWithInlinedImports = await fetchAndInlineImports(content, options.headers);

    const implementation = `// Implementation from validator.js
// https://github.com/validatorjs/validator.js

${contentWithInlinedImports}`;

    return {
      ...func,
      fullImplementation: implementation,
    };
  } catch (error) {
    console.error(`Failed to load implementation for ${func.name}:`, error);
    throw error;
  }
}

/**
 * Verifies if the provided GitHub token is valid by making a test request.
 * @param headers - The headers containing the GitHub token
 * @returns A promise that resolves to a boolean indicating if the token is valid
 */
export async function verifyGitHubToken(headers: Record<string, string>): Promise<boolean> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        ...headers,
        Accept: "application/vnd.github.v3+json",
      },
    });

    return response.status === 200;
  } catch (error) {
    return false;
  }
}
