import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@raycast/api") {
    return {
      url: "mock:@raycast/api",
      shortCircuit: true,
    };
  }

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parentPath = fileURLToPath(context.parentURL);
    const parentDir = dirname(parentPath);

    if (!extname(specifier)) {
      const tsPath = join(parentDir, specifier + ".ts");
      if (existsSync(tsPath)) {
        return {
          url: pathToFileURL(tsPath).href,
          shortCircuit: true,
        };
      }
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url === "mock:@raycast/api") {
    const mockStorageCode = `
      const mockStorage = (globalThis.mockStorage || new Map());
      
      export const LocalStorage = {
        async getItem(key) {
          const value = mockStorage.get(key);
          return value;
        },
        async setItem(key, value) {
          mockStorage.set(key, value);
        },
        async removeItem(key) {
          mockStorage.delete(key);
        },
      };
    `;

    return {
      format: "module",
      source: mockStorageCode,
      shortCircuit: true,
    };
  }

  return nextLoad(url, context);
}
