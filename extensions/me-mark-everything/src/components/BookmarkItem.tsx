import { getShortcuts } from "../shortcut-settings";
/**
 * Bookmark list row reused from raycast/extensions' extensions/raindrop-io/src/
 * components/BookmarkItem.tsx (MIT, commit 4cd99da7).
 *
 * Wiring changes only:
 * - supported display fields come from ME entities (helpers/me.ts);
 * - Edit opens the reused form inline (configurable shortcut) for bookmarks without conflicts;
 * - conflicted rows use the ME manager, which owns conflict candidates
 *   and page metadata refresh;
 * - List, detail and editor actions move active bookmarks to Trash; recovery remains in the manager.
 */
import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getBookmark, queryAll } from "../helper";
import { toBookmark } from "../helpers/me";
import { tagChoices } from "../helpers/edit";
import { getFavicon } from "@raycast/utils";
import { Bookmark } from "../types";
import { failure, manager } from "../ui";
import { session } from "../session";
import { TrashBookmarkActions } from "./TrashBookmarkActions";

export function details(bookmark: Bookmark) {
  let markdown = `# ${bookmark.title}\n`;
  if (bookmark.life === "trashed") markdown += "\n**In Trash.** Restore this bookmark in the ME manager.\n\n";
  if (bookmark.excerpt) markdown += `> ${bookmark.excerpt}\n\n`;
  if (bookmark.note) markdown += `## Note\n${bookmark.note}\n\n`;
  markdown += `${bookmark.link}\n`;
  return markdown;
}

function typeIcon(type: string) {
  switch (type) {
    case "article":
      return Icon.FountainTip;
    case "image":
      return Icon.Image;
    case "video":
      return Icon.Video;
    case "audio":
      return Icon.Music;
    case "document":
      return Icon.Document;
    default:
      return Icon.Link;
  }
}

type OpenEditor = (id: string, revalidate: () => void | Promise<void>) => void;

export default function BookmarkItem(props: {
  bookmark: Bookmark;
  revalidate: () => void;
  onEdit: OpenEditor;
}) {
  const { bookmark, revalidate, onEdit } = props;
  const hasConflicts = bookmark.conflicts.length > 0 || bookmark.structural > 0;
  const accessories: List.Item.Accessory[] = [
    { text: bookmark.collection.title },
    ...bookmark.tags.slice(0, 2).map((tag) => ({ tag })),
    ...(bookmark.tags.length > 2 ? [{ tag: `+${bookmark.tags.length - 2}` }] : []),
    ...(hasConflicts ? [{ text: "Conflict", icon: Icon.ExclamationMark }] : []),
    { icon: typeIcon(bookmark.type) },
  ];

  const panel = <BookmarkActions bookmark={bookmark} revalidate={revalidate} onEdit={onEdit} />;

  return (
    <List.Item
      id={bookmark._id}
      icon={getFavicon(bookmark.link, { fallback: Icon.Bookmark })}
      title={{ value: bookmark.title, tooltip: bookmark.link }}
      subtitle={bookmark.link}
      accessories={accessories}
      actions={panel}
    />
  );
}

function BookmarkActions({
  bookmark,
  revalidate,
  inDetail = false,
  onEdit,
}: {
  bookmark: Bookmark;
  revalidate: () => void | Promise<void>;
  inDetail?: boolean;
  onEdit: OpenEditor;
}) {
  const hasConflicts = bookmark.conflicts.length > 0 || bookmark.structural > 0;
  const openable = /^https?:\/\//i.test(bookmark.link);
  const openManager = () =>
    void session()
      .then((s) => manager(s, bookmark._id))
      .catch(failure);
  const openConflicts = () =>
    void session()
      .then((s) => manager(s, undefined, true))
      .catch(failure);
  return (
    <ActionPanel>
      {openable && <Action.OpenInBrowser url={bookmark.link} shortcut={getShortcuts().shortcutOpen} />}
      <Action.CopyToClipboard
        title="Copy URL"
        content={bookmark.link}
        shortcut={getShortcuts().shortcutCopy}
      />
      {!inDetail && (
        <Action.Push
          title="Show Details"
          icon={Icon.Sidebar}
          shortcut={getShortcuts().shortcutDetails}
          target={<BookmarkDetail bookmark={bookmark} revalidate={revalidate} onEdit={onEdit} />}
        />
      )}
      {!hasConflicts && bookmark.life === "active" && (
        <Action
          title="Edit in Raycast"
          icon={Icon.Pencil}
          shortcut={getShortcuts().shortcutEdit}
          onAction={() => onEdit(bookmark._id, revalidate)}
        />
      )}
      <TrashBookmarkActions
        id={bookmark._id}
        enabled={!hasConflicts && bookmark.life === "active"}
        revalidate={revalidate}
      />
      <Action
        title={hasConflicts ? "Resolve in ME Manager" : "Open in ME Manager"}
        icon={hasConflicts ? Icon.ExclamationMark : Icon.Globe}
        shortcut={getShortcuts().shortcutManager}
        onAction={openManager}
      />
      {hasConflicts && (
        <Action title="Open Conflict List in ME" icon={Icon.ExclamationMark} onAction={openConflicts} />
      )}
      <Action
        title="Refresh"
        shortcut={getShortcuts().shortcutRefresh}
        icon={Icon.ArrowClockwise}
        onAction={() => Promise.resolve(revalidate()).catch(failure)}
      />
    </ActionPanel>
  );
}

function BookmarkDetail(props: {
  bookmark: Bookmark;
  revalidate: () => void | Promise<void>;
  onEdit: OpenEditor;
}) {
  const [bookmark, setBookmark] = useState(props.bookmark);
  const [error, setError] = useState<Error>();
  const load = useCallback(async () => {
    try {
      const active = await session();
      const [entity, tags, collections] = await Promise.all([
        getBookmark(active, props.bookmark._id),
        queryAll(active, { kind: "tag" }),
        queryAll(active, { kind: "collection" }),
      ]);
      const members = Object.keys(entity.values)
        .filter((k) => k.startsWith("tag:") && entity.values[k] === true)
        .map((k) => k.slice(4));
      let names: string[] = [];
      try {
        const choices = tagChoices(tags.items, members);
        names = choices.items.filter((t) => choices.selected.includes(t._id)).map((t) => t.name);
      } catch {
        names = members;
      }
      setBookmark(
        toBookmark(
          { ...entity, tags: names, candidateMatch: false },
          new Map(collections.items.map((c) => [c.id, String(c.values.name ?? c.id)])),
        ),
      );
      setError(undefined);
      await props.revalidate();
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
      throw cause;
    }
  }, [props.bookmark._id, props.revalidate]);
  useEffect(() => {
    void load().catch(failure);
  }, [load]);
  return (
    <Detail
      markdown={error ? `# Refresh failed\n\n${error.message}` : details(bookmark)}
      navigationTitle="Bookmark Details"
      actions={<BookmarkActions bookmark={bookmark} revalidate={load} onEdit={props.onEdit} inDetail />}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="URL" target={bookmark.link} text={bookmark.link} />
          <Detail.Metadata.Label title="Collection" text={bookmark.collection.title} />
          {bookmark.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {bookmark.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {bookmark.important && <Detail.Metadata.Label title="Favorite" text="Yes" />}
          {(bookmark.conflicts.length > 0 || bookmark.structural > 0) && (
            <Detail.Metadata.Label title="Needs review" text="Open the ME manager" />
          )}
        </Detail.Metadata>
      }
    />
  );
}
