import { Action, ActionPanel, Alert, Color, Grid, Icon, confirmAlert } from "@raycast/api";
import { useMemo, useState } from "react";
import { useImgBedList } from "../hooks/use-imgbed-list";
import { FilterForm } from "../components/filter-form";
import { FileDetail } from "../components/file-detail";
import type { ImgBedFileItem } from "../types/files";
import { buildHtmlLink, buildMarkdownLink, formatFileSize } from "../utils/format";
import { parseSearchInput } from "../utils/tags";

export default function GalleryCommand() {
  const { files, isLoading, filters, setFilters, deleteFile, reload } = useImgBedList();
  const [searchText, setSearchText] = useState(filters.search ?? "");
  const availableTags = useMemo(() => buildAvailableTags(files), [files]);

  const handleDelete = async (file: ImgBedFileItem) => {
    const confirmed = await confirmAlert({
      title: "Delete Image",
      message: `Are you sure you want to delete ${file.name}?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
      icon: { source: Icon.Trash, tintColor: Color.Red },
    });
    if (confirmed) {
      await deleteFile(file.name);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    const { keywords, tags } = parseSearchInput(text);
    const matchedTags = matchTags(tags, availableTags);
    setFilters((prev) => ({
      ...prev,
      search: keywords || undefined,
      includeTags: matchedTags.length ? matchedTags.join(",") : undefined,
    }));
  };

  return (
    <Grid
      isLoading={isLoading}
      columns={4}
      inset={Grid.Inset.Medium}
      searchBarPlaceholder="Search by name or type #tag"
      searchText={searchText}
      onSearchTextChange={handleSearchChange}
      throttle
    >
      {files.map((file) => (
        <Grid.Item
          key={file.name}
          title={file.name.split("/").pop() ?? file.name}
          subtitle={buildSubtitle(file)}
          content={{ source: file.url }}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={
                    <FileDetail
                      file={file}
                      onDelete={async () => deleteFile(file.name)}
                      onTagsUpdated={() => void reload()}
                    />
                  }
                />
                <Action.OpenInBrowser title="Open in Browser" url={file.url} />
                <Action.CopyToClipboard title="Copy Direct Link" content={file.url} />
                <Action.CopyToClipboard title="Copy Markdown" content={buildMarkdownLink(file.url)} />
                <Action.CopyToClipboard title="Copy HTML" content={buildHtmlLink(file.url)} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => void reload()}
                />
                <Action.Push
                  title="Adjust Filters"
                  icon={Icon.Filter}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                  target={
                    <FilterForm
                      initialValues={filters}
                      onSubmit={(values) => setFilters((prev) => ({ ...prev, ...values }))}
                    />
                  }
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => void handleDelete(file)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      <Grid.EmptyView title="No images yet" description="Try uploading an image, then refresh the list." />
    </Grid>
  );
}

function buildSubtitle(file: ImgBedFileItem) {
  const parts = [
    file.metadata.channel,
    formatFileSize(file.metadata.size),
    file.metadata.tags
      ?.slice(0, 3)
      .map((tag) => `#${tag}`)
      .join(" "),
  ].filter(Boolean);
  return parts.join(" · ");
}

type AvailableTag = {
  value: string;
  normalized: string;
};

function buildAvailableTags(files: ImgBedFileItem[]): AvailableTag[] {
  const map = new Map<string, string>();
  files.forEach((file) => {
    file.metadata.tags?.forEach((tag) => {
      const normalized = tag.toLowerCase();
      if (!map.has(normalized)) {
        map.set(normalized, tag);
      }
    });
  });
  return Array.from(map.entries()).map(([normalized, value]) => ({ normalized, value }));
}

function matchTags(queries: string[], availableTags: AvailableTag[]) {
  if (!queries.length) {
    return [];
  }
  const result = new Set<string>();
  queries.forEach((query) => {
    const normalizedQuery = query.toLowerCase();
    availableTags.forEach((tag) => {
      if (tag.normalized.includes(normalizedQuery)) {
        result.add(tag.value);
      }
    });
  });
  return Array.from(result);
}
