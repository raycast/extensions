import { Clipboard, getPreferenceValues, getSelectedText } from "@raycast/api";

import {
  resolveCreateFormDefaults,
  resolveCreateDefaults,
  resolveQuickAddDefaults,
  type CreateDefaults,
  type CreateDefaultsDependencies,
  type CreateFormDefaults,
  type QuickAddDefaults,
} from "../application/createDefaults";

export interface RaycastCreationDefaultsPort {
  readPreferences(): unknown | Promise<unknown>;
  readSelectedText(): unknown | Promise<unknown>;
  readClipboardText(): unknown | Promise<unknown>;
  now(): unknown;
  uiTimeZone(): unknown;
}

export type RaycastCreationDefaultsLoader = () => Promise<CreateDefaults>;
export type RaycastCreateFormDefaultsLoader = () => Promise<CreateFormDefaults>;
export type RaycastQuickAddDefaultsLoader = () => Promise<QuickAddDefaults>;

export function createRaycastCreationDefaults(port: RaycastCreationDefaultsPort): RaycastCreationDefaultsLoader {
  return Object.freeze(async () => {
    const preferences = await readPreferences(port);
    const dependencies = createLazyDependencies(port);
    return resolveCreateDefaults(preferences, dependencies);
  });
}

export function createRaycastCreateFormDefaults(port: RaycastCreationDefaultsPort): RaycastCreateFormDefaultsLoader {
  return Object.freeze(async () => {
    const preferences = await readPreferences(port);
    const dependencies = createLazyDependencies(port);
    return resolveCreateFormDefaults(preferences, dependencies);
  });
}

export function createRaycastQuickAddDefaults(port: RaycastCreationDefaultsPort): RaycastQuickAddDefaultsLoader {
  return Object.freeze(async () => {
    const preferences = await readPreferences(port);
    const dependencies = createLazyDependencies(port);
    return resolveQuickAddDefaults(preferences, dependencies);
  });
}

const productionPort: RaycastCreationDefaultsPort = Object.freeze({
  readPreferences: () => getPreferenceValues(),
  readSelectedText: () => getSelectedText(),
  readClipboardText: () => Clipboard.readText(),
  now: () => new Date(),
  uiTimeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
});

export const loadRaycastCreationDefaults = createRaycastCreationDefaults(productionPort);
export const loadRaycastCreateFormDefaults = createRaycastCreateFormDefaults(productionPort);
export const loadRaycastQuickAddDefaults = createRaycastQuickAddDefaults(productionPort);

async function readPreferences(port: RaycastCreationDefaultsPort): Promise<unknown> {
  try {
    return await invokePort(port, "readPreferences");
  } catch {
    return undefined;
  }
}

function createLazyDependencies(port: RaycastCreationDefaultsPort): CreateDefaultsDependencies {
  const now = memoize(() => invokePort(port, "now"));
  const uiTimeZone = memoize(() => invokePort(port, "uiTimeZone"));
  const dependencies = {
    readSelectedText: async () => invokePort(port, "readSelectedText"),
    readClipboardText: async () => invokePort(port, "readClipboardText"),
  } as Partial<CreateDefaultsDependencies>;

  Object.defineProperties(dependencies, {
    now: { enumerable: true, get: now },
    uiTimeZone: { enumerable: true, get: uiTimeZone },
  });

  return Object.freeze(dependencies) as CreateDefaultsDependencies;
}

function invokePort(port: RaycastCreationDefaultsPort, operation: keyof RaycastCreationDefaultsPort): unknown {
  const candidate = Reflect.get(port, operation);
  if (typeof candidate !== "function") throw new TypeError("A creation-defaults source is unavailable.");
  return Reflect.apply(candidate, port, []);
}

function memoize(read: () => unknown): () => unknown {
  let initialized = false;
  let failed = false;
  let value: unknown;
  let failure: unknown;

  return () => {
    if (!initialized) {
      initialized = true;
      try {
        value = read();
      } catch (error) {
        failed = true;
        failure = error;
      }
    }

    if (failed) throw failure;
    return value;
  };
}
