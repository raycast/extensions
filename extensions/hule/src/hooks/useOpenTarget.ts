import { getApplications, type Application } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

/** The desktop shell's bundle identifier — see apps/desktop/electron-builder.yml. */
const DESKTOP_BUNDLE_ID = "com.huledo.app";

/**
 * The app a task link should open in: the Hule desktop shell when macOS says it
 * claims `hule://`, the browser otherwise.
 *
 * Asked about the SCHEME, once, rather than about each task's URL: the answer is
 * the same for every row, and a per-row query meant one system call per visible
 * task for a value that cannot differ between them.
 *
 * The query is allowed to fail. `getApplications` takes a path-like argument and
 * a scheme no application has registered is not a path — macOS answers ENOENT,
 * which surfaced as a "Failed to fetch latest data" toast over the whole list.
 * A failure here means exactly one thing, and it is not an error worth showing:
 * nothing claims the scheme, so the link belongs in the browser.
 */
export function useOpenTarget(): Application | undefined {
  const { data } = useCachedPromise(async () => {
    try {
      const handlers = await getApplications("hule://");
      return handlers.find((app) => app.bundleId === DESKTOP_BUNDLE_ID) ?? null;
    } catch {
      return null;
    }
  }, []);

  return data ?? undefined;
}
