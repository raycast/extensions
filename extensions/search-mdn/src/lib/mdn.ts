import { Icon } from "@raycast/api";

import type { MdnKind } from "@/types";

export const MDN_BASE_URL = "https://developer.mozilla.org";

export const SUPPORTED_LANGUAGES = ["en-US", "es", "fr", "ja", "ko", "pt-BR", "ru", "zh-CN", "zh-TW"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const KIND_ICONS: Record<MdnKind, string> = {
  guide: "icon.png",
  js: "kind-js.svg",
  css: "kind-css.svg",
  html: "kind-html.svg",
  svg: "kind-svg.svg",
  wasm: "kind-wasm.svg",
  http: "kind-http.svg",
  xml: "kind-xml.svg",
  xpath: "kind-xpath.svg",
  xslt: "kind-xslt.svg",
  exslt: "kind-exslt.svg",
  mathml: Icon.Calculator,
  webextensions: Icon.AppWindow,
  manifest: Icon.Box,
  webdriver: Icon.Terminal,
};

const GUIDE_OVERRIDES = [
  /^\/docs\/web\/api(?:\/[^/]+)?\/tutorials?\//,
  /^\/docs\/web\/api\/[^/]+\/using_/,
  /^\/docs\/web\/api(?:\/[^/]+)?\/guides?\//,
];

export function isSupportedLanguage(value: string | undefined): value is SupportedLanguage {
  return typeof value === "string" && SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

export function toMdnPath(urlOrPath: string): string {
  try {
    return new URL(urlOrPath, MDN_BASE_URL).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "/";
  }
}

export function toAbsoluteMdnUrl(urlOrPath: string): string {
  return new URL(urlOrPath, MDN_BASE_URL).toString();
}

export function normalizeMdnPath(urlOrPath: string): string {
  const path = toMdnPath(urlOrPath);
  return path.replace(/^\/[a-z]{2}(?:-[A-Z]{2})?(?=\/)/, "").toLowerCase();
}

export function getMdnKind(urlOrPath: string): MdnKind {
  const path = normalizeMdnPath(urlOrPath);

  if (GUIDE_OVERRIDES.some((regex) => regex.test(path))) {
    return "guide";
  }

  if (/^\/docs\/web\/css\/reference\//.test(path)) {
    return "css";
  }

  if (/^\/docs\/web\/html\/reference\//.test(path)) {
    return "html";
  }

  if (/^\/docs\/web\/svg\/reference\//.test(path)) {
    return "svg";
  }

  if (/^\/docs\/(?:web\/webassembly|webassembly)\/reference\//.test(path)) {
    return "wasm";
  }

  if (/^\/docs\/web\/http\/reference\//.test(path)) {
    return "http";
  }

  if (/^\/docs\/web\/xml\/xpath(?:\/|$)/.test(path)) {
    return "xpath";
  }

  if (/^\/docs\/web\/xml\/xslt(?:\/|$)/.test(path)) {
    return "xslt";
  }

  if (/^\/docs\/web\/xml\/exslt(?:\/|$)/.test(path)) {
    return "exslt";
  }

  if (/^\/docs\/web\/xml(?:\/|$)/.test(path)) {
    return "xml";
  }

  if (/^\/docs\/web\/mathml\/reference\//.test(path)) {
    return "mathml";
  }

  if (/^\/docs\/mozilla\/add-ons\/webextensions\/(?:api|manifest\.json)(?:\/|$)/.test(path)) {
    return "webextensions";
  }

  if (/^\/docs\/web\/progressive_web_apps\/manifest\/reference\//.test(path)) {
    return "manifest";
  }

  if (/^\/docs\/web\/webdriver\/reference\//.test(path)) {
    return "webdriver";
  }

  if (/^\/docs\/web\/javascript\/reference\//.test(path) || /^\/docs\/web\/api(?:\/|$)/.test(path)) {
    return "js";
  }

  return "guide";
}

export function getMdnKindLabel(kind: MdnKind): string {
  const labels: Record<MdnKind, string> = {
    guide: "Guide",
    js: "JavaScript",
    html: "HTML",
    css: "CSS",
    svg: "SVG",
    wasm: "WebAssembly",
    http: "HTTP",
    xml: "XML",
    xpath: "XPath",
    xslt: "XSLT",
    exslt: "EXSLT",
    mathml: "MathML",
    webextensions: "WebExtensions",
    manifest: "Web App Manifest",
    webdriver: "WebDriver",
  };

  return labels[kind];
}

export function getMdnKindIcon(kind: MdnKind) {
  return KIND_ICONS[kind];
}

export function buildResultSummary(urlOrPath: string): string {
  const path = toMdnPath(urlOrPath);
  const segments = path.split("/").filter(Boolean);
  const docsIndex = segments.findIndex((segment) => segment.toLowerCase() === "docs");
  const scoped = docsIndex >= 0 ? segments.slice(docsIndex + 1) : segments;
  const withoutLeadingWeb = scoped[0]?.toLowerCase() === "web" ? scoped.slice(1) : scoped;

  return withoutLeadingWeb
    .map((segment) => {
      try {
        return decodeURIComponent(segment).replace(/_/g, " ");
      } catch {
        return segment.replace(/_/g, " ");
      }
    })
    .join(" / ");
}
