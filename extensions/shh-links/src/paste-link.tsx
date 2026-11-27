import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getPreferenceValues,
  Icon,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { discordSelection, pasteInDiscord } from "./discord";
import { cleanUrl, countUrls, formatContent, fromSelection, lengthWarning, siteName } from "./format";

// The clipboard as the URL field starts: one URL alone, or text holding several
function initialUrls(clip: string | undefined): string {
  const single = cleanUrl(clip);
  if (single) return single;
  return clip && countUrls(clip) ? clip.trim() : "";
}

export default function Command() {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string>();
  const [loading, setLoading] = useState(true);

  // Selection first: reading it may go through the clipboard
  useEffect(() => {
    (async () => {
      const selection = fromSelection(await discordSelection());
      const urls = selection.urls || initialUrls(await Clipboard.readText());
      // A single link starts named after its site; clearing the text leaves a bare <url>
      setText((typed) => typed || selection.text || siteName(cleanUrl(urls)));
      setUrl((typed) => typed || urls);
    })().finally(() => setLoading(false));
  }, []);

  const { untrack } = getPreferenceValues<Preferences>();
  const many = countUrls(url) > 1;
  // A list has no text field, so each of its links is named after its site
  const link = formatContent(text, url, { named: many, untrack });
  const tooLong = link && lengthWarning(link);

  async function paste() {
    if (!link) {
      setUrlError("Enter a URL starting with http:// or https://");
      return;
    }
    const result = await pasteInDiscord(link);
    if (result === "closed") {
      await Clipboard.copy(link);
      await showToast({
        style: Toast.Style.Failure,
        title: "Discord is closed",
        message: "The link was copied instead",
      });
    } else if (result === "no focus") {
      await Clipboard.copy(link);
      await showHUD("Discord did not come to the front; the link was copied");
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Paste in Discord" icon={Icon.Clipboard} onSubmit={paste} />
          {link && <Action.CopyToClipboard title="Copy Link" content={link} />}
        </ActionPanel>
      }
    >
      {/* First, so a long list does not push it out of sight below the result */}
      {tooLong && <Form.Description title="⚠️ Too long" text={tooLong} />}
      {/* A text applies to a single link only, so with a list the field is not shown */}
      {many ? (
        <Form.Description text={`${countUrls(url)} links: each one becomes [site](<url>)`} />
      ) : (
        <Form.TextField
          id="text"
          title="Text"
          placeholder="Empty for a bare <url>"
          autoFocus
          value={text}
          onChange={setText}
        />
      )}
      <Form.TextArea
        id="url"
        title="URL"
        placeholder="https://… (one link, or a list)"
        info="Filled in from the clipboard. With several links, each one becomes [site](<url>)"
        value={url}
        error={urlError}
        onChange={(value) => {
          setUrl(value);
          setUrlError(undefined);
        }}
      />
      {/* One row per line: a single description shows a list's line breaks as spaces */}
      {(link ?? "No valid URL yet").split("\n").map((line, i) => (
        <Form.Description key={i} title={i === 0 ? "Result" : undefined} text={line || " "} />
      ))}
    </Form>
  );
}
