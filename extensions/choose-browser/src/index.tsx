import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { exec, execFileSync, execSync } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";
import { useEffect, useState } from "react";

const execAsync = promisify(exec);

interface Browser {
  id: string;
  name: string;
  isDefault: boolean;
  appPath: string | null;
}

const DEFAULT_BROWSER_BIN =
  ["/opt/homebrew/bin/defaultbrowser", "/usr/local/bin/defaultbrowser"].find(
    (p) => existsSync(p),
  ) ?? "defaultbrowser";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sortedBrowsers(browsers: Browser[]): Browser[] {
  return [...browsers].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function browserIcon(browser: Browser): Image.ImageLike {
  if (browser.appPath) return { fileIcon: browser.appPath };
  return { source: Icon.Globe, tintColor: Color.SecondaryText };
}

async function getDisplayName(appPath: string): Promise<string | null> {
  const plist = `${appPath}/Contents/Info.plist`;
  if (!existsSync(plist)) return null;
  for (const key of ["CFBundleDisplayName", "CFBundleName"]) {
    try {
      const { stdout } = await execAsync(
        `/usr/libexec/PlistBuddy -c "Print :${key}" "${plist}"`,
        { timeout: 2000 },
      );
      const val = stdout.trim();
      if (val) return val;
    } catch {
      // key not present in plist — try next
    }
  }
  return null;
}

async function findBrowserApp(
  id: string,
): Promise<{ name: string; path: string } | null> {
  // Try bundle ID first (e.g. "firefox" → org.mozilla.firefox),
  // then display name as fallback (e.g. "arc" → Arc.app whose bundle ID has no "arc").
  const queries = [
    `kMDItemCFBundleIdentifier == '*${id}*'c`,
    `kMDItemDisplayName == '*${id}*'c && kMDItemContentType == 'com.apple.application-bundle'`,
  ];
  for (const query of queries) {
    try {
      const { stdout } = await execAsync(
        `mdfind "${query}" -onlyin /Applications`,
        {
          timeout: 3000,
        },
      );
      const paths = stdout
        .trim()
        .split("\n")
        .filter((p) => p.endsWith(".app") && existsSync(p));
      const appPath =
        paths.find((p) => /^\/Applications\/[^/]+\.app$/.test(p)) ?? paths[0];
      if (appPath) {
        return {
          name: (await getDisplayName(appPath)) ?? capitalize(id),
          path: appPath,
        };
      }
    } catch {
      // mdfind failed or timed out — try next query
    }
  }
  return null;
}

async function loadBrowsers(): Promise<Browser[]> {
  const { stdout } = await execAsync(DEFAULT_BROWSER_BIN);
  const lines = stdout.trim().split("\n").filter(Boolean);
  const browsers = await Promise.all(
    lines.map(async (line) => {
      const isDefault = line.startsWith("*");
      const id = line.replace(/^\*?\s*/, "").trim();
      const appInfo = await findBrowserApp(id);
      return {
        id,
        name: appInfo?.name ?? capitalize(id),
        isDefault,
        appPath: appInfo?.path ?? null,
      };
    }),
  );
  return sortedBrowsers(browsers);
}

export default function BrowserList() {
  const [browsers, setBrowsers] = useState<Browser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBrowsers()
      .then(setBrowsers)
      .catch(() =>
        setError(
          "'defaultbrowser' not found. Install it: brew install defaultbrowser",
        ),
      )
      .finally(() => setIsLoading(false));
  }, []);

  async function setDefault(browser: Browser) {
    if (browser.isDefault) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Setting ${browser.name} as default…`,
    });
    try {
      execFileSync(DEFAULT_BROWSER_BIN, [browser.id]);
      try {
        execSync(
          `osascript -e 'tell application "System Events" to tell process "CoreServicesUIAgent" to click button 1 of window 1'`,
          { timeout: 2000 },
        );
      } catch {
        // Dialog may not appear on all macOS versions
      }
      toast.style = Toast.Style.Success;
      toast.title = `${browser.name} is now your default browser`;
      setBrowsers((prev) =>
        sortedBrowsers(
          prev.map((b) => ({ ...b, isDefault: b.id === browser.id })),
        ),
      );
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to set ${browser.name} as default`;
    }
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Missing dependency"
          description={error}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Choose Default Browser">
      {browsers.map((browser) => (
        <List.Item
          key={browser.id}
          title={browser.name}
          icon={browserIcon(browser)}
          accessories={
            browser.isDefault
              ? [{ tag: { value: "Default", color: Color.Green } }]
              : []
          }
          actions={
            <ActionPanel>
              <Action
                title={browser.isDefault ? "Already Default" : "Set as Default"}
                icon={
                  browser.isDefault
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : browserIcon(browser)
                }
                onAction={() => setDefault(browser)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
