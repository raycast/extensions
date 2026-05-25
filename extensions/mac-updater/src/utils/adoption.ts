import { LocalStorage } from "@raycast/api";
import { InstalledApp, UpdateResult } from "./types";
import { ScanResult } from "./coordinator";
import { getKnownInstall, KnownInstall } from "./known-installs";
import { extractCmdError, runShell } from "./shell";
import { isMasInstalled, installMas } from "./sources/mas";
import { openInAppStore, runShellAsAdmin } from "./external";

const DISMISS_KEY = "mac-updater-adoption-dismissed-v1";

async function getDismissed(): Promise<Set<string>> {
  const raw = await LocalStorage.getItem<string>(DISMISS_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export async function dismissAdoption(bundleId: string): Promise<void> {
  const set = await getDismissed();
  set.add(bundleId);
  await LocalStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(set)));
}

export async function undismissAdoption(bundleId: string): Promise<void> {
  const set = await getDismissed();
  set.delete(bundleId);
  await LocalStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(set)));
}

export async function clearDismissed(): Promise<void> {
  await LocalStorage.removeItem(DISMISS_KEY);
}

export async function getDismissedAdoptions(): Promise<Set<string>> {
  return getDismissed();
}

function humanizeInstallError(raw: string, install: KnownInstall): string {
  const m = raw.trim();
  // mas-specific
  if (install.kind === "mas") {
    if (/not signed in|sign in to the.*App Store/i.test(m)) {
      return "Sign in to the App Store first (open App Store.app → Account menu), then retry.";
    }
    if (/did you purchase|not purchased|haven't.*purchased/i.test(m)) {
      return "This app isn't in your Apple ID's Purchased list. Open it in the App Store and click Get/Buy first, then retry.";
    }
    if (/sudo.*terminal.*required|password is required/i.test(m)) {
      return (
        "mas needs admin auth that Raycast can't supply. Run this once in Terminal:\n  mas install " +
        (install.masId ?? "<id>")
      );
    }
    if (/no such xcode/i.test(m)) {
      return "mas needs Xcode Command Line Tools. Run: xcode-select --install";
    }
  }
  // brew-specific
  if (install.kind === "brew-tap") {
    if (/permission denied|operation not permitted/i.test(m)) {
      return "Brew couldn't write to /Applications — try running the same install command in Terminal so it can prompt for admin auth.";
    }
    if (/it seems there is already an app at/i.test(m)) {
      return "An app already exists at /Applications. Drag it to the Trash, then retry.";
    }
    // Common third-party tap failure: the cask points at a CDN URL that's been
    // pulled. Not our bug, but tell the user clearly so they don't try again forever.
    if (/Download failed.*404|curl.*\(56\).*404|404 Not Found/i.test(m)) {
      const cask = install.caskToken ?? "this cask";
      return `${cask}'s download URL returned 404 — the tap maintainer needs to refresh the cask version. Try \`brew update && brew install --cask ${cask}\` in Terminal, or download the app directly from the project's website.`;
    }
    if (/SHA256 mismatch|sha256 checksum/i.test(m)) {
      return "The download didn't match the expected checksum — the tap needs to be updated. Try `brew update` in Terminal and retry.";
    }
  }
  return m;
}

export interface Adoptable {
  app: InstalledApp;
  caskToken: string;
  /** Where this adoption suggestion came from. */
  kind: "cask" | "brew-tap" | "mas";
  description?: string;
}

/**
 * An app is "adoptable" if it has a matching Homebrew cask AND isn't currently
 * managed by Homebrew AND the user hasn't dismissed it.
 *
 * Pulls from both `scan.apps` (apps with some update source) and `scan.unmanaged`
 * (apps with no detected source). De-dupes by appPath.
 */
