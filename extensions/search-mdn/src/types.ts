export type BaselineAvailability = "high" | "low" | false | undefined;

export type MdnKind =
  | "guide"
  | "js"
  | "html"
  | "css"
  | "svg"
  | "wasm"
  | "http"
  | "xml"
  | "xpath"
  | "xslt"
  | "exslt"
  | "mathml"
  | "webextensions"
  | "manifest"
  | "webdriver";

export type BrowserSupportRow = {
  browserId: string;
  browserName: string;
  support: string;
  icon?: string;
  releaseDate?: string;
};

export type CompatMatch = {
  compatKey: string;
  mdnPath: string;
  matchType: "exact" | "parent";
  baseline: BaselineAvailability;
  baselineDate?: string;
  browsers: BrowserSupportRow[];
};

export type Result = {
  id: string;
  title: string;
  url: string;
  path: string;
  summary?: string;
  kind: MdnKind;
};

export interface Content {
  content: string;
  encoding: string;
}
