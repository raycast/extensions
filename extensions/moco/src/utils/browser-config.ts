export const BROWSERS = [
  { id: "com.apple.Safari", name: "Safari", engine: "safari" },
  { id: "com.apple.SafariTechnologyPreview", name: "Safari Technology Preview", engine: "safari" },
  { id: "com.google.Chrome", name: "Google Chrome", engine: "chromium" },
  { id: "company.thebrowser.Browser", name: "Arc", engine: "chromium" },
  { id: "com.brave.Browser", name: "Brave", engine: "chromium" },
  { id: "com.microsoft.edgemac", name: "Microsoft Edge", engine: "chromium" },
  { id: "com.vivaldi.Vivaldi", name: "Vivaldi", engine: "chromium" },
  { id: "org.chromium.Chromium", name: "Chromium", engine: "chromium" },
] as const;

export interface BrowserConfig {
  version: 1;
  autoDetectJira: boolean;
  browser: string;
  jiraDomains: string;
}
export const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  version: 1,
  autoDetectJira: false,
  browser: "frontmost",
  jiraDomains: "",
};

export function parseBrowserConfig(value: unknown): BrowserConfig {
  try {
    const config = typeof value === "string" ? JSON.parse(value) : undefined;
    if (
      !config ||
      config.version !== 1 ||
      typeof config.autoDetectJira !== "boolean" ||
      typeof config.jiraDomains !== "string" ||
      (config.browser !== "frontmost" && !BROWSERS.some((b) => b.id === config.browser))
    )
      return { ...DEFAULT_BROWSER_CONFIG };
    return {
      version: 1,
      autoDetectJira: config.autoDetectJira,
      browser: config.browser,
      jiraDomains: config.jiraDomains,
    };
  } catch {
    return { ...DEFAULT_BROWSER_CONFIG };
  }
}

export function chooseBrowser(config: BrowserConfig, frontmostId?: string) {
  if (!config.autoDetectJira) return undefined;
  return BROWSERS.find((b) => b.id === (config.browser === "frontmost" ? frontmostId : config.browser));
}

export function browserConfigKey(tenant: string) {
  return `browser-config:v1:${encodeURIComponent(tenant.trim().toLowerCase())}`;
}
