import { Action, ActionPanel, Detail, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDeleteBookmark, fetchGetSingleBookmark, fetchSummarizeBookmark, fetchUpdateBookmark } from "../apis";
import {
  ARCHIVED_COLOR,
  DEFAULT_COLOR,
  DEFAULT_SCREENSHOT_FILENAME,
  FAVOURED_COLOR,
  TAG_AI_COLOR,
  TAG_HUMAN_COLOR,
} from "../constants";
import { useConfig } from "../hooks/useConfig";
import { useTranslation } from "../hooks/useTranslation";
import { Bookmark } from "../types";
import { getScreenshot } from "../utils/screenshot";
import { BookmarkEdit } from "./BookmarkEdit";

interface BookmarkDetailProps {
  bookmark: Bookmark;
  onRefresh?: () => void;
}

function useBookmarkImages(bookmark: Bookmark) {
  const [images, setImages] = useState({
    screenshot: DEFAULT_SCREENSHOT_FILENAME,
    asset: DEFAULT_SCREENSHOT_FILENAME,
  });

  useEffect(() => {
    async function loadImages() {
      const newImages = { ...images };

      const screenshot = bookmark.assets?.find((asset) => asset.assetType === "screenshot");
      if (screenshot?.id) {
        try {
          newImages.screenshot = await getScreenshot(screenshot.id);
        } catch (error) {
          console.error("Failed to get screenshot:", error);
        }
      }

      if (bookmark.content.type === "asset" && bookmark.content.assetType === "image" && bookmark.content.assetId) {
        try {
          newImages.asset = await getScreenshot(bookmark.content.assetId);
        } catch (error) {
          console.error("Failed to get asset image:", error);
        }
      }

      setImages(newImages);
    }

    loadImages();
  }, [bookmark]);

  return images;
}

function useToastHandler() {
  const { t } = useTranslation();

  return async (action: string, operation: () => Promise<void>) => {
    const toast = await showToast({
      title: t(`bookmark.toast.${action}.title`),
      message: t(`bookmark.toast.${action}.loading`),
    });

    try {
      await operation();
      toast.style = Toast.Style.Success;
      toast.title = t(`bookmark.toast.${action}.success`);
      return true;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.message = String(error);
      return false;
    }
  };
}

