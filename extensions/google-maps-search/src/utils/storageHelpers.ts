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
  if (typeof value !== "string") return false;

  // Safely check if the value exists in the OriginOption enum
  const validValues = new Set(Object.values(OriginOption));
  return validValues.has(value as OriginOption);
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
    // Handle null values - store as string "null"
    if (value === null) {
      await LocalStorage.setItem(key, "null");
      return true;
    }

    // Handle objects - need to stringify
    if (typeof value === "object") {
      try {
        const stringifiedValue = JSON.stringify(value);
        await LocalStorage.setItem(key, stringifiedValue);
        return true;
      } catch (stringifyError) {
        console.error(`Failed to stringify object for key "${key}": possible circular reference`, stringifyError);
        return false;
      }
    }

    // Validate and handle primitive values
    const type = typeof value;
    if (type === "string" || type === "number" || type === "boolean") {
      await LocalStorage.setItem(key, value);
      return true;
    }

    // If we get here, the value is of an unexpected type
    console.error(
      `Failed to save item to storage: "${key}". ` +
        `Unexpected value type: ${type}. ` +
        "Expected string, number, boolean, object, or null."
    );
    return false;
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
  const operations: { key: string; promise: Promise<void>; error?: unknown }[] = [];

  // Process each item individually to handle potential JSON.stringify errors
  for (const [key, value] of Object.entries(items)) {
    try {
      let valueToStore: string | number | boolean;

      // Handle null values
      if (value === null) {
        valueToStore = "null";
      }
      // Handle objects - need to stringify
      else if (typeof value === "object") {
        try {
          valueToStore = JSON.stringify(value);
        } catch (stringifyError) {
          console.error(`Failed to stringify object for key "${key}": possible circular reference`, stringifyError);
          operations.push({
            key,
            promise: Promise.reject(stringifyError),
            error: stringifyError,
          });
          continue; // Skip to next item
        }
      }
      // Handle primitive values
      else {
        valueToStore = value as string | number | boolean;
      }

      operations.push({
        key,
        promise: LocalStorage.setItem(key, valueToStore),
      });
    } catch (error) {
      // Catch any other unexpected errors
      operations.push({
        key,
        promise: Promise.reject(error),
        error,
      });
    }
  }

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
