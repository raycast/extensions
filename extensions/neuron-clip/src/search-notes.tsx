import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import React, { useState, useMemo } from "react";
import {
  API_URL,
  searchContent,
  ContentSearchNote,
  ContentSearchFolder,
  ContentSearchTag,
} from "./utils/api";

const TYPE_LABELS: Record<string, string> = {
  NOTE: "Note",
  CLIP: "Browser",
  IDEA: "Idea",
  ARTWORK: "Artwork",
};

function getTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

function formatUpdated(updatedAt: string): string {
  try {
    const d = new Date(updatedAt);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year:
        d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const query = useMemo(() => (searchText || "").trim(), [searchText]);

  const { isLoading, data } = usePromise(
    async (q: string) => searchContent(q || undefined),
    [query],
    {
      execute: true,
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: error instanceof Error ? error.message : "Try again later.",
        });
      },
    },
  );

  const notes = data?.notes ?? [];
  const folders = data?.folders ?? [];
  const tags = data?.tags ?? [];
  const hasResults = notes.length > 0 || folders.length > 0 || tags.length > 0;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search notes, folders, tags..."
      throttle
      isShowingDetail
    >
      {!hasResults && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No content found"
          description={
            query
              ? "Try a different search term."
              : "Content appears here as you add notes, folders, and tags."
          }
        />
      ) : (
        <>
          {notes.length > 0 && (
            <List.Section
              title="Notes"
              subtitle={`${notes.length} recently updated`}
            >
              {notes.map((item: ContentSearchNote) => (
                <List.Item
                  key={`note-${item.id}`}
                  title={item.title}
                  subtitle={item.description}
                  icon={
                    item.favicon
                      ? { source: item.favicon, fallback: Icon.Document }
                      : item.type === "CLIP"
                        ? Icon.Globe
                        : Icon.Document
                  }
                  detail={
                    <List.Item.Detail
                      markdown={
                        [
                          `# ${item.title}`,
                          item.description ? `\n${item.description}` : "",
                          item.contentPreview
                            ? `\n\n---\n\n**Content**\n\n${item.contentPreview}`
                            : "",
                        ].join("") || "# No content"
                      }
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Type"
                            text={getTypeLabel(item.type)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Tags"
                            text={
                              item.tags?.length ? item.tags.join(", ") : "—"
                            }
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Updated"
                            text={formatUpdated(item.updatedAt)}
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        url={`${API_URL}/organizations/${item.organizationSlug}${item.type === "RAYCAST" ? "/raycast" : "/notes"}/${item.id}?recall=1`}
                        title="Start Recall"
                        icon={Icon.Book}
                      />
                      <Action.OpenInBrowser
                        url={`${API_URL}/organizations/${item.organizationSlug}${item.type === "RAYCAST" ? "/raycast" : "/notes"}/${item.id}`}
                        title="Open in Browser"
                      />
                      <Action.CopyToClipboard
                        content={`${API_URL}/organizations/${item.organizationSlug}${item.type === "RAYCAST" ? "/raycast" : "/notes"}/${item.id}`}
                        title="Copy Link"
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          {folders.length > 0 && (
            <List.Section
              title="Folders"
              subtitle={`${folders.length} recently updated`}
            >
              {folders.map((folder: ContentSearchFolder) => {
                const url = `${API_URL}/organizations/${folder.organizationSlug}/folder/${folder.id}`;
                const subtitle =
                  [
                    folder.noteCount > 0
                      ? `${folder.noteCount} note${folder.noteCount !== 1 ? "s" : ""}`
                      : null,
                    folder.subfolderCount > 0
                      ? `${folder.subfolderCount} folder${folder.subfolderCount !== 1 ? "s" : ""}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Empty";
                return (
                  <List.Item
                    key={`folder-${folder.id}`}
                    title={folder.name}
                    subtitle={subtitle}
                    icon={Icon.Folder}
                    detail={
                      <List.Item.Detail
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label
                              title="Notes"
                              text={String(folder.noteCount)}
                            />
                            <List.Item.Detail.Metadata.Label
                              title="Subfolders"
                              text={String(folder.subfolderCount)}
                            />
                            <List.Item.Detail.Metadata.Label
                              title="Updated"
                              text={formatUpdated(folder.updatedAt)}
                            />
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionPanel>
                        <Action.OpenInBrowser
                          url={url}
                          title="Open in Browser"
                        />
                        <Action.CopyToClipboard
                          content={url}
                          title="Copy Folder Link"
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
          {tags.length > 0 && (
            <List.Section
              title="Tags"
              subtitle={`${tags.length} recently updated`}
            >
              {tags.map((tag: ContentSearchTag) => (
                <List.Item
                  key={`tag-${tag.id}`}
                  title={tag.name}
                  subtitle={`${tag.noteCount} note${tag.noteCount !== 1 ? "s" : ""}`}
                  icon={Icon.Tag}
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Notes"
                            text={String(tag.noteCount)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Updated"
                            text={formatUpdated(tag.updatedAt)}
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        url={`${API_URL}/organizations/${tag.organizationSlug}?tag=${encodeURIComponent(tag.name)}`}
                        title="Open in Browser"
                      />
                      <Action.CopyToClipboard
                        content={`${API_URL}/organizations/${tag.organizationSlug}?tag=${encodeURIComponent(tag.name)}`}
                        title="Copy Tag Link"
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
