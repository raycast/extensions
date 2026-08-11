import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import * as fsPromises from "fs/promises";
import { dirname } from "path";
import type { ZodSchema, ZodError } from "zod";

export interface ConfigManager<T> {
  load: () => T;
  loadAsync: () => Promise<T>;
  save: (data: T) => void;
  getPath: () => string;
}

export interface ConfigManagerOptions<T> {
  getConfigPath: () => string;
  defaultValue: T;
  schema?: ZodSchema<T>;
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((e) => {
      const path = e.path.length > 0 ? `${e.path.join(".")}: ` : "";
      return `${path}${e.message}`;
    })
    .join("; ");
}

export function createConfigManager<T>(options: ConfigManagerOptions<T>): ConfigManager<T> {
  const { getConfigPath, defaultValue, schema } = options;

  function validateData(parsed: unknown, configPath: string): T {
    // Prefer Zod schema if provided
    if (schema) {
      const result = schema.safeParse(parsed);
      if (!result.success) {
        throw new Error(`Invalid config at ${configPath}: ${formatZodError(result.error)}`);
      }
      return result.data;
    }

    return parsed as T;
  }

  return {
    getPath: getConfigPath,

    load(): T {
      const configPath = getConfigPath();
      if (!existsSync(configPath)) {
        return defaultValue;
      }

      try {
        const content = readFileSync(configPath, "utf8");
        const parsed = JSON.parse(content);
        return validateData(parsed, configPath);
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`Invalid JSON in config file: ${configPath}`);
        }
        throw error;
      }
    },

    async loadAsync(): Promise<T> {
      const configPath = getConfigPath();
      if (!existsSync(configPath)) {
        return defaultValue;
      }

      try {
        const content = await fsPromises.readFile(configPath, "utf8");
        const parsed = JSON.parse(content);
        return validateData(parsed, configPath);
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`Invalid JSON in config file: ${configPath}`);
        }
        throw error;
      }
    },

    save(data: T): void {
      const configPath = getConfigPath();
      const dir = dirname(configPath);

      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(configPath, JSON.stringify(data, null, 2), "utf8");
    },
  };
}
