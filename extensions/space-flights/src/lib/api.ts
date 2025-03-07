import { LocalStorage, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Launch, LaunchesResponse, ApiThrottleResponse, ThrottleItem, LaunchDetail } from "./types";
import fetch from "node-fetch";

// API URLs for production and development
const PROD_API_URL = "https://ll.thespacedevs.com/2.2.0";
const DEV_API_URL = "https://lldev.thespacedevs.com/2.2.0"; // Development API with higher rate limits

// Determine which API to use based on NODE_ENV
export const isDevelopment = process.env.NODE_ENV !== "development";
export const BASE_URL = isDevelopment ? DEV_API_URL : PROD_API_URL;

// Export the base URLs for use in other parts of the app (for filtering)
export const API_BASE_URLS = ["https://ll.thespacedevs.com/", "https://lldev.thespacedevs.com/"];

// Log which API we're using
console.log(`Using ${isDevelopment ? "development" : "production"} API: ${BASE_URL}`);

const CACHE_KEY = "space-flights-launches-cache";
const CACHE_TIMESTAMP_KEY = "space-flights-launches-timestamp";
const THROTTLE_INFO_KEY = "space-flights-throttle-info";
// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 60 * 60 * 1000;
// Retry delay in milliseconds (5 seconds)
const RETRY_DELAY = 5000;

// Custom error class for API errors
export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Custom error class for rate limit errors
export class RateLimitError extends Error {
  isRateLimitError = true;
  next_use_secs: number;

  constructor(message: string, nextUseSecs: number) {
    super(message);
    this.name = "RateLimitError";
    this.next_use_secs = nextUseSecs;
  }
}

/**
 * Fetches upcoming launches with caching to respect rate limits
 */
export const useUpcomingLaunches = () => {
  return usePromise(async () => {
    return await getUpcomingLaunches();
  });
};

/**
 * Fetches API throttle information to check rate limits
 */
export const useApiThrottleInfo = () => {
  return usePromise(async () => {
    return await getApiThrottleInfo();
  });
};

/**
 * Sleep for a specified number of milliseconds
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Format seconds into a human-readable string
 */
