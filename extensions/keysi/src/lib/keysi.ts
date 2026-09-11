import { open, showToast, Toast } from "@raycast/api";

/**
 * Keysi's `keysi://` command surface. See `KeysiURLCommand` on the Swift
 * side for the full list and for why it only ever carries actions.
 *
 * The extension cannot read the Accessibility API — no Raycast extension
 * can — so anything about the live menu bar of the frontmost app has to be
 * asked of the app that already has that permission.
 */
async function run(command: string, params?: Record<string, string>): Promise<void> {
  const query = params
    ? "?" +
      Object.entries(params)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&")
    : "";
  try {
    await open(`keysi://${command}${query}`);
  } catch {
    // `open` fails when nothing handles the scheme, which in practice means
    // one thing: Keysi is not installed. Saying that is far more useful than
    // relaying a URL error.
    await showToast({
      style: Toast.Style.Failure,
      title: "Keysi isn't installed",
      message: "Download it from keysi.io, then try again.",
    });
  }
}

/** Opens Keysi's panel for whichever app the user was in before Raycast. */
export const showShortcuts = (query?: string) => (query ? run("show", { q: query }) : run("show"));

export const startPractice = () => run("practice");

export const showProgress = () => run("progress");
