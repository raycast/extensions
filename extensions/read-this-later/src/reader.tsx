import { Detail, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import TurndownService from "turndown";
import { tables } from "turndown-plugin-gfm";
import { fetchArticle, OfflineArticle } from "./offline";
import { stripBoilerplateMarkdown } from "./boilerplate";
import { ReadLaterItem, hostname, relativeDate } from "./api";

// Raycast renders Markdown, not HTML, so the envelope's sanitized HTML has to
// be converted. The body was captured from a live logged-in page, so this is
// the full text — including past a paywall the URL itself would now show.
const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

// Without this, turndown flattens every cell into its own paragraph and a data
// table reads as a meaningless run of values. GFM pipes survive either way,
// whether or not Raycast's renderer draws them as a real table.
turndown.use(tables);

// Non-content elements Readability didn't strip. Turndown would otherwise emit
// their text (or leave markup) inline in the article.
turndown.remove(["script", "style", "noscript", "iframe", "form", "button"]);

function articleMarkdown(article: OfflineArticle): string {
  // Strip at read time, not just at capture: bodies captured by the browser
  // extension or iOS already contain the ad text and can't be re-captured here.
  const body = stripBoilerplateMarkdown(turndown.turndown(article.html || ""));
  const heading = article.title ? `# ${article.title}\n\n` : "";
  return heading + body;
}

// Shown when there's no captured body to read. The note is the point here —
// it's otherwise only reachable as a hover tooltip in the list.
function detailsMarkdown(item: ReadLaterItem): string {
  const parts = [`# ${item.title}`, ""];

  if (item.notes) {
    parts.push("## Note", "", item.notes, "");
  }

  parts.push(
    item.offline === "unavailable"
      ? "_No article text was captured for this link — the page was paywalled or unreadable when it was saved._"
      : "_No article text was captured for this link. Save it from the browser extension or your iPhone to read it here._",
  );

  return parts.join("\n");
}

export function Reader({ item }: { item: ReadLaterItem }) {
  const [article, setArticle] = useState<OfflineArticle | null>(null);
  // Only items with a captured body are worth a network round-trip; for the
  // rest we already hold everything we can show.
  const hasBody = item.offline === "saved";
  const [isLoading, setIsLoading] = useState(hasBody);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasBody) return;
    (async () => {
      try {
        setArticle(await fetchArticle(item.url));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [item.url, hasBody]);

  const actions = (
    <ActionPanel>
      <Action.OpenInBrowser url={item.url} />
      <Action.CopyToClipboard
        title="Copy URL"
        content={item.url}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      {item.notes ? (
        <Action.CopyToClipboard
          title="Copy Note"
          content={item.notes}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      ) : null}
    </ActionPanel>
  );

  // A body was advertised but wouldn't load — say so rather than silently
  // falling back to the "nothing captured" copy, which would be a lie.
  const markdown = error
    ? `# Couldn't load the article\n\n${error}`
    : article
      ? articleMarkdown(article)
      : hasBody
        ? ""
        : detailsMarkdown(item);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={item.title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Site"
            text={article?.siteName || hostname(item.url)}
          />
          <Detail.Metadata.Label
            title="Saved"
            text={relativeDate(item.savedAt)}
          />
          {article?.length ? (
            <Detail.Metadata.Label
              title="Length"
              text={`${Math.max(1, Math.round(article.length / 1000))}k characters`}
            />
          ) : null}
          {article?.capturedAt ? (
            <Detail.Metadata.Label
              title="Captured"
              text={new Date(article.capturedAt).toLocaleDateString()}
            />
          ) : null}
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={item.read ? "Read" : "Unread"}
              color={item.read ? Color.SecondaryText : Color.Blue}
            />
            {item.folder ? (
              <Detail.Metadata.TagList.Item
                text={item.folder}
                color={Color.Green}
              />
            ) : null}
          </Detail.Metadata.TagList>
          {item.notes ? (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Note"
                icon={Icon.Pencil}
                text={item.notes}
              />
            </>
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Original"
            target={item.url}
            text={hostname(item.url)}
          />
        </Detail.Metadata>
      }
      actions={actions}
    />
  );
}