export async function getAdoptableApps(scan: ScanResult): Promise<Adoptable[]> {
  const dismissed = await getDismissed();
  const seen = new Set<string>();
  const result: Adoptable[] = [];

  const add = (app: InstalledApp) => {
    if (seen.has(app.appPath)) return;
    if (app.managedByBrew) return;
    if (dismissed.has(app.bundleId)) return;

    const known = getKnownInstall(app.bundleId);
    // 1. Curated known install (third-party tap or MAS) takes precedence — BUT:
    //    if it's a MAS entry and the app already has a MAS receipt, the app is
    //    already managed by the App Store. Nothing to "adopt" — they're done.
    if (known) {
      if (known.kind === "mas" && app.hasAppStoreReceipt) return;
      seen.add(app.appPath);
      result.push({
        app,
        caskToken: known.caskToken ?? `mas:${known.masId}`,
        kind: known.kind,
        description: known.description,
      });
      return;
    }
    // 2. Standard cask suggestion — but skip if the app is a MAS install
    //    (the brew cask is a different download and adoption almost always fails)
    if (app.hasAppStoreReceipt) return;
    if (app.suggestedCask) {
      seen.add(app.appPath);
      result.push({
        app,
        caskToken: app.suggestedCask,
        kind: "cask",
      });
    }
  };

  for (const info of scan.apps) add(info.app);
  for (const app of scan.unmanaged) add(app);

  return result;
}

/**
 * Run a known-install command sequence (brew tap + install, or mas install).
 * Auto-installs `mas` if a MAS install is requested and mas isn't present.
 */
export async function runKnownInstall(
  install: KnownInstall,
  appName: string,
): Promise<UpdateResult> {
  // Disabled entries skip the install attempt entirely — the upstream tap or
  // download is known to be broken right now. Open the homepage instead.
  if (install.disabled) {
    if (install.homepageUrl) {
      await import("./external").then((m) =>
        m.openHomepage(install.homepageUrl!),
      );
      return {
        name: appName,
        source: install.kind === "mas" ? "mas" : "homebrew-cask",
        success: false,
        error:
          install.disabledReason ??
          "This install is currently broken upstream. Opened the project page so you can install manually.",
      };
    }
    return {
      name: appName,
      source: install.kind === "mas" ? "mas" : "homebrew-cask",
      success: false,
      error:
        install.disabledReason ?? "This install is currently broken upstream.",
    };
  }

  if (install.kind === "mas") {
    // For MAS-known apps the safest first-time path is the App Store directly
    // (Apple requires the user to click Get on each app once before mas install
    // will work for it). Open the App Store and let the user complete it there;
    // the next scan will pick up the receipt and the app will leave Adoptable.
    if (install.masId) {
      await openInAppStore(install.masId);
      return {
        name: appName,
        source: "mas",
        success: true,
      };
    }
    if (!(await isMasInstalled())) {
      const r = await installMas();
      if (!r.success)
        return { name: appName, source: "mas", success: false, error: r.error };
    }
  }
  for (const cmd of install.commands) {
    try {
      await runShell(cmd);
    } catch (e) {
      const raw = extractCmdError(e);
      // Some errors are actually fine — keep going
      if (/already tapped|tap.*already exists|already installed/i.test(raw))
        continue;

      // If the command failed because it needed sudo, retry once via osascript
      // 'do shell script ... with administrator privileges'. macOS pops a system
      // password dialog. Works for mas paid-app installs and brew /Applications writes.
      if (
        /sudo.*terminal.*required|password is required|permission denied|operation not permitted/i.test(
          raw,
        )
      ) {
        try {
          await runShellAsAdmin(
            cmd,
            `Mac Updater needs admin access to install ${appName}.`,
          );
          continue; // success on this command — move to next
        } catch (e2) {
          // User dismissed the password dialog or admin run still failed
          const adminErr = extractCmdError(e2);
          // -128 is the AppleScript "user cancelled" code
          if (/User canceled|cancelled|-128/i.test(adminErr)) {
            return {
              name: appName,
              source: install.kind === "mas" ? "mas" : "homebrew-cask",
              success: false,
              error: "Admin password was cancelled.",
            };
          }
          return {
            name: appName,
            source: install.kind === "mas" ? "mas" : "homebrew-cask",
            success: false,
            error: humanizeInstallError(adminErr, install),
          };
        }
      }

      // Translate cryptic errors into actionable ones
      const friendly = humanizeInstallError(raw, install);
      return {
        name: appName,
        source: install.kind === "mas" ? "mas" : "homebrew-cask",
        success: false,
        error: friendly,
      };
    }
  }
  return {
    name: appName,
    source: install.kind === "mas" ? "mas" : "homebrew-cask",
    success: true,
  };
}
