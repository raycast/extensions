import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { nyxe } from "../lib/raycast";
import { displayAddress, plainTextToMarkdown } from "../lib/text";

/**
 * The thread as plain text in the list's detail pane — never HTML. Fetches
 * only while its row is selected, so scrolling a list doesn't fetch every
 * thread in it.
 */
export function ThreadPreview({
  threadId,
  selected,
  fallback,
}: {
  threadId: string;
  selected: boolean;
  /** Shown until the thread loads (the row's preview line). */
  fallback: string | null;
}) {
  const { data, isLoading } = useCachedPromise((id: string) => nyxe().thread(id), [threadId], {
    execute: selected,
    keepPreviousData: false,
    // The list shows the failure toast once; a detail pane per row would stack them.
    onError: () => undefined,
  });

  const markdown = data
    ? data.messages
        .slice()
        .reverse()
        .map((m) => {
          const from = m.from.map(displayAddress).join(", ") || "Unknown sender";
          const when = new Date(m.receivedAt).toLocaleString();
          const body = plainTextToMarkdown(m.text.trim() || "(no text)");
          const truncated = m.textTruncated ? "\n\n_Message truncated. Open it in Nyxe to read the rest._" : "";
          const files = m.attachments.length
            ? `\n\n📎 ${m.attachments.map((a) => plainTextToMarkdown(a.name ?? "attachment")).join(", ")}`
            : "";
          return `**${plainTextToMarkdown(from)}** · ${when}\n\n${body}${truncated}${files}`;
        })
        .join("\n\n---\n\n")
    : plainTextToMarkdown(fallback ?? "");

  return <List.Item.Detail isLoading={selected && isLoading} markdown={markdown} />;
}
