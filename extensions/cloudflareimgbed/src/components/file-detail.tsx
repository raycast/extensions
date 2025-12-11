import { ActionPanel, Action, Alert, Color, Detail, Icon, confirmAlert, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import type { ImgBedFileItem } from "../types/files";
import { buildHtmlLink, buildMarkdownLink, formatFileSize, formatTime } from "../utils/format";
import { ImgBedClient } from "../api/client";
import { TagEditor } from "./tag-editor";

type FileDetailProps = {
  file: ImgBedFileItem;
  onDelete?: (file: ImgBedFileItem) => Promise<void>;
  onTagsUpdated?: () => void;
};

export function FileDetail({ file, onDelete, onTagsUpdated }: FileDetailProps) {
  const client = useMemo(() => new ImgBedClient(), []);
  const [tags, setTags] = useState<string[]>(file.metadata.tags ?? []);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const { pop } = useNavigation();

  useEffect(() => {
    let cancelled = false;
    const loadTags = async () => {
      setIsLoadingTags(true);
      try {
        const result = await client.getTags(file.name);
        if (!cancelled) {
          setTags(result);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) {
          setIsLoadingTags(false);
        }
      }
    };
    void loadTags();

    return () => {
      cancelled = true;
    };
  }, [client, file.name]);

  const markdownSections = [
    `![preview](${file.url})`,
    `**Path**: ${file.name}`,
    `**Channel**: ${file.metadata.channel}`,
    `**Size**: ${formatFileSize(file.metadata.size)}`,
    `**Timestamp**: ${formatTime(file.metadata.timestamp)}`,
    `**Tags**: ${tags.length ? tags.map((tag) => `\`${tag}\``).join(", ") : "No tags yet"}`,
  ];

  const handleDelete = async () => {
    if (!onDelete) {
      return;
    }
    const confirmed = await confirmAlert({
      title: "Delete Image",
      message: `Are you sure you want to delete ${file.name}?`,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    await onDelete(file);
    pop();
  };

  const handleTagsSubmit = (nextTags: string[]) => {
    setTags(nextTags);
    onTagsUpdated?.();
  };

  return (
    <Detail
      isLoading={isLoadingTags}
      markdown={markdownSections.join("\n\n")}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={file.url} />
          <Action.CopyToClipboard title="Copy Direct Link" content={file.url} />
          <Action.CopyToClipboard title="Copy Markdown" content={buildMarkdownLink(file.url)} icon={Icon.Paragraph} />
          <Action.CopyToClipboard title="Copy HTML" content={buildHtmlLink(file.url)} icon={Icon.Terminal} />
          <Action.Push
            title="Edit Tags"
            icon={Icon.Tag}
            target={<TagEditor fileId={file.name} initialTags={tags} onSubmitted={handleTagsSubmit} />}
          />
          {onDelete && (
            <Action
              title="Delete Image"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => void handleDelete()}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
