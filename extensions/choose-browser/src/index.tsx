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
import { execSync } from "child_process";
import { existsSync } from "fs";
import { useEffect, useState } from "react";

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

function getDisplayName(appPath: string): string | null {
  const plist = `${appPath}/Contents/Info.plist`;
  if (!existsSync(plist)) return null;
  for (const key of ["CFBundleDisplayName", "CFBundleName"]) {
    try {
      const val = execSync(
        `/usr/libexec/PlistBuddy -c "Print :${key}" "${plist}"`,
        {
          encoding: "utf-8",
          timeout: 2000,
          stdio: ["ignore", "pipe", "ignore"],
        },
      ).trim();
      if (val) return val;
    } catch {
      // key not present in plist — try next
    }
  }
  return null;
}

function findBrowserApp(id: string): { name: string; path: string } | null {
  // Try matching bundle ID first (e.g. "firefox" matches org.mozilla.firefox),
  // then fall back to display name (e.g. "arc" matches Arc.app whose bundle ID has no "arc").
  const queries = [
    `kMDItemCFBundleIdentifier == '*${id}*'c`,
    `kMDItemDisplayName == '*${id}*'c && kMDItemContentType == 'com.apple.application-bundle'`,
  ];

  for (const query of queries) {
    try {
      const result = execSync(`mdfind "${query}" -onlyin /Applications`, {
        encoding: "utf-8",
        timeout: 3000,
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();

      const paths = result
        .split("\n")
        .filter((p) => p.endsWith(".app") && existsSync(p));

      // Prefer a top-level /Applications/*.app over nested paths
      const appPath =
        paths.find((p) => /^\/Applications\/[^/]+\.app$/.test(p)) ?? paths[0];

      if (appPath) {
        return {
          name: getDisplayName(appPath) ?? capitalize(id),
          path: appPath,
        };
      }
    } catch {
      // mdfind failed or timed out — try next query
    }
  }

  return null;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function browserIcon(browser: Browser): Image.ImageLike {
  if (browser.appPath) return { fileIcon: browser.appPath };
  return { source: Icon.Globe, tintColor: Color.SecondaryText };
}

function loadBrowsers(): Browser[] {
  const output = execSync(DEFAULT_BROWSER_BIN, { encoding: "utf-8" });
  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const isDefault = line.startsWith("*");
      const id = line.replace(/^\*?\s*/, "").trim();
      const appInfo = findBrowserApp(id);
      return {
        id,
        name: appInfo?.name ?? capitalize(id),
        isDefault,
        appPath: appInfo?.path ?? null,
      };
    })
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function sortedBrowsers(browsers: Browser[]): Browser[] {
  return [...browsers].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export default function BrowserList() {
  const [browsers, setBrowsers] = useState<Browser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setBrowsers(loadBrowsers());
    } catch {
      setError(
        "'defaultbrowser' not found. Install it: brew install defaultbrowser",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function setDefault(browser: Browser) {
    if (browser.isDefault) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Setting ${browser.name} as default…`,
    });
    try {
      execSync(`${DEFAULT_BROWSER_BIN} ${browser.id}`);
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
