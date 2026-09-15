import { getApplications, open } from "@raycast/api";

// Cache the promise (not the resolved value) so concurrent calls share one
// getApplications() lookup instead of racing to populate it.
let appNamesPromise: Promise<Set<string>> | null = null;
async function isAppInstalled(name: string): Promise<boolean> {
  if (!appNamesPromise) {
    appNamesPromise = getApplications().then(
      (apps) => new Set(apps.map((a) => a.name.toLowerCase())),
    );
  }
  return (await appNamesPromise).has(name.toLowerCase());
}

// Not unit-tested: this module imports @raycast/api, which can't be loaded
// outside Raycast. Verified by hand against the app, bare, slugged, and
// query-string URL forms.
/** The Todoist task id from a task URL (last path segment, minus any slug). */
function todoistTaskId(url: string): string | null {
  const match = url.match(/todoist\.com\/(?:app\/)?task\/([^/?#]+)/i);
  if (!match) return null;
  const segment = match[1];
  // URLs may carry a slug prefix ("buy-milk-6gwW6RxjHwp8hqxr").
  return segment.split("-").pop() ?? null;
}

/**
 * Open an integration link, preferring the native desktop app at the exact item.
 *
 * - Trello desktop registers the `trello://` scheme — swap the protocol so it
 *   deep-links to the specific card instead of just launching the app.
 * - Todoist desktop registers `todoist://task?id=` — deep-link to the task.
 * - Slack/Linear/etc.: open the `https` URL with the default handler. When the
 *   desktop app is installed it claims its own URLs and navigates to the exact
 *   item; forcing the app via `open(url, app)` only lands on its home screen.
 *   (Slack's `slack://` scheme has no message-level form and needs a team ID the
 *   permalink doesn't carry, so the https permalink is the best we can do.)
 */
export async function openIntegration(
  url: string,
  service?: string,
): Promise<void> {
  if (service === "trello" && (await isAppInstalled("Trello"))) {
    await open(url.replace(/^https?:\/\//i, "trello://"));
    return;
  }
  if (service === "todoist" && (await isAppInstalled("Todoist"))) {
    const id = todoistTaskId(url);
    if (id) {
      await open(`todoist://task?id=${id}`);
      return;
    }
  }
  await open(url);
}
