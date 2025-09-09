import { LocalStorage, showToast, Toast } from "@raycast/api";
import { ofetch } from "ofetch";
import { ExtensionPreferences } from "./types";

/**
 * Parse a Set-Cookie header into name=value format
 * @param setCookieString - The Set-Cookie header string
 * @returns The parsed cookie string or null if invalid
 */
function parseSetCookieHeader(setCookieString: string): string | null {
  if (!setCookieString) {
    return null;
  }
  const parts = setCookieString.split(";");
  if (parts.length > 0) {
    return parts[0].trim();
  }
  return null;
}

/**
 * Get authentication cookie from the Chhoto URL login endpoint
 * @param url - The login URL
 * @param params - Request parameters including method, body, and headers
 * @returns Authentication cookie string or null if failed
 */
async function getAuthCookieValue(
  url: string,
  params: {
    method: string;
    body: string;
    headers: Record<string, string>;
  },
): Promise<string | null> {
  try {
    const response = await ofetch.raw(url, params);
    const headers = response.headers;

    let setCookieHeaders: string[] = [];

    // Type assertion for Node.js environment headers
    const nodeHeaders = headers as unknown as {
      raw?: () => Record<string, string[]>;
    };
    if (nodeHeaders.raw && nodeHeaders.raw()["set-cookie"]) {
      setCookieHeaders = nodeHeaders.raw()["set-cookie"];
    } else if (headers.getSetCookie) {
      setCookieHeaders = headers.getSetCookie();
    } else {
      const setCookieHeader = headers.get("set-cookie");
      if (setCookieHeader) {
        setCookieHeaders = [setCookieHeader];
      }
    }

    if (setCookieHeaders.length > 0) {
      const authCookie = setCookieHeaders.find((cookie) =>
        cookie.startsWith("id="),
      );
      if (authCookie) {
        return parseSetCookieHeader(authCookie);
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching data for authentication:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Authentication Failed",
      message:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
    return null;
  }
}

/**
 * Get cached authentication cookie or fetch a fresh one if expired/invalid
 * @param preferences - Extension preferences containing host and password
 * @returns Authentication cookie string or null if failed
 */
export async function getCachedOrFreshAuthCookie(
  preferences: ExtensionPreferences,
): Promise<string | null> {
  const COOKIE_CACHE_KEY = "chhoto-auth-cookie";
  const COOKIE_TIMESTAMP_KEY = "chhoto-auth-cookie-timestamp";
  const COOKIE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  try {
    // Check if we have a cached cookie
    const cachedCookie = await LocalStorage.getItem<string>(COOKIE_CACHE_KEY);
    const cachedTimestamp =
      await LocalStorage.getItem<string>(COOKIE_TIMESTAMP_KEY);

    if (cachedCookie && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      const now = Date.now();

      // If cookie is still valid (less than 24 hours old), use it
      if (now - timestamp < COOKIE_CACHE_DURATION) {
        // Test if the cookie is still valid by making a simple request
        try {
          const testUrl = new URL("/api/all", preferences["chhoto-host"]);
          await ofetch(testUrl.href, {
            method: "GET",
            headers: {
              Cookie: cachedCookie,
            },
          });
          return cachedCookie;
        } catch {
          // Cookie is invalid, remove from cache and get a new one
          await LocalStorage.removeItem(COOKIE_CACHE_KEY);
          await LocalStorage.removeItem(COOKIE_TIMESTAMP_KEY);
        }
      }
    }

    // Get a fresh cookie
    const authCookie = await getAuthCookieValue(
      new URL("/api/login", preferences["chhoto-host"]).href,
      {
        method: "POST",
        body: preferences["chhoto-password"],
        headers: {
          "Content-Type": "text/plain",
        },
      },
    );

    if (authCookie) {
      // Cache the new cookie
      await LocalStorage.setItem(COOKIE_CACHE_KEY, authCookie);
      await LocalStorage.setItem(COOKIE_TIMESTAMP_KEY, Date.now().toString());
    }

    return authCookie;
  } catch (error) {
    console.error("Error managing auth cookie:", error);
    return null;
  }
}
