export type ProxyMode = "system" | "none" | "socks5";

export interface AppSettings {
  defaultOutputLanguage: string;
  autoLoadSelected: boolean;
  autoLoadClipboard: boolean;
  autoStart: boolean;
  autoCopyToClipboard: boolean;
  maxHistorySize: number;
  alwaysShowMetadata: boolean;
  proxyMode: ProxyMode;
  useProxy: boolean;
  proxyHost: string;
  proxyPort: string;
  proxyUsername: string;
  proxyPassword: string;
  ocrLanguage: string;
  ocrLevel: "accurate" | "fast";
  ocrCustomWords: string;
}

export const defaultAppSettings: AppSettings = {
  defaultOutputLanguage: "zh-Hans",
  autoLoadSelected: false,
  autoLoadClipboard: false,
  autoStart: false,
  autoCopyToClipboard: true,
  maxHistorySize: 30,
  alwaysShowMetadata: true,
  proxyMode: "system",
  useProxy: false,
  proxyHost: "",
  proxyPort: "",
  proxyUsername: "",
  proxyPassword: "",
  ocrLanguage: "en-US",
  ocrLevel: "accurate",
  ocrCustomWords: "",
};

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readProxyMode(value: unknown, fallback: ProxyMode): ProxyMode {
  return value === "system" || value === "none" || value === "socks5" ? value : fallback;
}

function readHistorySize(value: unknown): number {
  const parsed = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultAppSettings.maxHistorySize;
}

export function sanitizeAppSettings(settings: Partial<AppSettings>): AppSettings {
  const ocrLevel = settings.ocrLevel === "fast" ? "fast" : "accurate";
  const legacyProxyMode = settings.useProxy ? "socks5" : defaultAppSettings.proxyMode;
  return {
    defaultOutputLanguage: readString(settings.defaultOutputLanguage, defaultAppSettings.defaultOutputLanguage),
    autoLoadSelected: readBoolean(settings.autoLoadSelected, defaultAppSettings.autoLoadSelected),
    autoLoadClipboard: readBoolean(settings.autoLoadClipboard, defaultAppSettings.autoLoadClipboard),
    autoStart: readBoolean(settings.autoStart, defaultAppSettings.autoStart),
    autoCopyToClipboard: readBoolean(settings.autoCopyToClipboard, defaultAppSettings.autoCopyToClipboard),
    maxHistorySize: readHistorySize(settings.maxHistorySize),
    alwaysShowMetadata: readBoolean(settings.alwaysShowMetadata, defaultAppSettings.alwaysShowMetadata),
    proxyMode: readProxyMode(settings.proxyMode, legacyProxyMode),
    useProxy: readBoolean(settings.useProxy, defaultAppSettings.useProxy),
    proxyHost: readString(settings.proxyHost, defaultAppSettings.proxyHost).trim(),
    proxyPort: readString(settings.proxyPort, defaultAppSettings.proxyPort).trim(),
    proxyUsername: readString(settings.proxyUsername, defaultAppSettings.proxyUsername).trim(),
    proxyPassword: readString(settings.proxyPassword, defaultAppSettings.proxyPassword),
    ocrLanguage: readString(settings.ocrLanguage, defaultAppSettings.ocrLanguage),
    ocrLevel,
    ocrCustomWords: readString(settings.ocrCustomWords, defaultAppSettings.ocrCustomWords),
  };
}
