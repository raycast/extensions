import { closeMainWindow, open, showHUD } from '@raycast/api';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

/** Where new users land when the desktop app isn't installed. */
const DOWNLOAD_URL = 'https://record.so/';

/** First desktop version whose deep links execute commands (older ones only open the panel). */
const MIN_VERSION = '1.7.1';

/** Installed Record.so version from its Info.plist, or null when it can't be determined. */
function installedVersion(): string | null {
  for (const app of ['/Applications/Record.so.app', `${homedir()}/Applications/Record.so.app`]) {
    try {
      const plist = readFileSync(`${app}/Contents/Info.plist`, 'utf8');
      const m = plist.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/);
      if (m) return m[1];
    } catch {
      // not installed at this path — try the next one
    }
  }
  return null;
}

function olderThan(version: string, min: string): boolean {
  const a = version.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const b = min.split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d < 0;
  }
  return false;
}

/**
 * Fire a recordso:// deep link at the desktop app. Deep-link commands exist since desktop
 * v1.7.1; an older app only surfaces its panel for them, so the HUD must not claim the
 * action happened — we read the installed version from the app bundle and say "update"
 * instead. When the version can't be read (nonstandard install location), the link still
 * fires and the optimistic HUD is shown.
 *
 * macOS throws from open() when no app owns the scheme — that is the "not installed"
 * signal, and we fall back to the website instead of failing silently.
 */
export async function trigger(link: string, hud: string): Promise<void> {
  // Raycast's own window would end up in the recording/screenshot — close it first.
  await closeMainWindow({ clearRootSearch: true });
  const version = installedVersion();
  const outdated = version !== null && olderThan(version, MIN_VERSION);
  try {
    await open(link);
    await showHUD(
      outdated
        ? `Record ${version} only opens its panel for this — update to ${MIN_VERSION}+ (panel → update banner)`
        : hud,
    );
  } catch {
    await open(DOWNLOAD_URL);
    await showHUD("Record isn't installed — opening record.so");
  }
}
