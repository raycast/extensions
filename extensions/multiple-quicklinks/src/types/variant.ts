export type LinkItem = {
  url: string;
  /** Bundle ID of browser for this link, or empty for default. */
  browser?: string;
};

export type BrowserMode = "per_link" | "per_config" | "global_only";

export type Variant = {
  id: string;
  name: string;
  links: LinkItem[];
  /** One browser for all links (used when browserMode is "per_config"). */
  browser?: string;
  /** How browser is chosen for this config. Default "per_config". */
  browserMode?: BrowserMode;
};

/** Options for the per-config browser mode dropdown. */
export const BROWSER_MODE_OPTIONS: { title: string; value: BrowserMode }[] = [
  { title: "One browser for all links in this config", value: "per_config" },
  { title: "Browser per URL (choose for each link)", value: "per_link" },
  { title: "Use global fallback only (no choice here)", value: "global_only" },
];

/** Browser options for per-variant dropdown (value = bundle ID, empty = default). */
export const BROWSER_OPTIONS = [
  { title: "Default (extension or system)", value: "" },
  { title: "Safari", value: "com.apple.Safari" },
  { title: "Google Chrome", value: "com.google.Chrome" },
  { title: "Firefox", value: "org.mozilla.firefox" },
  { title: "Arc", value: "company.thebrowser.Browser" },
  { title: "Brave Browser", value: "com.brave.Browser" },
  { title: "Microsoft Edge", value: "com.microsoft.edgemac" },
] as const;