export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return "now";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `in ${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""}`;
  } else if (remainingSeconds === 0) {
    return `in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  } else {
    return `in ${minutes} minute${minutes !== 1 ? "s" : ""} and ${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""}`;
  }
};

/**
 * Gets the most restrictive throttle info (highest next_use_secs)
 */
const getMostRestrictiveThrottle = (throttleData: ApiThrottleResponse): ThrottleItem | null => {
  // Handle case where throttleData is not an array or is empty
  if (!throttleData || !Array.isArray(throttleData) || throttleData.length === 0) {
    return null;
  }

  // Find the throttle with the highest next_use_secs value
  try {
    return throttleData.reduce(
      (prev, current) => (current.next_use_secs > prev.next_use_secs ? current : prev),
      throttleData[0],
    );
  } catch (error) {
    console.error("Error processing throttle data:", error);
    // Return the first item if reduce fails
    return throttleData[0] || null;
  }
};

/**
 * Fetches API throttle information
 */
const getApiThrottleInfo = async (): Promise<ThrottleItem | null> => {
  try {
    // Use the same BASE_URL for throttle info to get accurate rate limit information
    const response = await fetch(`${BASE_URL}/api-throttle/`);

    if (response.status === 429) {
      // If the throttle endpoint itself is rate limited, return a basic throttle info
      return {
        your_request_limit: 15,
        limit_frequency_secs: 3600,
        current_use: 15,
        next_use_secs: 300, // Default to 5 minutes wait
        ident: "default",
      };
    }

    if (!response.ok) {
      throw new ApiError(`API error: ${response.status}`, response.status);
    }

    const rawData = await response.json();

    // Ensure data is in expected format
    const data: ApiThrottleResponse = Array.isArray(rawData) ? rawData : [rawData];

    // Log the structure for debugging
    console.log("Throttle API response structure:", JSON.stringify(data).substring(0, 200));

    // Cache the throttle info
    await LocalStorage.setItem(THROTTLE_INFO_KEY, JSON.stringify(data));

    // Get the most restrictive throttle
    return getMostRestrictiveThrottle(data);
  } catch (error) {
    console.error("Error fetching API throttle info:", error);

    // Try to return cached throttle info if available
    try {
      const cachedThrottleInfo = await LocalStorage.getItem<string>(THROTTLE_INFO_KEY);
      if (cachedThrottleInfo) {
        const throttleData = JSON.parse(cachedThrottleInfo);
        const parsedData: ApiThrottleResponse = Array.isArray(throttleData) ? throttleData : [throttleData];
        return getMostRestrictiveThrottle(parsedData);
      }
    } catch (parseError) {
      console.error("Error parsing cached throttle info:", parseError);
    }

    // If everything fails, return a conservative default
    return {
      your_request_limit: 15,
      limit_frequency_secs: 3600,
      current_use: 15,
      next_use_secs: 300, // Default to 5 minutes wait
      ident: "default",
    };
  }
};

/**
 * Checks if we're allowed to make a request based on throttle info
 */
const canMakeRequest = (throttleInfo: ThrottleItem | null): boolean => {
  if (!throttleInfo) return true;
  return throttleInfo.next_use_secs <= 0;
};

/**
 * Fetches upcoming launches with caching to respect rate limits
 */
const getUpcomingLaunches = async (retryCount = 0): Promise<Launch[]> => {
  try {
    // Check if we have cached data and it's still valid
    const cachedData = await LocalStorage.getItem<string>(CACHE_KEY);
    const cachedTimestamp = await LocalStorage.getItem<string>(CACHE_TIMESTAMP_KEY);

    if (cachedData && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp);
      const now = Date.now();

      // If cache is still valid, return cached data
      if (now - timestamp < CACHE_DURATION) {
        return JSON.parse(cachedData) as Launch[];
      }
    }

    // Before making a request, check the throttle info
    const throttleInfo = await getApiThrottleInfo();

    // If we're being rate limited and have next_use_secs > 0
    if (throttleInfo && !canMakeRequest(throttleInfo)) {
      // If we have cached data, use it
      if (cachedData) {
        // Don't show toast here, let the UI handle displaying the countdown
        return JSON.parse(cachedData) as Launch[];
      }

      // If rate limited and no cache, wait if not already retried too many times
      if (retryCount < 2 && throttleInfo.next_use_secs < 30) {
        // Show toast about waiting
        showToast({
          style: Toast.Style.Animated,
          title: "Rate limited by API",
          message: `Waiting ${formatTimeRemaining(throttleInfo.next_use_secs)}...`,
        });

        // Wait until we can make another request
        await sleep(throttleInfo.next_use_secs * 1000);

        // Retry with incremented count
        return getUpcomingLaunches(retryCount + 1);
      }

      // Throw a RateLimitError with proper message
      throw new RateLimitError(
        `Rate limit exceeded. Try again ${formatTimeRemaining(throttleInfo.next_use_secs)}.`,
        throttleInfo.next_use_secs,
      );
    }

    // Cache expired or doesn't exist, fetch new data
    console.warn("⚠️ calling api to fetch upcoming 20 launches ordered by net time to launch");
    const response = await fetch(`${BASE_URL}/launch/upcoming/?limit=20&ordering=net`);

    // Handle rate limiting
    if (response.status === 429) {
      // Get fresh throttle info
      const freshThrottleInfo = await getApiThrottleInfo();

      if (freshThrottleInfo && !canMakeRequest(freshThrottleInfo)) {
        if (retryCount < 2 && freshThrottleInfo.next_use_secs < 30) {
          // Show toast about rate limiting
          showToast({
            style: Toast.Style.Animated,
            title: "Rate limited by API",
            message: `Waiting ${formatTimeRemaining(freshThrottleInfo.next_use_secs)}...`,
          });

          // Wait until we can make another request
          await sleep(freshThrottleInfo.next_use_secs * 1000);

          // Retry with incremented count
          return getUpcomingLaunches(retryCount + 1);
        } else {
          // Throw a RateLimitError with proper message
          throw new RateLimitError(
            `Rate limit exceeded. Try again ${formatTimeRemaining(freshThrottleInfo.next_use_secs)}.`,
            freshThrottleInfo.next_use_secs,
          );
        }
      }

      if (retryCount < 3) {
        // Show toast about rate limiting
        showToast({
          style: Toast.Style.Animated,
          title: "Rate limited by API",
          message: `Retrying in ${RETRY_DELAY / 1000} seconds...`,
        });

        // Wait before retrying
        await sleep(RETRY_DELAY);

        // Retry with incremented count
        return getUpcomingLaunches(retryCount + 1);
      } else {
        throw new ApiError("Rate limit exceeded. Try again later.", 429);
      }
    }

    if (!response.ok) {
      throw new ApiError(`API error: ${response.status}`, response.status);
    }

    const data = (await response.json()) as LaunchesResponse;

    // Cache the response
    await LocalStorage.setItem(CACHE_KEY, JSON.stringify(data.results));
    await LocalStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());

    // Refresh throttle info after a successful request
    await getApiThrottleInfo();

    return data.results;
  } catch (error) {
    // Pass through our special rate limit error objects
    if (error instanceof RateLimitError) {
      console.warn("Rate limit detected:", error);
      throw error;
    } else {
      console.error("Error fetching upcoming launches:", error);
    }

    // For other errors, show toast and try to use cached data
    const errorMessage = error instanceof Error ? error.message : String(error);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch launches",
      message: errorMessage,
    });

    // Try to return cached data even if it's expired
    const cachedData = await LocalStorage.getItem<string>(CACHE_KEY);
    if (cachedData) {
      return JSON.parse(cachedData) as Launch[];
    }

    throw error;
  }
};

/**
 * Force refresh the cache
 */
export const refreshLaunchesCache = async (): Promise<Launch[]> => {
  try {
    // Get throttle info before attempting refresh
    const throttleInfo = await getApiThrottleInfo();

    // Check if we're rate limited
    if (throttleInfo && !canMakeRequest(throttleInfo)) {
      // Throw a RateLimitError with proper message
      throw new RateLimitError(
        `Rate limit exceeded. Try again ${formatTimeRemaining(throttleInfo.next_use_secs)}.`,
        throttleInfo.next_use_secs,
      );
    }

    // Remove cached data
    await LocalStorage.removeItem(CACHE_KEY);
    await LocalStorage.removeItem(CACHE_TIMESTAMP_KEY);

    // Fetch fresh data
    return await getUpcomingLaunches();
  } catch (error) {
    console.error("Error refreshing launches cache:", error);
    throw error;
  }
};

/**
 * Fetches detailed information for a specific launch by URL or ID
 */
export const getLaunchDetails = async (launchUrl: string, retryCount = 0): Promise<LaunchDetail> => {
  try {
    // Verify if we can make a request based on rate limits
    const throttleInfo = await getApiThrottleInfo();

    // If we're being rate limited and have next_use_secs > 0
    if (throttleInfo && !canMakeRequest(throttleInfo)) {
      // If rate limited, wait if not already retried too many times
      if (retryCount < 2 && throttleInfo.next_use_secs < 30) {
        // Show toast about waiting
        showToast({
          style: Toast.Style.Animated,
          title: "Rate limited by API",
          message: `Waiting ${formatTimeRemaining(throttleInfo.next_use_secs)}...`,
        });

        // Wait until we can make another request
        await sleep(throttleInfo.next_use_secs * 1000);

        // Retry with incremented count
        return getLaunchDetails(launchUrl, retryCount + 1);
      }

      // Throw a RateLimitError with proper message
      throw new RateLimitError(
        `Rate limit exceeded. Try again ${formatTimeRemaining(throttleInfo.next_use_secs)}.`,
        throttleInfo.next_use_secs,
      );
    }

    // Fetch launch details directly from the provided URL
    console.debug(`⚠️ calling api to fetch detailed launch information: ${launchUrl}`);
    const response = await fetch(launchUrl);

    // Handle rate limiting
    if (response.status === 429) {
      // Get fresh throttle info
      const freshThrottleInfo = await getApiThrottleInfo();

      if (freshThrottleInfo && !canMakeRequest(freshThrottleInfo)) {
        if (retryCount < 2 && freshThrottleInfo.next_use_secs < 30) {
          // Show toast about rate limiting
          showToast({
            style: Toast.Style.Animated,
            title: "Rate limited by API",
            message: `Waiting ${formatTimeRemaining(freshThrottleInfo.next_use_secs)}...`,
          });

          // Wait until we can make another request
          await sleep(freshThrottleInfo.next_use_secs * 1000);

          // Retry with incremented count
          return getLaunchDetails(launchUrl, retryCount + 1);
        } else {
          // Throw a RateLimitError with proper message
          throw new RateLimitError(
            `Rate limit exceeded. Try again ${formatTimeRemaining(freshThrottleInfo.next_use_secs)}.`,
            freshThrottleInfo.next_use_secs,
          );
        }
      }

      if (retryCount < 3) {
        // Show toast about rate limiting
        showToast({
          style: Toast.Style.Animated,
          title: "Rate limited by API",
          message: `Retrying in ${RETRY_DELAY / 1000} seconds...`,
        });

        // Wait before retrying
        await sleep(RETRY_DELAY);

        // Retry with incremented count
        return getLaunchDetails(launchUrl, retryCount + 1);
      } else {
        throw new ApiError("Rate limit exceeded. Try again later.", 429);
      }
    }

    if (!response.ok) {
      throw new ApiError(`API error: ${response.status}`, response.status);
    }

    const launchDetail = (await response.json()) as LaunchDetail;

    // Refresh throttle info after a successful request
    await getApiThrottleInfo();

    return launchDetail;
  } catch (error) {
    // Pass through our special rate limit error objects
    if (error instanceof RateLimitError) {
      console.warn("Rate limit detected:", error);
      throw error;
    } else {
      console.error("Error fetching launch details:", error);
    }

    // For other errors, show toast
    const errorMessage = error instanceof Error ? error.message : String(error);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch launch details",
      message: errorMessage,
    });

    throw error;
  }
};

/**
 * Hook to fetch launch details
 */
export const useLaunchDetails = (launchUrl: string) => {
  return usePromise(async () => {
    return await getLaunchDetails(launchUrl);
  });
};
