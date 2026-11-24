/**
 * "Shorten Clipboard URL": read the clipboard, send it to the Linkonda API only if it is one plain http(s) URL, copy
 * the short link and show its QR code. A thin shell: the rules are in `lib/` and are tested there (spec 0143).
 *
 * Stores nothing: no local storage, cache or file. The only thing put on the clipboard is the short link, and only
 * after a 201. Every step ends in a view; nothing is thrown or logged.
 */
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getPreferenceValues,
  Keyboard,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { createShortLink, type ShortLink, type ShortenResult } from "./lib/api";
import { clipboardUrl } from "./lib/clipboard";
import {
  ACCOUNT_NOT_SAVED,
  ACCOUNT_SAVED,
  ACTION_COPY,
  ACTION_OPEN,
  ACTION_PREFERENCES,
  ACTION_RETRY,
  COPIED_TOAST,
  failureMarkdown,
  formatExpiry,
  LABEL_ACCOUNT,
  LABEL_DESTINATION,
  LABEL_EXPIRY,
  LABEL_SHORT_LINK,
  LOADING,
  noUrlMarkdown,
  renderQrDataUrl,
  successMarkdown,
  TITLES,
} from "./lib/view";

type Failure = Extract<ShortenResult, { ok: false }>;

type State =
  | { view: "loading" }
  | { view: "no-url"; reason: "none" | "credentials" }
  | { view: "failed"; failure: Failure }
  | { view: "done"; link: ShortLink; destination: string; qr: string | null; copied: boolean };

export async function run(): Promise<State> {
  let text: string | undefined;
  try {
    text = await Clipboard.readText();
  } catch {
    text = undefined;
  }
  const found = clipboardUrl(text);
  if ("refused" in found) return { view: "no-url", reason: found.refused };

  let apiKey: string | undefined;
  try {
    apiKey = getPreferenceValues<{ apiKey?: string }>().apiKey;
  } catch {
    apiKey = undefined;
  }

  const result = await createShortLink(found.url, apiKey);
  if (!result.ok) {
    await showToast({ style: Toast.Style.Failure, title: result.title }).catch(() => undefined);
    return { view: "failed", failure: result };
  }

  const { shortUrl } = result.link;
  const copied = await Clipboard.copy(shortUrl).then(
    () => true,
    () => false,
  );
  if (copied) {
    await showToast({ style: Toast.Style.Success, title: COPIED_TOAST, message: shortUrl }).catch(() => undefined);
  }
  return { view: "done", link: result.link, destination: found.url, qr: await renderQrDataUrl(shortUrl), copied };
}

export default function Command() {
  const [state, setState] = useState<State>({ view: "loading" });

  const start = useCallback(() => {
    setState({ view: "loading" });
    run().then(setState, () =>
      setState({ view: "failed", failure: { ok: false, kind: "unexpected", title: TITLES.unexpected } }),
    );
  }, []);
  useEffect(start, [start]);

  const retry = <Action title={ACTION_RETRY} onAction={start} />;
  const preferences = <Action title={ACTION_PREFERENCES} onAction={openExtensionPreferences} />;

  if (state.view === "loading") return <Detail isLoading markdown={LOADING} />;

  if (state.view === "no-url") {
    return (
      <Detail
        markdown={noUrlMarkdown(state.reason)}
        actions={
          <ActionPanel>
            {retry}
            {preferences}
          </ActionPanel>
        }
      />
    );
  }

  if (state.view === "failed") {
    const keyProblem = state.failure.kind === "key";
    return (
      <Detail
        markdown={failureMarkdown(state.failure)}
        actions={
          <ActionPanel>
            {keyProblem ? preferences : retry}
            {keyProblem ? retry : preferences}
          </ActionPanel>
        }
      />
    );
  }

  const { link, destination, qr, copied } = state;
  return (
    <Detail
      markdown={successMarkdown(qr, copied)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title={LABEL_SHORT_LINK} target={link.shortUrl} text={link.shortUrl} />
          <Detail.Metadata.Label title={LABEL_DESTINATION} text={destination} />
          <Detail.Metadata.Label title={LABEL_EXPIRY} text={formatExpiry(link.expiresAt)} />
          <Detail.Metadata.Label title={LABEL_ACCOUNT} text={link.savedToAccount ? ACCOUNT_SAVED : ACCOUNT_NOT_SAVED} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={ACTION_COPY} content={link.shortUrl} />
          <Action.OpenInBrowser title={ACTION_OPEN} url={link.shortUrl} shortcut={Keyboard.Shortcut.Common.Open} />
        </ActionPanel>
      }
    />
  );
}
