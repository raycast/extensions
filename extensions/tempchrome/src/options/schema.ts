/**
 * Single source of truth for launch options.
 *
 * Both surfaces read from here:
 *   - `Quick Launch TempChrome` — persistent preferences, generated into `package.json`'s
 *     `launch` command via `scripts/sync-options-schema.ts` (auto-runs on lint/dev/build).
 *     Separators are filtered out here — Raycast's `preferences` array is flat.
 *   - `Launch with Options` form — React form rendered by iterating this schema.
 *     Separators render as `<Form.Separator />` + `<Form.Description>` section headers.
 *
 * The two surfaces hold **independent values** — only the UI definitions and
 * the flag-mapping logic are shared.
 *
 * To add a new option: append an entry to `LAUNCH_OPTIONS_SCHEMA` and extend
 * `LaunchOptionsValues`. That's it — `bun run sync:options` regenerates the
 * manifest, the form auto-renders the new field, and `buildExtraArgs` picks
 * up the new `toArgs` mapping.
 *
 * `toArgs` receives the full values object as its second argument so fields
 * can express inter-field rules inline (e.g. App Mode switching Start URL
 * from a positional arg to `--app=<url>`).
 */

type SeparatorField = {
  readonly kind: "separator";
  readonly title: string;
  readonly description?: string;
};

type DropdownField = {
  readonly kind: "dropdown";
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly default: string;
  readonly options: readonly {
    readonly title: string;
    readonly value: string;
  }[];
  readonly toArgs: (value: string, allValues: LaunchOptionsValues) => readonly string[];
};

type CheckboxField = {
  readonly kind: "checkbox";
  readonly name: string;
  readonly title: string;
  readonly label: string;
  readonly description: string;
  readonly default: boolean;
  readonly toArgs: (value: boolean, allValues: LaunchOptionsValues) => readonly string[];
};

type TextfieldField = {
  readonly kind: "textfield";
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly default: string;
  readonly placeholder?: string;
  readonly toArgs: (value: string, allValues: LaunchOptionsValues) => readonly string[];
};

export type OptionField = DropdownField | CheckboxField | TextfieldField | SeparatorField;

export type ArgField = DropdownField | CheckboxField | TextfieldField;

export function isArgField(field: OptionField): field is ArgField {
  return field.kind !== "separator";
}

export type LaunchOptionsValues = {
  browsingMode: "normal" | "incognito";
  startUrl: string;
  appMode: boolean;
  windowState: "normal" | "maximized" | "fullscreen" | "kiosk";
  windowSize: string;
  windowPosition: string;
  disableWebSecurity: boolean;
  disableExtensions: boolean;
  autoOpenDevtools: boolean;
  remoteDebuggingPort: string;
  userAgent: string;
  proxyServer: string;
  ignoreCertificateErrors: boolean;
  language: string;
  autoCleanup: boolean;
  customArgs: string;
};

function parseCustomArgs(raw: string): string[] {
  return raw
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function normalizeWindowSize(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+)\s*[x,]\s*(\d+)$/i);
  return match ? `${match[1]},${match[2]}` : null;
}

function normalizeWindowPosition(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(-?\d+)\s*,\s*(-?\d+)$/);
  return match ? `${match[1]},${match[2]}` : null;
}

function parseRemoteDebuggingPort(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const port = Number.parseInt(trimmed, 10);
  if (port < 1 || port > 65535) return null;
  return port;
}

