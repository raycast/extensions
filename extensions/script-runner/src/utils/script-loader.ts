import fs from "fs";
import path from "path";
import vm from "vm";
import { logger } from "./logger";

export interface ScriptItem {
  name: string;
  [key: string]: unknown;
}

export interface ScriptModule {
  name?: string;
  retrieve?: () => Promise<ScriptItem[]> | ScriptItem[];
  fetch?: () => Promise<ScriptItem[]> | ScriptItem[];
  doActions: (item: ScriptItem) => Promise<void> | void;
}

export interface LoadedScript {
  name: string; // Display name (from export or filename)
  filename: string;
  module: ScriptModule;
}

export function loadScripts(directory: string): LoadedScript[] {
  if (!fs.existsSync(directory)) {
    logger.warn(`Directory not found: ${directory}`);
    return [];
  }

  const files = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".js"));
  const loadedScripts: LoadedScript[] = [];

  for (const file of files) {
    logger.log(`Loading script execution for ${file}`);
    const filePath = path.join(directory, file);
    try {
      const code = fs.readFileSync(filePath, "utf-8");
      const sandbox = {
        module: { exports: {} },
        exports: {},
        require: (id: string) => {
          try {
            // Attempt to use Node's require for built-ins
            return require(id);
          } catch (e) {
            logger.warn(`Cannot require module ${id} in script ${file}`);
            return {};
          }
        },
        console: {
          log: (...args: unknown[]) => logger.log(`[Script ${file}]`, ...args),
          error: (...args: unknown[]) =>
            logger.error(`[Script ${file}]`, ...args),
          warn: (...args: unknown[]) =>
            logger.warn(`[Script ${file}]`, ...args),
        },
        process,
        Buffer,
        setTimeout,
        setInterval,
        setImmediate,
        clearTimeout,
        clearInterval,
        clearImmediate,
      };

      const context = vm.createContext(sandbox);
      const script = new vm.Script(code);
      script.runInContext(context);

      const exported =
        (sandbox.module.exports as ScriptModule) ||
        (sandbox.exports as ScriptModule);

      // Validation: must have fetch/retrieve and doActions
      if ((exported.fetch || exported.retrieve) && exported.doActions) {
        loadedScripts.push({
          name: exported.name || file,
          filename: file,
          module: {
            name: exported.name,
            retrieve: exported.retrieve,
            fetch: exported.fetch,
            doActions: exported.doActions,
          },
        });
      } else {
        logger.warn(
          `Script ${file} missing required exports (fetch/retrieve, doActions)`,
        );
      }
    } catch (error) {
      logger.error(`Error loading script ${file}:`, error);
    }
  }

  return loadedScripts;
}
