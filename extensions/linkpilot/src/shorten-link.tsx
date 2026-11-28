import { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Clipboard, Form, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { client, describe } from "./linkpilot";

/**
 * WHY THIS COMMAND NEVER ASKS FOR THE SELECTED TEXT
 *
 * `getSelectedText()` is not imported here on purpose. Do not add it back.
 *
 * On Windows there is no selection API. Raycast emulates one by
 * force-activating whatever window was focused before and synthesising a
 * copy, then waiting for the clipboard to change. From its own log:
 *
 *   UiaSelectedText: null - non-Chromium window in the background
 *   copy_text: target=0x20FB2 ('Windows PowerShell', process='WindowsTerminal.exe')
 *   [ui-access] force_activate_window: activated via SetForegroundWindow
 *   WRN copy_text: timeout waiting for clipboard change from target
 *
 * It hijacks the foreground window. Raycast hides itself when it loses
 * focus, so this form was being dismissed before it could be seen, and the
 * clipboard value looked like the only thing the command ever used.
 *
 * A previous attempt guarded the call behind `process.platform === "win32"`.
 * THAT DID NOT WORK: the guard never fired, and the log showed the copy
 * machinery running anyway. `process.platform` is not dependable inside
 * Raycast's extension worker, so no platform check is trustworthy here.
 * The only reliable fix is not to have the call at all.
 *
 * The cost is small. On macOS a selected URL is usually on the clipboard
 * anyway, and the field is editable, so nothing is unreachable.
 */

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Never let a host call hang the command. */
async function within<T>(ms: number, work: Promise<T>): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), ms);
      }),
    ]);
  } catch {
    return undefined;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * The clipboard, but only when it already holds a URL.
 *
 * Offering whatever the clipboard happened to contain is what made the
 * original failure so confusing: it raised an error about text nobody had
 * chosen to give it.
 */
async function fromClipboard(): Promise<string | undefined> {
  // Generous: this is a round trip to the host, and the form is already on
  // screen saying "Checking your clipboard..." while it waits.
  const text = (await within(4000, Clipboard.readText()))?.trim();
  return text && isHttpUrl(text) ? text : undefined;
}

export default function ShortenUrl() {
  const [url, setUrl] = useState("");
  const [fromClip, setFromClip] = useState(false);
  const [urlError, setUrlError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  // Set the moment the person types; a clipboard read that finishes later
  // must not overwrite what they wrote.
  const touched = useRef(false);

  useEffect(() => {
    let live = true;
    (async () => {
      let clipboard: string | undefined;
      try {
        clipboard = await fromClipboard();
      } catch {
        // The form still has to open, so swallow and fall through.
      }
      if (!live) return;
      if (clipboard && !touched.current) {
        setUrl(clipboard);
        setFromClip(true);
      }
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, []);

  async function submit(values: { url: string }) {
    const candidate = (values.url ?? "").trim();
    if (!candidate) {
      setUrlError("Required");
      return;
    }
    if (!isHttpUrl(candidate)) {
      setUrlError("Must be a full http:// or https:// URL");
      return;
    }

    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Shortening" });
    try {
      const link = await client().links.create({ url: candidate });
      await Clipboard.copy(link.short_url);
      await toast.hide();
      await showHUD(`Copied ${link.short_url}`);
      await popToRoot();
    } catch (error) {
      const { title, message } = describe(error);
      toast.style = Toast.Style.Failure;
      toast.title = title;
      toast.message = message;
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Link} title="Shorten Link" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com/a/very/long/link"
        value={url}
        error={urlError}
        onChange={(next) => {
          touched.current = true;
          setUrl(next);
          setUrlError(undefined);
        }}
      />
      <Form.Description
        title="Source"
        text={
          loading
            ? "Checking your clipboard..."
            : fromClip
              ? "Filled in from your clipboard. Edit it or type over it."
              : "Your clipboard does not hold a URL, so nothing was filled in. Type or paste one above."
        }
      />
    </Form>
  );
}
