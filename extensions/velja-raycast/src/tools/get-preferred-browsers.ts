import { getBrowserSubtitle, getBrowserTitle, getSelectableBrowserIdentifiers } from "../lib/browsers";
import { readVeljaConfig } from "../lib/velja";

type BrowserOption = {
  identifier: string;
  title: string;
  subtitle: string;
};

type Output = {
  browsers: BrowserOption[];
};

/**
 * Returns all browser identifiers available for Velja rules in picker order.
 */
export default function tool(): Output {
  const config = readVeljaConfig();
  const identifiers = getSelectableBrowserIdentifiers(config.preferredBrowsers, {
    includePrompt: true,
    promptFirst: true,
  });

  return {
    browsers: identifiers.map((identifier) => ({
      identifier,
      title: getBrowserTitle(identifier),
      subtitle: getBrowserSubtitle(identifier),
    })),
  };
}
