import { promises as fs } from "node:fs";
import { missing, readError } from "../chromium/files";
import { scanChromium } from "../discovery/scan";
import { Scan } from "../model";
import { BrowserAdapter, browsers } from "./registry";

export async function scanBrowsers(
  adapters: BrowserAdapter[] = browsers,
  now = new Date().toISOString(),
  options: { analyzeCode?: boolean } = {},
): Promise<Scan> {
  const scans = await Promise.all(
    adapters.map(async (browser): Promise<Scan | undefined> => {
      try {
        await fs.stat(browser.root);
        return await scanChromium(browser.root, { browser, now, ...options });
      } catch (error) {
        if (missing(error)) return;
        return {
          at: now,
          profiles: [],
          discoveryComplete: false,
          diagnostics: [`${browser.name}: ${readError(error)}. Previous observations are retained.`],
        };
      }
    }),
  );
  const results = scans.filter((scan): scan is Scan => scan !== undefined);
  const scan: Scan = {
    at: now,
    profiles: results.flatMap((result) => result.profiles),
    diagnostics: results.flatMap((result) => result.diagnostics),
    notices: results.flatMap((result) => result.notices ?? []),
    discoveryComplete: results.every((result) => result.discoveryComplete),
  };
  if (!scan.profiles.length && !scan.diagnostics.length)
    scan.diagnostics.push(
      "No supported browser profiles were found. Open a supported browser to create a profile, then scan again.",
    );
  return scan;
}
