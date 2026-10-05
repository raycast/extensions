import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export const SAFARI_BUNDLE_ID = "com.apple.Safari";

export type SafariTab = {
  index: number;
  url: string;
  windowId: string;
};

export async function openSafariTab(url: string, applicationPath?: string): Promise<SafariTab> {
  if (process.platform !== "darwin") throw new Error("Safari is available only on macOS.");

  await execFileAsync("/usr/bin/open", applicationPath ? ["-a", applicationPath] : ["-b", SAFARI_BUNDLE_ID], {
    timeout: 10_000,
  });
  const { stdout } = await execFileAsync(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", OPEN_TAB_SCRIPT, "--", url, applicationPath ?? "Safari"],
    {
      encoding: "utf8",
      timeout: 30_000,
    },
  );
  try {
    return JSON.parse(stdout.trim()) as SafariTab;
  } catch {
    throw new Error("Safari created a tab but did not return its details.");
  }
}

export async function closeSafariTabs(tabs: SafariTab[], applicationPath?: string): Promise<number> {
  if (process.platform !== "darwin" || tabs.length === 0) return 0;
  const { stdout } = await execFileAsync(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", CLOSE_TABS_SCRIPT, "--", JSON.stringify(tabs), applicationPath ?? "Safari"],
    { encoding: "utf8", timeout: 30_000 },
  );
  return Number.parseInt(stdout.trim(), 10) || 0;
}

const OPEN_TAB_SCRIPT = String.raw`
function run(argv) {
  const url = argv[0];
  const safari = Application(argv[1]);
  safari.activate();

  let windows = [];
  for (let attempt = 0; attempt < 20; attempt++) {
    windows = safari.windows();
    if (windows.length > 0) break;
    delay(0.1);
  }

  if (windows.length === 0) {
    const document = safari.Document({ url });
    safari.documents.push(document);
    windows = safari.windows();
    return JSON.stringify({ index: 1, url, windowId: String(windows[0].id()) });
  }

  const window = windows[0];
  const tab = safari.Tab({ url });
  window.tabs.push(tab);
  window.currentTab.set(tab);
  return JSON.stringify({ index: Number(tab.index()), url, windowId: String(window.id()) });
}
`;

const CLOSE_TABS_SCRIPT = String.raw`
function run(argv) {
  const wanted = JSON.parse(argv[0]);
  const safari = Application(argv[1]);
  let closed = 0;
  for (const expected of wanted) {
    const window = safari.windows().find((candidate) => String(candidate.id()) === expected.windowId);
    if (!window) continue;
    const tab = window.tabs().find((candidate) => String(candidate.url()) === expected.url);
    if (!tab) continue;
    tab.close();
    closed++;
  }
  return String(closed);
}
`;
