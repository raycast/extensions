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

/* ── Alerts and toasts ──────────────────────────────────────────────────────
 * Enough of the UI surface for `confirmAndRun` and `utils/toast.ts` to run
 * headless. Everything shown is recorded on `__raycast` so a test can assert on
 * it; `__raycast.reset()` in a beforeEach keeps runs independent.
 */

export const __raycast = {
  /** What `confirmAlert` returns next. */
  confirmAlertResponse: true,
  alerts: [] as { title: string; message?: string }[],
  toasts: [] as MockToast[],
  huds: [] as string[],
  clipboard: [] as string[],
  reset() {
    __raycast.confirmAlertResponse = true;
    __raycast.alerts.length = 0;
    __raycast.toasts.length = 0;
    __raycast.huds.length = 0;
    __raycast.clipboard.length = 0;
  },
};

export const Alert = {
  ActionStyle: { Default: "default", Destructive: "destructive", Cancel: "cancel" },
};

export async function confirmAlert(options: { title: string; message?: string }): Promise<boolean> {
  __raycast.alerts.push({ title: options.title, message: options.message });
  return __raycast.confirmAlertResponse;
}

type ToastAction = { title: string; onAction: (toast: MockToast) => void | Promise<void> };

/** A Toast that remembers every message it was given, so progress can be asserted. */
class MockToast {
  static Style = { Animated: "animated", Success: "success", Failure: "failure" };
  style?: string;
  title = "";
  primaryAction?: ToastAction;
  secondaryAction?: ToastAction;
  /** Every message this toast has held, in order. */
  readonly messages: string[] = [];
  private current?: string;

  constructor(options: Record<string, unknown> = {}) {
    Object.assign(this, options);
  }

  get message(): string | undefined {
    return this.current;
  }

  set message(value: string | undefined) {
    this.current = value;
    if (value !== undefined) this.messages.push(value);
  }

  async show(): Promise<void> {
    __raycast.toasts.push(this);
  }

  async hide(): Promise<void> {}
}

export { MockToast as Toast };

export async function showToast(options: Record<string, unknown>): Promise<MockToast> {
  const toast = new MockToast(options);
  await toast.show();
  return toast;
}

export async function showHUD(message: string): Promise<void> {
  __raycast.huds.push(message);
}

export const Clipboard = {
  copy: async (content: unknown) => {
    __raycast.clipboard.push(String(content));
  },
};
