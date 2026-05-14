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
  "rawDefinitions",
  "fake",
  "faker",
  "unique",
  "helpers",
  "mersenne",
  "random",
  "science",
  "_randomizer",
  "_defaultRefDate",
  "seed",
];

// Cache for problematic methods that should be skipped
const cache = new Cache({ namespace: "faker-problematic-methods" });
let problematicMethods = new Set<string>();

// Load cached problematic methods
const loadCachedMethods = () => {
  try {
    const cached = cache.get("methods");
    if (cached) {
      problematicMethods = new Set(JSON.parse(cached));
    }
  } catch (error) {
    console.error(error);
  }
};

// Save problematic methods
const saveCachedMethods = () => {
  try {
    cache.set("methods", JSON.stringify([...problematicMethods]));
  } catch (error) {
    console.error(error);
  }
};

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
              const obj = value as { name?: string; title?: string; code?: string };
              if (obj.name || obj.title || obj.code) {
                return obj.name || obj.title || obj.code || "";
              }
              // Fallback to JSON for complex objects
              return JSON.stringify(value);
            }
            // Handle primitive values (strings, numbers, etc.)
            return String(value);
          } catch {
            problematicMethods.add(methodPath);
            saveCachedMethods();
            return "";
          }
        };

        const initialValue = getValue();

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
