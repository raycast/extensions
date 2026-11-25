import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getComments, getWorkItems } from "../../lib/sprint-api";
import { SprintItem } from "../../lib/sprint-types";
import { htmlToMarkdown, htmlToText } from "../../lib/sprint-utils";

interface Entry {
  key: string;
  title: string;
  subtitle?: string;
  icon: Icon;
  html: string;
}

/** Pick the description, acceptance criteria or any comment of a work item and copy it. */
export function CopyContent({ item: initial }: { item: SprintItem }) {
  // Reload the item like the detail view does, instead of trusting the copy held by the list.
  const { data: fresh, isLoading: loadingItem } = useCachedPromise(
    async (id: number) => (await getWorkItems([id]))[0],
    [initial.id],
  );
  const item = fresh ?? initial;
  const { data: comments, isLoading: loadingComments } = useCachedPromise(getComments, [item.id]);
  const isLoading = loadingItem || loadingComments;

  const entries: Entry[] = [];
  // Always listed, so it is visible even when the item has no description.
  entries.push({ key: "description", title: "Description", icon: Icon.Document, html: item.descriptionHtml ?? "" });
  if (item.acceptanceHtml?.trim())
    entries.push({ key: "acceptance", title: "Acceptance criteria", icon: Icon.CheckList, html: item.acceptanceHtml });
  const list = comments ?? [];
  if (list.length > 1)
    entries.push({
      key: "all-comments",
      title: `All comments (${list.length})`,
      icon: Icon.Bubble,
      html: list.map((c) => `<p><b>${c.author}</b> · ${new Date(c.date).toLocaleString()}</p>${c.html}`).join("<hr>"),
    });
  for (const c of list)
    entries.push({
      key: `comment-${c.id}`,
      title: c.author,
      subtitle: new Date(c.date).toLocaleString(),
      icon: Icon.Bubble,
      html: c.html,
    });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`#${item.id} · Copy content`}
      searchBarPlaceholder="Pick what to copy…"
    >
      {!isLoading && entries.length === 0 ? (
        <List.EmptyView title="No description or comments" icon={Icon.Tray} />
      ) : null}
      {entries.map((e) => (
        <List.Item
          key={e.key}
          title={e.title}
          subtitle={e.subtitle}
          icon={e.icon}
          keywords={[htmlToText(e.html).slice(0, 200)]}
          detail={<List.Item.Detail markdown={htmlToMarkdown(e.html) || "_Nothing to copy: this field is empty._"} />}
          actions={
            e.html.trim() ? (
              <ActionPanel>
                <Action.CopyToClipboard title="Copy as Markdown" content={htmlToMarkdown(e.html)} />
                <Action.CopyToClipboard title="Copy as Plain Text" content={htmlToText(e.html)} />
              </ActionPanel>
            ) : undefined
          }
        />
      ))}
    </List>
  );
}
