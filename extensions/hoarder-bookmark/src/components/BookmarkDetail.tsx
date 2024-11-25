import { Action, ActionPanel, Detail, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { fetchDeleteBookmark, fetchGetSingleBookmark, fetchSummarizeBookmark, fetchUpdateBookmark } from "../apis";
import { ARCHIVED_COLOR, DEFAULT_COLOR, FAVOURED_COLOR, TAG_AI_COLOR, TAG_HUMAN_COLOR } from "../constants";
import { useConfig } from "../hooks/useConfig";
import { Bookmark } from "../types";
import { getScreenshot } from "../utils/screenshot";
import { DEFAULT_SCREENSHOT_FILENAME } from "../constants";
import { useTranslation } from "../hooks/useTranslation";

interface BookmarkDetailProps {
  bookmark: Bookmark;
  onRefresh?: () => void;
}

export function BookmarkDetail({ bookmark: initialBookmark, onRefresh }: BookmarkDetailProps) {
  const { pop } = useNavigation();
  const [screenshotUrl, setScreenshotUrl] = useState<string>(DEFAULT_SCREENSHOT_FILENAME);
  const [assetImageUrl, setAssetImageUrl] = useState<string>(DEFAULT_SCREENSHOT_FILENAME);
  const { config } = useConfig();
  const { host } = config;
  const [bookmark, setBookmark] = useState<Bookmark>(initialBookmark);
  const dashboardPreviewPage = `${host}/dashboard/preview/${bookmark.id}`;
  const { t } = useTranslation();

  const fetchLatestBookmark = useCallback(async () => {
    try {
      const latest = await fetchGetSingleBookmark(bookmark.id);
      if (latest) {
        setBookmark(latest as Bookmark);
      }
    } catch (error) {
      console.error("Failed to fetch latest bookmark:", error);
    }
  }, [initialBookmark.id]);

  useEffect(() => {
    fetchLatestBookmark();
  }, [fetchLatestBookmark]);

  useEffect(() => {
    async function loadImages() {
      const screenshot = bookmark.assets?.find((asset) => asset.assetType === "screenshot");
      if (screenshot?.id) {
        try {
          const url = await getScreenshot(screenshot.id);
          setScreenshotUrl(url);
        } catch (error) {
          console.error("Failed to get screenshot:", error);
        }
      }

      if (bookmark.content.type === "asset" && bookmark.content.assetType === "image" && bookmark.content.assetId) {
        try {
          const url = await getScreenshot(bookmark.content.assetId);
          setAssetImageUrl(url);
        } catch (error) {
          console.error("Failed to get asset image:", error);
        }
      }
    }

    loadImages();
  }, [bookmark]);

  const handleSummarize = async () => {
    const toast = await showToast({
      title: t("bookmark.toast.summarize.title"),
      message: t("bookmark.toast.summarize.loading"),
    });
    try {
      await fetchSummarizeBookmark(bookmark.id);
      await fetchLatestBookmark();
      toast.style = Toast.Style.Success;
      toast.title = t("bookmark.toast.summarize.success");
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.message = String(error);
    }
  };

  const handleUpdate = async (options: { archived?: boolean; favourited?: boolean }) => {
    const toast = await showToast({
      title: t("bookmark.toast.update.title"),
      message: t("bookmark.toast.update.loading"),
    });
    try {
      await fetchUpdateBookmark(bookmark.id, options);
      await fetchLatestBookmark();
      toast.style = Toast.Style.Success;
      toast.title = t("bookmark.toast.update.success");
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.message = String(error);
    }
  };

  const handleDelete = async () => {
    const toast = await showToast({
      title: t("bookmark.toast.delete.title"),
      message: t("bookmark.toast.delete.loading"),
    });
    try {
      await fetchDeleteBookmark(bookmark.id);
      toast.style = Toast.Style.Success;
      toast.title = t("bookmark.toast.delete.success");
      onRefresh?.();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.message = String(error);
    }
  };

  function renderMarkdown() {
    const parts: string[] = [];

    switch (bookmark.content.type) {
      case "link":
        if (screenshotUrl) {
          parts.push(`![预览图](${screenshotUrl})`);
        }
        parts.push(`### ${bookmark.content.title || t("bookmark.untitled")}`);
        break;

      case "text":
        if (bookmark.content.text) {
          parts.push(`\n${bookmark.content.text}`);
        }
        break;

      case "asset":
        if (bookmark.content.assetType === "image") {
          if (assetImageUrl) {
            parts.push(`\n![图片](${assetImageUrl})`);
          }
          parts.push(`### ${bookmark.content.fileName || t("bookmark.untitledImage")}`);
        }
        break;
    }

    if (bookmark.summary) {
      parts.push(`\n### ${t("bookmark.sections.summary")}\n${bookmark.summary}`);
    }

    if (bookmark.note) {
      parts.push(`\n### ${t("bookmark.sections.note")}\n${bookmark.note}`);
    }

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
        </ActionPanel.Section>
        <ActionPanel.Section>
          {bookmark.content.type === "link" && bookmark.content.url && (
            <Action title={t("bookmark.actions.aiSummary")} onAction={handleSummarize} icon={Icon.Wand} />
          )}
          <Action
            title={bookmark.favourited ? t("bookmark.actions.unfavorite") : t("bookmark.actions.favorite")}
            onAction={() => handleUpdate({ favourited: !bookmark.favourited })}
            icon={bookmark.favourited ? Icon.StarCircle : Icon.Star}
          />
          <Action
            title={bookmark.archived ? t("bookmark.actions.unarchive") : t("bookmark.actions.archive")}
            onAction={() => handleUpdate({ archived: !bookmark.archived })}
            icon={bookmark.archived ? Icon.BlankDocument : Icon.SaveDocument}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
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

  return (
    <Detail
      markdown={renderMarkdown()}
      navigationTitle={
        bookmark.content.type === "link"
          ? bookmark.content.title
          : bookmark.content.type === "text"
            ? bookmark.content.text?.slice(0, 20)
            : bookmark.content.type === "asset"
              ? bookmark.content.fileName
              : t("bookmark.title")
      }
      metadata={
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
      }
      actions={renderActions()}
    />
  );
}
