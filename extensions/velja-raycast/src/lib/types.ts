export type VeljaMatcherKind = "host" | "hostSuffix" | "urlPrefix";

export interface VeljaMatcher {
  id: string;
  kind: VeljaMatcherKind;
  pattern: string;
  fixture: string;
}

export interface VeljaRule {
  id: string;
  title: string;
  browser: string;
  isEnabled: boolean;
  matchers: VeljaMatcher[];
  sourceApps: string[];
  forceNewWindow: boolean;
  openInBackground: boolean;
  onlyFromAirdrop: boolean;
  runAfterBuiltinRules: boolean;
  isTransformScriptEnabled: boolean;
  transformScript: string;
}

export interface VeljaConfig {
  defaultBrowser?: string;
  alternativeBrowser?: string;
  preferredBrowsers: string[];
  rules: VeljaRule[];
}

export interface VeljaStatusSnapshot {
  installed: boolean;
  running: boolean;
  version?: string;
  config?: VeljaConfig;
  error?: string;
}

export interface BrowserIdentifier {
  bundleId: string;
  profile?: string;
}
