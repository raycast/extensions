import {
  Action,
  ActionPanel,
  confirmAlert,
  Detail,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  deletePage,
  getPage,
  getRelatedPages,
  handleApiError,
  reindexPage,
  updatePage,
} from "../api/client";
import { formatDate, getItemTypeIcon, getPageFavicon } from "../helpers/utils";
import type { PageDetailResponse } from "../types";
import AddHighlightForm from "./AddHighlightForm";
import AddNoteForm from "./AddNoteForm";
import EditTagsForm from "./EditTagsForm";
import PageListItem from "./PageListItem";
import UpdateTitleForm from "./UpdateTitleForm";

const CONTENT_TRUNCATE_LENGTH = 10_000;

function buildDetailMarkdown(page: PageDetailResponse): string {
  const parts: string[] = [];

  if (page.meta_og_image) {
    parts.push(`![](${page.meta_og_image}?raycast-width=300)\n`);
  }

  if (page.summary_what) {
    parts.push(`## What\n${page.summary_what}`);
  }
  if (page.summary_why) {
    parts.push(`## Why It Matters\n${page.summary_why}`);
  }
  if (page.summary_how) {
    parts.push(`## Key Details\n${page.summary_how}`);
  }

  if (
    parts.length === 0 ||
    (!page.summary_what && !page.summary_why && !page.summary_how)
  ) {
    if (page.meta_og_image) {
      return parts[0] ?? `*Page is ${page.status}. Summary not yet available.*`;
    }
    return `*Page is ${page.status}. Summary not yet available.*`;
  }

  return parts.join("\n\n");
}

