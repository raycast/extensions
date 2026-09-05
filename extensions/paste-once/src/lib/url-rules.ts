import { URLQueryParamRule } from "./types";

export const URLQueryParamRules = {
  builtIn: [
    { domain: "youtube.com", keepParams: new Set(["v", "list", "t"]) },
    { domain: "youtu.be", keepParams: new Set(["t"]) },
    { domain: "docs.google.com", keepParams: new Set(["tab"]) },
    { domain: "sheets.google.com", keepParams: new Set(["tab"]) },
    { domain: "slides.google.com", keepParams: new Set(["tab"]) },
    { domain: "maps.google.com", keepParams: new Set(["q", "ll", "z"]) },
    { domain: "github.com", keepParams: new Set(["tab"]) },
    { domain: "codesandbox.io", keepParams: new Set(["file"]) },
    { domain: "figma.com", keepParams: new Set(["node-id"]) },
  ] satisfies URLQueryParamRule[],

  get defaultRulesText(): string {
    return this.builtIn.map((rule) => `${rule.domain}: ${[...rule.keepParams].sort().join(", ")}`).join("\n");
  },

  parseCustomRules(text: string): URLQueryParamRule[] {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .flatMap((line): URLQueryParamRule[] => {
        const colon = line.indexOf(":");
        if (colon === -1) return [];
        const domain = line.slice(0, colon).trim().toLowerCase();
        if (!domain) return [];
        const params = line
          .slice(colon + 1)
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part.length > 0);
        if (params.length === 0) return [];
        return [{ domain, keepParams: new Set(params) }];
      });
  },

  keepParams(host: string, customRules: URLQueryParamRule[]): Set<string> {
    const normalizedHost = host.toLowerCase();
    const match = customRules.find((rule) => {
      const domain = rule.domain.toLowerCase();
      return normalizedHost === domain || normalizedHost.endsWith(`.${domain}`);
    });
    return match ? match.keepParams : new Set();
  },
};
