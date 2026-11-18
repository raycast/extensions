import { getFrontmostApplication } from "@raycast/api";
import { getPlatform } from "../load/platform";
import { getWindowsFrontmostBrowserTarget } from "./windows-hostname-fetcher";
import type { ExecutionTarget } from "./execution-target";
import { runAppleScript } from "@raycast/utils";

type MacBrowserFamily = "chromium" | "safari" | "arc";

const macBrowsers: Record<string, MacBrowserFamily> = {
  "com.google.Chrome": "chromium",
  "com.google.Chrome.beta": "chromium",
  "com.google.Chrome.canary": "chromium",
  "com.vivaldi.Vivaldi": "chromium",
  "com.brave.Browser": "chromium",
  "com.microsoft.edgemac": "chromium",
  "com.operasoftware.Opera": "chromium",
  "org.chromium.Chromium": "chromium",
  "com.apple.Safari": "safari",
  "com.apple.SafariTechPreview": "safari",
  "company.thebrowser.Browser": "arc",
};

//language=JavaScript
const urlScripts: Record<MacBrowserFamily, string> = {
  chromium: "function run(argv) { return Application(argv[0]).windows[0].activeTab().url() || ''; }",
  safari: "function run(argv) { return Application(argv[0]).documents[0].url() || ''; }",
  arc: "function run(argv) { return Application(argv[0]).windows[0].activeTab.url() || ''; }",
};

export async function getFrontmostBrowserTarget(): Promise<ExecutionTarget | null> {
  if (getPlatform() === "windows") return getWindowsFrontmostBrowserTarget();
  const { bundleId } = await getFrontmostApplication();
  const family = bundleId ? macBrowsers[bundleId] : undefined;
  if (!bundleId || !family) return null;
  const url = await runAppleScript(urlScripts[family], [bundleId], { language: "JavaScript" });
  if (!url) throw new Error("The active browser tab has no web page");
  return { kind: "browser", bundleId, url, hostname: new URL(url).hostname };
}
export async function getFrontmostHostname(): Promise<string | null> {
  const target = await getFrontmostBrowserTarget();
  return target?.kind === "browser" ? target.hostname : null;
}
