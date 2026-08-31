import { closeMainWindow, open, showHUD } from '@raycast/api';

/** Where new users land when the desktop app isn't installed. */
const DOWNLOAD_URL = 'https://record.so/';

/**
 * Fire a recordso:// deep link at the desktop app. The app registers the scheme
 * (recordso://record|stop|pause|shot|open — desktop ≥1.7.1; older versions surface the
 * panel for any unrecognized command, so every command still lands somewhere sensible).
 *
 * macOS throws from open() when no app owns the scheme — that is the "not installed"
 * signal, and we fall back to the website instead of failing silently.
 */
export async function trigger(link: string, hud: string): Promise<void> {
  // Raycast's own window would end up in the recording/screenshot — close it first.
  await closeMainWindow({ clearRootSearch: true });
  try {
    await open(link);
    await showHUD(hud);
  } catch {
    await open(DOWNLOAD_URL);
    await showHUD("Record isn't installed — opening record.so");
  }
}
