import _ from "lodash";

import { Cache } from "@raycast/api";

import type { Item } from "@/components/FakerListItem";
import fakerClient from "@/faker";

const blacklistPaths = [
  "locales",
  "locale",
  "_locale",
  "localeFallback",
  "_localeFallback",
  "definitions",
  "rawDefinitions", // Skip the massive raw definitions that cause infinite loops
  "fake",
  "faker",
  "unique",
  "helpers",
  "mersenne",
  "random",
  "science",
  "_randomizer", // Skip - contains low-level functions not useful for end users
  "_defaultRefDate", // Skip - internal function, not user-facing
  "seed", // Skip - no UI to set seed value, not practical
];

// Cache for problematic methods that should be skipped
const cache = new Cache({ namespace: "faker-problematic-methods" });
let problematicMethods = new Set<string>();

// Load cached problematic methods from Raycast Cache
const loadCachedMethods = () => {
  try {
    const cached = cache.get("methods");
    if (cached) {
      problematicMethods = new Set(JSON.parse(cached));
    }
  } catch (error) {
    // Ignore cache errors
  }
};

// Save problematic methods to Raycast Cache
const saveCachedMethods = () => {
  try {
    cache.set("methods", JSON.stringify([...problematicMethods]));
  } catch (error) {
    // Ignore cache errors
  }
};

// Load cache on module initialization
loadCachedMethods();

export const buildItems = (path: string, faker: typeof fakerClient.faker) => {
  return _.reduce(
    path ? _.get(faker, path) : faker,
    (acc: Item[], func, key) => {
      if (blacklistPaths.includes(key)) {
        return acc;
      }

      if (_.isFunction(func)) {
        const methodPath = path ? `${path}.${key}` : key;

        // Skip if we know this method is problematic
        if (problematicMethods.has(methodPath)) {
          return acc;
        }

        const getValue = (): string => {
          try {
            const value = func();
            if (_.isBoolean(value)) return value.toString();
            if (!value) return "";
            if (_.isObject(value)) {
              // Handle Date objects
              if (value instanceof Date) {
                return value.toISOString();
              }
              // Handle arrays
              if (_.isArray(value)) {
                return value.join(", ");
              }
              // Handle objects with meaningful string representation
              if ((value as any).name || (value as any).title || (value as any).code) {
                return (value as any).name || (value as any).title || (value as any).code;
              }
              // Fallback to JSON for complex objects
              return JSON.stringify(value);
            }
            return value.toString();
          } catch (error) {
            // Cache this method as problematic for future runs
            problematicMethods.add(methodPath);
            saveCachedMethods(); // Persist the cache
            return "";
          }
        };

        // Generate initial value for display
        const initialValue = getValue();

        // Only add if we got a meaningful value
        if (initialValue) {
          acc.push({ section: path, id: key, value: initialValue, getValue });
        }
      } else if (_.isObject(func)) {
        acc.push(...buildItems(path ? `${path}.${key}` : key, faker));
      }

      return acc;
    },
    [],
  );
};
