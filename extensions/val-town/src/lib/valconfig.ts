import { readBlob, storeBlob } from "./api";
import { McpError } from "./mcp";
import type { JsonSchema } from "./store";

const VAL_CONFIG_KEY = "raycast:tool.json";

export type ValConfig = {
  version: 1;
  inputSchema: JsonSchema | null;
  /** Which file to call. A val with several http files should not be guessed at. */
  entrypoint: string | null;
  /** The val's own description field caps at 64 characters, which is too short for the model. */
  description: string | null;
  active: boolean;
  confirm: boolean;
};

export function emptyValConfig(): ValConfig {
  return { version: 1, inputSchema: null, entrypoint: null, description: null, active: true, confirm: false };
}

/** Null means the val carries no config — the caller reports that rather than guessing a default. */
export async function readValConfig(val: string, signal?: AbortSignal): Promise<ValConfig | null> {
  let raw: string | undefined;
  try {
    raw = (await readBlob({ type: "val", val }, VAL_CONFIG_KEY, signal)).content;
  } catch (error) {
    if (error instanceof McpError && /not found/i.test(error.message)) return null;
    throw error;
  }
  if (!raw) return null;

  try {
    return { ...emptyValConfig(), ...(JSON.parse(raw) as ValConfig), version: 1 };
  } catch {
    throw new Error(`${val}'s raycast:tool.json is not valid JSON. Fix or delete it on val.town.`);
  }
}

/**
 * Reads several configs at once, a few at a time: a collection of any size is one background sweep
 * rather than a read per row on selection. A val that fails to read is cached as having no config.
 */
export async function readConfigs(vals: string[], signal?: AbortSignal): Promise<Record<string, ValConfig | null>> {
  const queue = [...vals];
  const configs: Record<string, ValConfig | null> = {};

  await Promise.all(
    Array.from({ length: Math.min(5, queue.length) }, async () => {
      for (let val = queue.shift(); val; val = queue.shift()) {
        configs[val] = await readValConfig(val, signal).catch(() => null);
      }
    }),
  );

  return configs;
}

export async function writeValConfig(val: string, config: ValConfig): Promise<void> {
  await storeBlob({ type: "val", val }, VAL_CONFIG_KEY, JSON.stringify(config, null, 2));
}

export function missingConfigError(val: string): Error {
  return new Error(`${val} has no Raycast config. The user sets one with Configure in the Val Town extension.`);
}
