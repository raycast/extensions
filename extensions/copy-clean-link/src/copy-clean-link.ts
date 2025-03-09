import { BrowserExtension, Clipboard } from "@raycast/api";
import rules from "./clean-urls.json";

// Define types for the rules
interface Rule {
  include: string[];
  exclude?: string[];
  params: string[];
}

// Helper: converts a wildcard pattern (e.g. "*://*.amazon.com/*")
// to a RegExp that tests a URL's href.
function patternToRegex(pattern: string): RegExp {
  // Escape regex-special characters except for '*'
  let regexStr = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&");
  // Replace '*' with '.*' to match any characters.
  regexStr = regexStr.replace(/\*/g, ".*");
  return new RegExp(`^${regexStr}$`);
}

// Checks if the URL (as a URL object) matches any pattern in the patterns array.
function matchesPatterns(url: URL, patterns: string[]): boolean {
  return patterns.some((pattern) => patternToRegex(pattern).test(url.href));
}

// Main cleaning function:
function cleanUrl(urlString: string, rules: Rule[]): string {
  const url = new URL(urlString);

  // Loop through each rule.
  rules.forEach((rule) => {
    // If the URL matches an "include" pattern...
    if (matchesPatterns(url, rule.include)) {
      // ...and doesn't match any "exclude" patterns (if any are defined):
      if (!rule.exclude || rule.exclude.length === 0 || !matchesPatterns(url, rule.exclude)) {
        // Remove each query parameter listed in this rule.
        rule.params.forEach((param) => {
          url.searchParams.delete(param);
        });
      }
    }
  });

  return url.toString();
}

export default async function Command() {
  const tabs = await BrowserExtension.getTabs();
  const activeTab = tabs.filter((tab) => tab.active);
  const url = cleanUrl(activeTab[0].url, rules);
  await Clipboard.copy(url);
}