function buildUserTags(page: PageDetailResponse): string[] {
  if (!page.user_tags) return [];
  return page.user_tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function buildAllTags(page: PageDetailResponse): string[] {
  const tags: string[] = [];
  if (page.primary_tag) tags.push(page.primary_tag);
  if (page.secondary_tag) tags.push(page.secondary_tag);
  tags.push(...buildUserTags(page));
  return tags;
}

export default function PageDetail({
  pageId,
  url,
}: {
  pageId: string;
  url: string;
}) {
  const { pop } = useNavigation();

  const {
    data: page,
    isLoading,
    mutate,
    revalidate,
  } = useCachedPromise(async (id: string) => getPage(id), [pageId], {
    onError: async (error) => {
      const handled = await handleApiError(error);
      if (!handled) {
        await showFailureToast("Failed to load page details");
      }
    },
  });

  const markdown = page ? buildDetailMarkdown(page) : "Loading...";
  const tags = page ? buildAllTags(page) : [];

  // ── Action handlers ───────────────────────────────────────────

  async function handleToggleFavorite() {
    if (!page) return;
    const newValue: 0 | 1 = page.is_favorite ? 0 : 1;
    await mutate(updatePage(pageId, { is_favorite: newValue }), {
      optimisticUpdate: (current) =>
        current ? { ...current, is_favorite: newValue } : current,
    });
  }

  async function handleTogglePin() {
    if (!page) return;
    const newValue: 0 | 1 = page.is_pinned ? 0 : 1;
    await mutate(updatePage(pageId, { is_pinned: newValue }), {
      optimisticUpdate: (current) =>
        current ? { ...current, is_pinned: newValue } : current,
    });
  }

  async function handleReindex() {
    try {
      await reindexPage(pageId);
      await showToast({
        style: Toast.Style.Success,
        title: "Reindexing Started",
      });
      revalidate();
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to reindex",
        });
      }
    }
  }

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "Delete Page",
      message: `Delete "${page?.title || url}"? This cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Action.Style.Destructive as never,
      },
    });
    if (!confirmed) return;

    try {
      await deletePage(pageId);
      await showToast({ style: Toast.Style.Success, title: "Page Deleted" });
      pop();
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete page",
        });
      }
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        page ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Domain"
              text={page.domain}
              icon={getPageFavicon(page.url)}
            />
            <Detail.Metadata.Label
              title="Type"
              text={page.item_type ?? "webpage"}
              icon={getItemTypeIcon(page.item_type)}
            />
            <Detail.Metadata.Label title="Status" text={page.status} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Saved"
              text={formatDate(page.saved_at)}
            />
            {page.indexed_at && (
              <Detail.Metadata.Label
                title="Indexed"
                text={formatDate(page.indexed_at)}
              />
            )}
            <Detail.Metadata.Separator />
            {page.is_favorite ? (
              <Detail.Metadata.Label
                title="Favorite"
                icon={Icon.Star}
                text="Yes"
              />
            ) : null}
            {page.is_pinned ? (
              <Detail.Metadata.Label
                title="Pinned"
                icon={Icon.Pin}
                text="Yes"
              />
            ) : null}
            {tags.length > 0 && (
              <Detail.Metadata.TagList title="Tags">
                {tags.map((tag) => (
                  <Detail.Metadata.TagList.Item key={tag} text={tag} />
                ))}
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="URL"
              target={page.url}
              text={page.domain}
            />
            {page.webapp_url && (
              <Detail.Metadata.Link
                title="WebStash"
                target={page.webapp_url}
                text="Open in WebStash"
              />
            )}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          {/* ── Open ─────────────────────────────────── */}
          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser url={url} />
            {page?.markdown && (
              <Action.Push
                title="View Full Content"
                icon={Icon.Document}
                target={
                  <ContentView markdown={page.markdown} title={page.title} />
                }
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            )}
            <Action.Push
              title="Related Pages"
              icon={Icon.Link}
              target={
                <RelatedPagesList
                  pageId={pageId}
                  title={page?.title ?? "Page"}
                />
              }
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>

          {/* ── Annotate ─────────────────────────────── */}
          <ActionPanel.Section title="Annotate">
            <Action.Push
              title="Add Highlight"
              icon={Icon.Highlight}
              target={
                <AddHighlightForm
                  pageId={pageId}
                  sourceUrl={url}
                  onAdded={revalidate}
                />
              }
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
            <Action.Push
              title="Add Note"
              icon={Icon.Pencil}
              target={<AddNoteForm pageId={pageId} onAdded={revalidate} />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel.Section>

          {/* ── Organize ─────────────────────────────── */}
          <ActionPanel.Section title="Organize">
            <Action
              title={
                page?.is_favorite ? "Remove from Favorites" : "Add to Favorites"
              }
              icon={page?.is_favorite ? Icon.StarDisabled : Icon.Star}
              onAction={handleToggleFavorite}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            <Action
              title={page?.is_pinned ? "Unpin" : "Pin"}
              icon={Icon.Pin}
              onAction={handleTogglePin}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
            />
          </ActionPanel.Section>

          {/* ── Advanced ─────────────────────────────── */}
          <ActionPanel.Section title="Advanced">
            {page && (
              <Action.Push
                title="Edit Tags"
                icon={Icon.Tag}
                target={
                  <EditTagsForm
                    pageId={pageId}
                    currentTags={buildUserTags(page)}
                    onUpdated={revalidate}
                  />
                }
              />
            )}
            {page && (
              <Action.Push
                title="Update Title"
                icon={Icon.Text}
                target={
                  <UpdateTitleForm
                    pageId={pageId}
                    currentTitle={page.title}
                    onUpdated={revalidate}
                  />
                }
              />
            )}
            <Action
              title="Reindex Page"
              icon={Icon.ArrowClockwise}
              onAction={handleReindex}
            />
            <Action.CopyToClipboard
              title="Copy URL"
              content={url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action
              title="Delete Page"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleDelete}
              shortcut={Keyboard.Shortcut.Common.Remove}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/** Full markdown content viewer — truncated at 10k chars. */
function ContentView({ markdown, title }: { markdown: string; title: string }) {
  const truncated = markdown.length > CONTENT_TRUNCATE_LENGTH;
  const content = truncated
    ? markdown.slice(0, CONTENT_TRUNCATE_LENGTH) +
      "\n\n---\n*Content truncated. View full content in WebStash.*"
    : markdown;

  return (
    <Detail
      navigationTitle={title}
      markdown={content}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Content" content={markdown} />
        </ActionPanel>
      }
    />
  );
}

/** Related pages list — pushes from the detail view. */
function RelatedPagesList({
  pageId,
  title,
}: {
  pageId: string;
  title: string;
}) {
  const { data, isLoading } = useCachedPromise(
    async (id: string) => {
      const response = await getRelatedPages(id);
      return response.results;
    },
    [pageId],
    {
      onError: async (error) => {
        const handled = await handleApiError(error);
        if (!handled) {
          await showFailureToast("Failed to load related pages");
        }
      },
    },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`Related to: ${title}`}>
      <List.EmptyView
        title="No Related Pages"
        description="No pages related to this one were found"
        icon={Icon.Link}
      />
      {data?.map((result) => (
        <PageListItem key={result.id} page={result} />
      ))}
    </List>
  );
}
