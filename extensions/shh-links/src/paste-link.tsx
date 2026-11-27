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
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { copyInstead, discordSelection, pasteInDiscord } from "./discord";
import { cleanUrl, countUrls, formatContent, fromSelection, lengthWarning, maskedText, siteName } from "./format";

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

  // Selection first: reading it may go through the clipboard
  const { isLoading } = usePromise(
    async () => {
      const selection = fromSelection(await discordSelection());
      const content = selection.urls || (await Clipboard.readText()) || "";
      return { selection, content };
    },
    [],
    {
      onData: ({ selection, content }) => {
        const urls = initialUrls(content);
        // A single link starts with its masked text or its site's name; clearing the text
        // leaves a bare <url>. Whatever was typed while loading is kept.
        setText((typed) => typed || selection.text || maskedText(content) || siteName(cleanUrl(urls)));
        setUrl((typed) => typed || urls);
      },
    },
  );

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
    let result;
    try {
      result = await pasteInDiscord(link);
    } catch (error) {
      // The window may be closed by now, so a HUD, which shows either way
      const reason = error instanceof Error ? error.message : String(error);
      await showHUD(
        (await copyInstead(link))
          ? `Could not paste into Discord (${reason}); the link was copied`
          : `Could not paste into Discord (${reason}) or copy the link`,
      );
      return;
    }
    if (result === "closed") {
      const copied = await copyInstead(link);
      await showToast({
        style: Toast.Style.Failure,
        title: "Discord is closed",
        message: copied ? "The link was copied instead" : "The link could not be copied either",
      });
    } else if (result === "no focus") {
      await showHUD(
        (await copyInstead(link))
          ? "Discord was not in front; the link was copied"
          : "Discord was not in front, and the link could not be copied",
      );
    }
  }

  return (
    <Form
      isLoading={isLoading}
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
        // The link can come from either field, so the error goes once there is one
        error={link ? undefined : urlError}
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