export function BookmarkDetail({ bookmark: initialBookmark, onRefresh }: BookmarkDetailProps) {
  const { pop, push } = useNavigation();
  const { config } = useConfig();
  const [bookmark, setBookmark] = useState<Bookmark>(initialBookmark);
  const { t } = useTranslation();
  const handleToast = useToastHandler();
  const images = useBookmarkImages(bookmark);

  const dashboardPreviewPage = useMemo(
    () => `${config.apiUrl}/dashboard/preview/${bookmark.id}`,
    [config.apiUrl, bookmark.id],
  );

  const fetchLatestBookmark = useCallback(async () => {
    try {
      const latest = await fetchGetSingleBookmark(bookmark.id);
      if (latest) {
        setBookmark(latest as Bookmark);
      }
    } catch (error) {
      console.error("Failed to fetch latest bookmark:", error);
    }
  }, [bookmark.id]);

  useEffect(() => {
    fetchLatestBookmark();
  }, [fetchLatestBookmark]);

  const handleSummarize = async () => {
    await handleToast("summarize", async () => {
      await fetchSummarizeBookmark(bookmark.id);
      await fetchLatestBookmark();
      await onRefresh?.();
    });
  };

  const handleUpdate = async (options: { archived?: boolean; favourited?: boolean }) => {
    await handleToast("update", async () => {
      await fetchUpdateBookmark(bookmark.id, options);
      await fetchLatestBookmark();
      await onRefresh?.();
    });
  };

  const handleDelete = async () => {
    await handleToast("delete", async () => {
      await fetchDeleteBookmark(bookmark.id);
      await onRefresh?.();
      pop();
    });
  };

  const handleEditUpdate = async () => {
    await fetchLatestBookmark();
    onRefresh?.();
  };

  const handleEdit = async () => {
    push(<BookmarkEdit bookmark={bookmark} onRefresh={handleEditUpdate} />);
  };

  function renderMarkdown() {
    const parts: string[] = [];
    const customTitle = Boolean(bookmark.title);
    const displayTitle = bookmark.title || bookmark.content.title || t("bookmark.untitled");

    const addTitle = (title: string) => {
      if (title) {
        parts.push(`### ${title}`);
      }
    };

    const addFileName = (fileName: string, emoji: string) => {
      if (customTitle) {
        parts.push(`${emoji} ${fileName}`);
      }
    };

    switch (bookmark.content.type) {
      case "link":
        images.screenshot && parts.push(`![${bookmark.content.title}](${images.screenshot})`);
        addTitle(displayTitle);
        break;

      case "text":
        customTitle && addTitle(displayTitle);
        bookmark.content.text && parts.push(`\n${bookmark.content.text}`);
        break;

      case "asset": {
        const { assetType, fileName } = bookmark.content;
        const assetDisplayTitle = customTitle ? bookmark.title : fileName || t("bookmark.untitledImage");

        if (assetType === "image") {
          images.asset && parts.push(`\n![${fileName}](${images.asset})`);
          addTitle(assetDisplayTitle || "");
          addFileName(fileName || "", "🖼️");
        } else if (assetType === "pdf") {
          addTitle(assetDisplayTitle || "");
          addFileName(fileName || "", "📕");
        }
        break;
      }
    }

    bookmark.summary && parts.push(`\n### ${t("bookmark.sections.summary")}\n${bookmark.summary}`);
    bookmark.note && parts.push(`\n### ${t("bookmark.sections.note")}\n${bookmark.note}`);

    return parts.join("\n");
  }

  function renderActions() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {bookmark.content.type === "link" && bookmark.content.url && (
            <>
              <Action.OpenInBrowser title={t("bookmark.actions.openInBrowser")} url={bookmark.content.url} />
              <Action.OpenInBrowser
                title={t("bookmark.actions.previewInDashboard")}
                url={dashboardPreviewPage}
                icon={Icon.Eye}
              />
              <Action.CopyToClipboard
                content={bookmark.content.url}
                title={t("bookmark.actions.copyLink")}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </>
          )}

          {bookmark.content.type === "text" && bookmark.content.text && (
            <>
              <Action.CopyToClipboard content={bookmark.content.text} title={t("bookmark.actions.copyContent")} />
              <Action.OpenInBrowser
                title={t("bookmark.actions.previewInDashboard")}
                url={dashboardPreviewPage}
                icon={Icon.Eye}
              />
            </>
          )}

          {bookmark.content.type === "asset" && (
            <>
              <Action.OpenInBrowser
                title={t("bookmark.actions.previewInDashboard")}
                url={dashboardPreviewPage}
                icon={Icon.Eye}
              />
            </>
          )}
        </ActionPanel.Section>
        <ActionPanel.Section>
          {bookmark.content.type === "link" && bookmark.content.url && (
            <Action
              title={t("bookmark.actions.aiSummary")}
              onAction={handleSummarize}
              icon={Icon.Wand}
              shortcut={{ modifiers: ["ctrl"], key: "s" }}
            />
          )}
          <Action
            title={bookmark.favourited ? t("bookmark.actions.unfavorite") : t("bookmark.actions.favorite")}
            onAction={() => handleUpdate({ favourited: !bookmark.favourited })}
            icon={bookmark.favourited ? Icon.StarCircle : Icon.Star}
            shortcut={{ modifiers: ["ctrl"], key: "f" }}
          />
          <Action
            title={bookmark.archived ? t("bookmark.actions.unarchive") : t("bookmark.actions.archive")}
            onAction={() => handleUpdate({ archived: !bookmark.archived })}
            icon={bookmark.archived ? Icon.BlankDocument : Icon.SaveDocument}
            shortcut={{ modifiers: ["ctrl"], key: "a" }}
          />
        </ActionPanel.Section>

        <ActionPanel.Section>
          <Action
            title={t("bookmark.actions.edit")}
            onAction={handleEdit}
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["ctrl"], key: "e" }}
          />
          <Action
            title={t("bookmark.actions.delete")}
            onAction={handleDelete}
            icon={Icon.Trash}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  function renderMetadata() {
    return (
      <Detail.Metadata>
        {bookmark.content.type === "link" && bookmark.content.url && (
          <>
            <Detail.Metadata.Link title="URL" target={bookmark.content.url} text={bookmark.content.url} />
            <Detail.Metadata.Separator />
          </>
        )}

        <Detail.Metadata.TagList title={t("bookmark.metadata.status")}>
          <Detail.Metadata.TagList.Item
            text={bookmark.favourited ? t("bookmark.status.favorited") : t("bookmark.status.unfavorited")}
            color={bookmark.favourited ? FAVOURED_COLOR : DEFAULT_COLOR}
            icon={bookmark.favourited ? Icon.Star : Icon.StarDisabled}
          />
          <Detail.Metadata.TagList.Item
            text={bookmark.archived ? t("bookmark.status.archived") : t("bookmark.status.unarchived")}
            color={bookmark.archived ? ARCHIVED_COLOR : DEFAULT_COLOR}
            icon={bookmark.archived ? Icon.SaveDocument : Icon.BlankDocument}
          />
          {bookmark.content.type === "link" && bookmark.content.url && (
            <Detail.Metadata.TagList.Item
              text={bookmark.summary ? t("bookmark.status.summarized") : t("bookmark.status.unsummarized")}
              color={bookmark.summary ? TAG_AI_COLOR : DEFAULT_COLOR}
              icon={Icon.Wand}
            />
          )}
        </Detail.Metadata.TagList>
        <Detail.Metadata.Separator />

        <Detail.Metadata.TagList title={t("bookmark.metadata.tags")}>
          {bookmark.tags.map((tag) => (
            <Detail.Metadata.TagList.Item
              key={tag.id}
              text={tag.name}
              color={tag.attachedBy === "ai" ? TAG_AI_COLOR : TAG_HUMAN_COLOR}
            />
          ))}
        </Detail.Metadata.TagList>
        <Detail.Metadata.Separator />

        <Detail.Metadata.Label
          title={t("bookmark.metadata.createdAt")}
          text={new Date(bookmark.createdAt).toLocaleString()}
        />
        <Detail.Metadata.Separator />
      </Detail.Metadata>
    );
  }

  const navigationTitle = useMemo(() => {
    switch (bookmark.content.type) {
      case "link":
        return bookmark.content.title;
      case "text":
        return bookmark.content.text?.slice(0, 20);
      case "asset":
        return bookmark.content.fileName;
      default:
        return t("bookmark.title");
    }
  }, [bookmark.content, t]);

  return (
    <Detail
      markdown={renderMarkdown()}
      navigationTitle={navigationTitle}
      metadata={renderMetadata()}
      actions={renderActions()}
    />
  );
}