export const LAUNCH_OPTIONS_SCHEMA: readonly OptionField[] = [
  {
    kind: "separator",
    title: "Profile",
    description: "Temp profile lifecycle",
  },
  {
    kind: "checkbox",
    name: "autoCleanup",
    title: "Auto-Cleanup",
    label: "Mark profile for cleanup after Chromium closes",
    description: "Automatically delete the temp profile once the Chromium window is closed",
    default: true,
    // autoCleanup is not a Chromium CLI flag — it drives markForAutoCleanup()
    // in the caller. Kept in the schema so it appears in the shared UI.
    toArgs: () => [],
  },
  {
    kind: "separator",
    title: "Start Page",
    description: "What Chromium opens on launch",
  },
  {
    kind: "textfield",
    name: "startUrl",
    title: "Start URL",
    description: "Open Chromium directly on this page (leave blank for the default new tab)",
    default: "",
    placeholder: "https://example.com",
    toArgs: (value, all) => {
      const url = value.trim();
      if (!url) return [];
      if (all.appMode) return [];
      return [url];
    },
  },
  {
    kind: "dropdown",
    name: "browsingMode",
    title: "Browsing Mode",
    description: "Default browsing mode",
    default: "normal",
    options: [
      { title: "Normal", value: "normal" },
      { title: "Incognito", value: "incognito" },
    ],
    toArgs: (value) => (value === "incognito" ? ["--incognito"] : []),
  },
  {
    kind: "checkbox",
    name: "appMode",
    title: "App Mode",
    label: "Open Start URL in a chromeless window (--app)",
    description: "Requires a Start URL. Emits --app=<url> instead of the positional URL",
    default: false,
    toArgs: (value, all) => {
      if (!value) return [];
      const url = all.startUrl.trim();
      return url ? [`--app=${url}`] : [];
    },
  },

  {
    kind: "separator",
    title: "Window",
    description: "Initial window geometry and state",
  },
  {
    kind: "dropdown",
    name: "windowState",
    title: "Window State",
    description: "Initial window mode",
    default: "normal",
    options: [
      { title: "Normal", value: "normal" },
      { title: "Maximized", value: "maximized" },
      { title: "Fullscreen", value: "fullscreen" },
      { title: "Kiosk", value: "kiosk" },
    ],
    toArgs: (value) => {
      switch (value) {
        case "maximized":
          return ["--start-maximized"];
        case "fullscreen":
          return ["--start-fullscreen"];
        case "kiosk":
          return ["--kiosk"];
        default:
          return [];
      }
    },
  },
  {
    kind: "textfield",
    name: "windowSize",
    title: "Window Size",
    description: "Initial window size (WxH or W,H)",
    default: "",
    placeholder: "1440x900",
    toArgs: (value) => {
      const normalized = normalizeWindowSize(value);
      return normalized ? [`--window-size=${normalized}`] : [];
    },
  },
  {
    kind: "textfield",
    name: "windowPosition",
    title: "Window Position",
    description: "Initial window position (X,Y)",
    default: "",
    placeholder: "100,100",
    toArgs: (value) => {
      const normalized = normalizeWindowPosition(value);
      return normalized ? [`--window-position=${normalized}`] : [];
    },
  },

  {
    kind: "separator",
    title: "Security & Privacy",
    description: "Disable protections (use with caution)",
  },
  {
    kind: "checkbox",
    name: "disableWebSecurity",
    title: "Disable Web Security",
    label: "Pass --disable-web-security on launch",
    description: "Disables same-origin policy (use with caution)",
    default: false,
    toArgs: (value) => (value ? ["--disable-web-security"] : []),
  },
  {
    kind: "checkbox",
    name: "ignoreCertificateErrors",
    title: "Ignore Certificate Errors",
    label: "Pass --ignore-certificate-errors (insecure)",
    description: "Skips TLS validation — use only for local dev",
    default: false,
    toArgs: (value) => (value ? ["--ignore-certificate-errors"] : []),
  },
  {
    kind: "checkbox",
    name: "disableExtensions",
    title: "Disable Extensions",
    label: "Pass --disable-extensions on launch",
    description: "Start Chromium without any installed extensions",
    default: false,
    toArgs: (value) => (value ? ["--disable-extensions"] : []),
  },

  {
    kind: "separator",
    title: "Developer",
    description: "DevTools and remote debugging",
  },
  {
    kind: "checkbox",
    name: "autoOpenDevtools",
    title: "Auto-Open DevTools",
    label: "Open DevTools for each new tab",
    description: "Passes --auto-open-devtools-for-tabs",
    default: false,
    toArgs: (value) => (value ? ["--auto-open-devtools-for-tabs"] : []),
  },
  {
    kind: "textfield",
    name: "remoteDebuggingPort",
    title: "Remote Debugging Port",
    description: "Enable CDP on a port (1–65535); blank to disable",
    default: "",
    placeholder: "9222",
    toArgs: (value) => {
      const port = parseRemoteDebuggingPort(value);
      return port === null ? [] : [`--remote-debugging-port=${port}`];
    },
  },

  {
    kind: "separator",
    title: "Network & Locale",
    description: "UA, proxy, and language overrides",
  },
  {
    kind: "textfield",
    name: "userAgent",
    title: "User Agent",
    description: "Override the User-Agent string",
    default: "",
    placeholder: "Mozilla/5.0 …",
    toArgs: (value) => {
      const trimmed = value.trim();
      return trimmed ? [`--user-agent=${trimmed}`] : [];
    },
  },
  {
    kind: "textfield",
    name: "proxyServer",
    title: "Proxy Server",
    description: "HTTP or SOCKS proxy",
    default: "",
    placeholder: "host:port",
    toArgs: (value) => {
      const trimmed = value.trim();
      return trimmed ? [`--proxy-server=${trimmed}`] : [];
    },
  },
  {
    kind: "textfield",
    name: "language",
    title: "Language",
    description: "BCP-47 language tag (e.g. en-US, ja-JP)",
    default: "",
    placeholder: "en-US",
    toArgs: (value) => {
      const trimmed = value.trim();
      return trimmed ? [`--lang=${trimmed}`] : [];
    },
  },

  {
    kind: "separator",
    title: "Advanced",
    description: "Escape hatch for anything the schema doesn't cover",
  },
  {
    kind: "textfield",
    name: "customArgs",
    title: "Custom Chromium Arguments",
    description: "Extra CLI flags appended to every launch (whitespace-separated)",
    default: "",
    placeholder: "--flag1 --flag2=value",
    toArgs: (value) => parseCustomArgs(value),
  },
];

export function buildExtraArgs(values: LaunchOptionsValues): string[] {
  const lookup = values as unknown as Record<string, string | boolean>;
  return LAUNCH_OPTIONS_SCHEMA.flatMap((field) => {
    switch (field.kind) {
      case "dropdown":
        return [...field.toArgs(lookup[field.name] as string, values)];
      case "checkbox":
        return [...field.toArgs(lookup[field.name] as boolean, values)];
      case "textfield":
        return [...field.toArgs(lookup[field.name] as string, values)];
      case "separator":
        return [];
      default:
        return [];
    }
  });
}

export function schemaDefaults(): LaunchOptionsValues {
  const out: Record<string, string | boolean> = {};
  for (const field of LAUNCH_OPTIONS_SCHEMA) {
    if (!isArgField(field)) continue;
    out[field.name] = field.default;
  }
  return out as unknown as LaunchOptionsValues;
}
