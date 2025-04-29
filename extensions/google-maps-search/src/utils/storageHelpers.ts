// External library imports
import { LocalStorage } from "@raycast/api";
import { OriginOption } from "../types";

/**
 * Type for values that can be stored in LocalStorage
 * LocalStorage can store strings, numbers, booleans, and objects that can be serialized to JSON
 */
export type StorageValue = string | number | boolean | null | StorageValue[] | { [key: string]: StorageValue };

/**
 * Type validators for storage-related data types
 * These type predicates help ensure type safety when working with stored values
 */

/**
 * Validates that a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Validates that a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

/**
 * Validates that a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Validates that a value is a string array
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/**
 * Validates that a value is a valid OriginOption
 */
export function isOriginOption(value: unknown): value is OriginOption {
  return typeof value === "string" && Object.values(OriginOption).includes(value as OriginOption);
}

/**
 * Validates that a value is a location object with lat and lng properties
 */
export function isLocation(value: unknown): value is { lat: number; lng: number } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  // Use type assertion once after validation
  const obj = value as Record<string, unknown>;

  return (
    "lat" in obj &&
    "lng" in obj &&
    typeof obj.lat === "number" &&
    typeof obj.lng === "number" &&
    !isNaN(obj.lat) &&
    !isNaN(obj.lng)
  );
}

/**
 * Utility function to validate and safely access values from useLocalStorage hook
 * @param value The value from useLocalStorage
 * @param validator A type predicate function to validate the value
 * @param defaultValue Default value to use if validation fails
 * @returns The validated value or default value
 *
 * @example
 * // With Raycast's useLocalStorage hook
 * import { useLocalStorage } from "@raycast/utils";
 * import { validateStoredValue, isStringArray } from "./storageHelpers";
 *
 * function MyComponent() {
 *   // Get the raw value from useLocalStorage
 *   const { value: rawRecentSearches } = useLocalStorage<string[]>("recent-searches", []);
 *
 *   // Validate the value using our utility
 *   const recentSearches = validateStoredValue(rawRecentSearches, isStringArray, []);
 *
 *   // Now recentSearches is guaranteed to be a string array
 *   return (
 *     <List>
 *       {recentSearches.map(search => (
 *         <List.Item key={search} title={search} />
 *       ))}
 *     </List>
 *   );
 * }
 */
export function validateStoredValue<T>(value: unknown, validator: (value: unknown) => value is T, defaultValue: T): T {
  if (validator(value)) {
    return value;
  }

  console.warn("Stored value failed type validation, using default value instead");
  return defaultValue;
}

/**
 * Gets an item from LocalStorage with error handling
 * @param key The key to retrieve
 * @param defaultValue Optional default value if the key doesn't exist or an error occurs
 * @param validator Optional function to validate the parsed value matches expected type
 * @returns The stored value or the default value
 *
 * @example
 * import { getStorageItem, isString } from "./storageHelpers";
 *
 * async function getWelcomeMessage() {
 *   const welcomeMessage = await getStorageItem("welcome-message", "Hello, world!", isString);
 *   console.log(welcomeMessage); // Guaranteed to be a string
 * }
 */
export async function getStorageItem<T>(
  key: string,
  defaultValue?: T,
  validator?: (value: unknown) => value is T
): Promise<T | undefined> {
  try {
    const value = await LocalStorage.getItem(key);
    if (value === undefined) {
      return defaultValue;
    }

    // Parse the value if it's a string
    let parsedValue: unknown;
    if (typeof value === "string") {
      try {
        parsedValue = JSON.parse(value);
      } catch (parseError) {
        console.warn(`Failed to parse stored JSON for key "${key}", returning default value`, parseError);
        return defaultValue;
      }
    } else {
      parsedValue = value;
    }

    // If a validator is provided, use it to check the type
    if (validator && !validator(parsedValue)) {
      console.warn(`Value stored at key "${key}" failed type validation, returning default value`);
      return defaultValue;
    }

    // Without a validator, we have to trust the type assertion
    return parsedValue as T;
  } catch (error) {
    console.error(`Failed to get item from storage: ${key}`, error);
    return defaultValue;
  }
}

/**
 * Sets an item in LocalStorage with error handling
 * @param key The key to set
 * @param value The value to store
 * @returns True if successful, false if an error occurred
 *
 * @example
 * import { setStorageItem } from "./storageHelpers";
 *
 * async function saveWelcomeMessage(message: string) {
 *   const success = await setStorageItem("welcome-message", message);
 *   if (!success) {
 *     console.error("Failed to save welcome message");
 *   }
 * }
 */
export async function setStorageItem(key: string, value: StorageValue): Promise<boolean> {
  try {
    const valueToStore = typeof value === "object" ? JSON.stringify(value) : value;
    await LocalStorage.setItem(key, valueToStore);
    return true;
  } catch (error) {
    console.error(`Failed to save item to storage: ${key}`, error);
    return false;
  }
}

/**
 * Removes an item from LocalStorage with error handling
 * @param key The key to remove
 * @returns True if successful, false if an error occurred
 *
 * @example
 * import { removeStorageItem } from "./storageHelpers";
 *
 * async function clearWelcomeMessage() {
 *   const success = await removeStorageItem("welcome-message");
 *   if (!success) {
 *     console.error("Failed to clear welcome message");
 *   }
 * }
 */
export async function removeStorageItem(key: string): Promise<boolean> {
  try {
    await LocalStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove item from storage: ${key}`, error);
    return false;
  }
}

/**
 * Saves multiple items to LocalStorage in a batch with error handling
 * @param items Object with keys and values to store
 * @returns Object with success status and details about failed operations
 *
 * @example
 * import { batchSetStorageItems } from "./storageHelpers";
 *
 * async function saveSettings(settings: { [key: string]: string }) {
 *   const result = await batchSetStorageItems(settings);
 *   if (!result.success) {
 *     console.error(`Failed to save ${result.failedItems.length} settings:`, result.failedItems);
 *   }
 * }
 */
export async function batchSetStorageItems(items: Record<string, StorageValue>): Promise<{
  success: boolean;
  failedItems: { key: string; error: unknown }[];
}> {
  const operations = Object.entries(items).map(([key, value]) => {
    const valueToStore = typeof value === "object" ? JSON.stringify(value) : value;
    return {
      key,
      promise: LocalStorage.setItem(key, valueToStore),
    };
  });

  try {
    // Use Promise.allSettled to continue even if some operations fail
    const results = await Promise.allSettled(operations.map((op) => op.promise));

    // Collect failed operations
    const failedItems = results
      .map((result, index) => ({
        result,
        key: operations[index].key,
      }))
      .filter((item) => item.result.status === "rejected")
      .map((item) => ({
        key: item.key,
        error: (item.result as PromiseRejectedResult).reason,
      }));

    // Log failures if any
    if (failedItems.length > 0) {
      console.warn(
        `${failedItems.length} of ${results.length} storage operations failed:`,
        failedItems.map((item) => item.key).join(", ")
      );
    }

    return {
      success: failedItems.length === 0,
      failedItems,
    };
  } catch (error) {
    console.error("Failed to execute batch storage operations", error);
    return {
      success: false,
      failedItems: [{ key: "batch_operation", error }],
    };
  }
}
