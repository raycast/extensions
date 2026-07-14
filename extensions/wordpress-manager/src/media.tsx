import { Action, ActionPanel, Alert, confirmAlert, Grid, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { wp, useMedia, WPMedia, getTitle, formatFileSize, getMediaTypeIcon, getEditMediaUrl } from "./utils";

type MediaType = "all" | "image" | "video" | "audio" | "application";

export default function MediaLibrary() {
  const [searchText, setSearchText] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("all");

  const {
    data: media,
    isLoading,
    revalidate,
  } = useMedia({
    search: searchText || undefined,
    media_type: mediaType === "all" ? undefined : mediaType,
    per_page: 30,
  });

  async function handleDelete(item: WPMedia) {
    const confirmed = await confirmAlert({
      title: "Delete Media Permanently?",
      message: `"${getTitle(item)}" will be permanently deleted. This cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    await showToast({
      style: Toast.Style.Animated,
      title: "Deleting...",
    });

    try {
      await wp.deleteMedia(item.id, true);
      await showToast({
        style: Toast.Style.Success,
        title: "Media deleted",
        message: getTitle(item),
      });
      revalidate();
    } catch (error) {
      // Error handled by API
    }
  }

  function getContentMarkdown(item: WPMedia): string {
    if (item.media_type === "image") {
      return `![${item.alt_text || getTitle(item)}](${item.source_url})`;
    }
    return `[${getTitle(item)}](${item.source_url})`;
  }

  function getContentHtml(item: WPMedia): string {
    if (item.media_type === "image") {
      const alt = item.alt_text || getTitle(item);
      const width = item.media_details.width || "";
      const height = item.media_details.height || "";
      return `<img src="${item.source_url}" alt="${alt}" width="${width}" height="${height}" />`;
    }
    return `<a href="${item.source_url}">${getTitle(item)}</a>`;
  }

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder="Search media..."
      onSearchTextChange={setSearchText}
      throttle
      columns={5}
      fit={Grid.Fit.Fill}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by Type"
          value={mediaType}
          onChange={(value) => setMediaType(value as MediaType)}
        >
          <Grid.Dropdown.Item title="All Media" value="all" />
          <Grid.Dropdown.Item title="Images" value="image" />
          <Grid.Dropdown.Item title="Videos" value="video" />
          <Grid.Dropdown.Item title="Audio" value="audio" />
          <Grid.Dropdown.Item title="Documents" value="application" />
        </Grid.Dropdown>
      }
    >
      <Grid.EmptyView
        icon={Icon.Image}
        title="No media found"
        description={searchText ? "Try a different search term" : "Your media library is empty"}
      />

      {media?.map((item) => {
        // Use thumbnail if available, otherwise fall back to source
        const thumbnail =
          item.media_details.sizes?.thumbnail?.source_url ||
          item.media_details.sizes?.medium?.source_url ||
          item.source_url;

        const subtitle = [
          item.media_details.width && item.media_details.height
            ? `${item.media_details.width}×${item.media_details.height}`
            : "",
          formatFileSize(item.media_details.filesize),
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <Grid.Item
            key={item.id}
            content={{
              source: item.media_type === "image" ? thumbnail : "",
              fallback: getMediaTypeIcon(item.media_type),
            }}
            title={getTitle(item)}
            subtitle={subtitle}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="View Media"
                    url={item.source_url}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.OpenInBrowser
                    title="Edit in Wordpress"
                    url={getEditMediaUrl(item.id)}
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={item.source_url}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Markdown"
                    content={getContentMarkdown(item)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Html"
                    content={getContentHtml(item)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                  />
                  {item.alt_text && <Action.CopyToClipboard title="Copy Alt Text" content={item.alt_text} />}
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    title="Delete Permanently"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(item)}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => revalidate()}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
