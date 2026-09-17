/**
 * Test stand-in for `@raycast/api`, which has no resolvable entry outside the
 * Raycast runtime — so any module that transitively imports it, including pure
 * helpers, is otherwise untestable.
 *
 * `getPreferenceValues` returns the DECLARED DEFAULTS from package.json rather
 * than an empty object, which would read every preference as `undefined` and let
 * a test pass by exercising a branch the declared default never reaches.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const EXTENSION_NAME = "brew";

/**
 * The extension root, supplied by vitest.config.ts. Falls back to walking up
 * from the working directory so a direct vitest invocation still works.
 */
function findManifest(): string {
  const supplied = process.env.RAYCAST_EXTENSION_ROOT;
  if (supplied) {
    return join(supplied, "package.json");
  }
  let dir = process.cwd();
  for (;;) {
    const candidate = join(dir, "package.json");
    if (existsSync(candidate)) {
      const parsed = JSON.parse(readFileSync(candidate, "utf8")) as { name?: string };
      if (parsed.name === EXTENSION_NAME) {
        return candidate;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`@raycast/api stub could not find the ${EXTENSION_NAME} manifest above ${process.cwd()}`);
    }
    dir = parent;
  }
}

interface DeclaredPreference {
  name: string;
  default?: unknown;
  type?: string;
}

function declaredDefaults(): Record<string, unknown> {
  // `import.meta` is unavailable under the extension's tsconfig module target,
  // so walk up from the working directory for THIS extension's manifest. Reading
  // whatever package.json happens to sit at cwd would hand every test another
  // project's defaults when vitest is invoked from a monorepo root.
  const manifestPath = findManifest();
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    preferences?: DeclaredPreference[];
    commands?: { preferences?: DeclaredPreference[] }[];
  };

  const defaults: Record<string, unknown> = {};
  // Extension preferences first, then command ones: a command inherits the
  // extension's preferences and may override a same-named entry.
  for (const preference of manifest.preferences ?? []) {
    defaults[preference.name] = preferenceDefault(preference);
  }
  // No active command in a unit test, so every command's preferences are
  // merged. Fine while no two commands declare the same name with different
  // defaults; if that changes, this stub has to learn which command is running.
  for (const command of manifest.commands ?? []) {
    for (const preference of command.preferences ?? []) {
      defaults[preference.name] = preferenceDefault(preference);
    }
  }
  return defaults;
}

function preferenceDefault(preference: DeclaredPreference): unknown {
  if (preference.default !== undefined) {
    return preference.default;
  }
  // Raycast gives an unset checkbox `false` and an unset text field "".
  return preference.type === "checkbox" ? false : "";
}

const defaults = declaredDefaults();

export function getPreferenceValues<T = Record<string, unknown>>(): T {
  return { ...defaults } as T;
}

export const environment = { assetsPath: "/tmp/assets", supportPath: "/tmp/support" };

export const Color = {
  Green: "green",
  Yellow: "yellow",
  Red: "red",
  Blue: "blue",
  Orange: "orange",
  Magenta: "magenta",
  Purple: "purple",
  PrimaryText: "primaryText",
  SecondaryText: "secondaryText",
};

export const Icon = new Proxy({}, { get: (_target, key) => String(key) });
