/**
 * Every `jotaid://` URL this extension opens is built here.
 *
 * The scheme is the app's public contract with outside tools (PopClip, Shortcuts, this
 * extension). Hand-assembling URLs at each call site is how a stray unencoded `&` in a
 * note body silently truncates the text the user meant to save, so parameter encoding
 * lives in one place and nowhere else.
 */

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Query keys understood by `jotaid://clip-note`, mirroring `ExternalClipPayload.QueryKey`. */
interface ClipParams {
  /** The text to save. Required — the app drops a clip whose body is empty. */
  text: string;
  /** Title of the page or document the text came from. */
  sourceTitle?: string;
  /** Link back to the source. Only `https:` survives the app's sanitiser. */
  sourceURL?: string;
  /** Name of the app the text was captured from. */
  sourceApp?: string;
  /** Bundle identifier of that app, used to hand the foreground back afterwards. */
  sourceBundleID?: string;
}

function build(host: string, params: Record<string, string | undefined>): string {
  const query = Object.entries(params)
    .filter((entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  return query ? `jotaid://${host}?${query}` : `jotaid://${host}`;
}

/**
 * A clip destined for the Inbox.
 *
 * `mode=silent` is deliberate: the app also accepts `ask`, which opens an editing window
 * and pulls Jotaid to the front. Raycast has already given the user a place to review the
 * text before they hit enter, so a second window would only take the foreground away from
 * whatever they were reading.
 *
 * The app files every clip in the Inbox with a blank title and a `clipping` tag — see
 * `SaveExternalClipUseCase`. The blank title is what lets Jotaid's own AI auto-fill step
 * name the note later, so nothing here should try to supply one.
 */
export function clipNoteURL(params: ClipParams): string {
  return build("clip-note", {
    text: params.text,
    title: params.sourceTitle,
    url: params.sourceURL,
    app: params.sourceApp,
    bundle: params.sourceBundleID,
    mode: "silent",
  });
}

/** Opens one note in Jotaid, bringing the app to the front. */
export function openNoteURL(id: string): string {
  return build("open-note", { id });
}

/**
 * Hands a URL to Jotaid without giving it the foreground.
 *
 * Raycast's own `open()` activates the target app, which defeats the point of saving:
 * you were reading something, and you should still be reading it afterwards. `-g`
 * launches or wakes Jotaid in the background instead — the same thing the PopClip
 * extension does for silent clips.
 *
 * Only saving goes through here. Opening a note from the search results is a request to
 * go and read it, so that one deliberately uses the ordinary foreground `Action.Open`.
 */
export async function openInBackground(url: string): Promise<void> {
  await execFileAsync("/usr/bin/open", ["-g", url]);
}
