import { Action, ActionPanel, Icon, Image, List, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchDeleteBookmark } from "../apis";
import { DEFAULT_SCREENSHOT_FILENAME, TAG_AI_COLOR, TAG_HUMAN_COLOR } from "../constants";
import { useTranslation } from "../hooks/useTranslation";
import { Bookmark, Config } from "../types";
import { getScreenshot } from "../utils/screenshot";
import { BookmarkDetail } from "./BookmarkDetail";
const { Metadata } = List.Item.Detail;

interface BookmarkItemProps {
  bookmark: Bookmark;
  config: Config;
  onRefresh: () => void;
  onCleanCache?: () => void;
}

function renderBookmarkContent(
  bookmark: Bookmark,
  showWebsitePreview: boolean,
  assetImageUrl: string,
  handleDeleteBookmark: (id: string) => void,
  t: (key: string) => string,
) {
  switch (bookmark.content.type) {
    case "text":
      return {
        title: bookmark.content.text?.slice(0, 50) || t("bookmarkItem.untitled"),
        icon: Icon.Pencil,
        metadata: (
          <Metadata>
            <Metadata.Label title={t("bookmarkItem.metadata.content")} text={bookmark.content.text || ""} />
            <Metadata.Label
              title={t("bookmarkItem.metadata.createdAt")}
              text={new Date(bookmark.createdAt).toLocaleDateString()}
            />
            {bookmark.tags.length > 0 && (
              <Metadata.TagList title={t("bookmarkItem.metadata.tags")}>
                {bookmark.tags.map((tag) => (
                  <Metadata.TagList.Item
                    key={tag.id}
                    text={tag.name}
                    color={tag.attachedBy === "ai" ? TAG_AI_COLOR : TAG_HUMAN_COLOR}
                  />
                ))}
              </Metadata.TagList>
            )}
          </Metadata>
        ),
        actions: (onRefresh: () => void, onCleanCache?: () => void) => (
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                icon={Icon.Sidebar}
                target={<BookmarkDetail bookmark={bookmark} onRefresh={onRefresh} />}
                title={t("bookmarkItem.actions.viewDetail")}
              />
              <Action.CopyToClipboard
                content={bookmark.content.text || ""}
                title={t("bookmarkItem.actions.copyContent")}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action icon={Icon.ArrowClockwise} title={t("bookmarkItem.actions.refresh")} onAction={onRefresh} />
              <Action icon={Icon.Trash} title={t("bookmarkItem.actions.clearCache")} onAction={onCleanCache} />
            </ActionPanel.Section>
            <Action
              icon={Icon.Trash}
              title={t("bookmarkItem.actions.delete")}
              onAction={() => handleDeleteBookmark(bookmark.id)}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
            />
          </ActionPanel>
        ),
      };

    case "asset":
      if (bookmark.content.assetType === "image") {
        return {
          title: bookmark.content.fileName || t("bookmarkItem.untitledImage"),
          icon: Icon.Image,
          metadata: (
            <Metadata>
              <Metadata.Label title={t("bookmarkItem.metadata.filename")} text={bookmark.content.fileName || ""} />
              <Metadata.Label
                title={t("bookmarkItem.metadata.createdAt")}
                text={new Date(bookmark.createdAt).toLocaleDateString()}
              />
              {bookmark.tags.length > 0 && (
                <Metadata.TagList title={t("bookmarkItem.metadata.tags")}>
                  {bookmark.tags.map((tag) => (
                    <Metadata.TagList.Item
                      key={tag.id}
                      text={tag.name}
                      color={tag.attachedBy === "ai" ? TAG_AI_COLOR : TAG_HUMAN_COLOR}
                    />
                  ))}
                </Metadata.TagList>
              )}
            </Metadata>
          ),
          imageUrl: assetImageUrl,
          actions: (onRefresh: () => void, onCleanCache?: () => void) => (
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  icon={Icon.Sidebar}
                  target={<BookmarkDetail bookmark={bookmark} onRefresh={onRefresh} />}
                  title={t("bookmarkItem.actions.viewDetail")}
                />
                {assetImageUrl && (
                  <Action.OpenInBrowser url={assetImageUrl} title={t("bookmarkItem.actions.viewImage")} />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action icon={Icon.ArrowClockwise} title={t("bookmarkItem.actions.refresh")} onAction={onRefresh} />
                <Action icon={Icon.Trash} title={t("bookmarkItem.actions.clearCache")} onAction={onCleanCache} />
              </ActionPanel.Section>
              <Action
                icon={Icon.Trash}
                title={t("bookmarkItem.actions.delete")}
                onAction={() => handleDeleteBookmark(bookmark.id)}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            </ActionPanel>
          ),
        };
      }
      return null;

    case "link":
      return {
        title: bookmark.content.title || t("bookmarkItem.untitled"),
        icon: showWebsitePreview
          ? bookmark.content.favicon
            ? { source: bookmark.content.favicon, mask: Image.Mask.Circle }
            : Icon.Link
          : Icon.Link,
        metadata: (
          <Metadata>
            <Metadata.Label title="URL" text={bookmark.content.url} />
            <Metadata.Label
              title={t("bookmarkItem.metadata.createdAt")}
              text={new Date(bookmark.createdAt).toLocaleDateString()}
            />
            {bookmark.tags.length > 0 && (
              <Metadata.TagList title={t("bookmarkItem.metadata.tags")}>
                {bookmark.tags.map((tag) => (
                  <Metadata.TagList.Item
                    key={tag.id}
                    text={tag.name}
                    color={tag.attachedBy === "ai" ? TAG_AI_COLOR : TAG_HUMAN_COLOR}
                  />
                ))}
              </Metadata.TagList>
            )}
            {bookmark.content.description && (
              <Metadata.Label title={t("bookmarkItem.metadata.description")} text={bookmark.content.description} />
            )}
          </Metadata>
        ),
        actions: (onRefresh: () => void, onCleanCache?: () => void) => (
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                icon={Icon.Sidebar}
                target={<BookmarkDetail bookmark={bookmark} onRefresh={onRefresh} />}
                title={t("bookmarkItem.actions.viewDetail")}
              />
              <Action.OpenInBrowser url={bookmark.content.url || ""} title={t("bookmarkItem.actions.openLink")} />
              <Action.CopyToClipboard
                content={bookmark.content.url || ""}
                title={t("bookmarkItem.actions.copyLink")}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action icon={Icon.ArrowClockwise} title={t("bookmarkItem.actions.refresh")} onAction={onRefresh} />
              <Action icon={Icon.Trash} title={t("bookmarkItem.actions.clearCache")} onAction={onCleanCache} />
            </ActionPanel.Section>
            <Action
              icon={Icon.Trash}
              title={t("bookmarkItem.actions.delete")}
              onAction={() => handleDeleteBookmark(bookmark.id)}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
            />
          </ActionPanel>
        ),
      };

    default:
      return null;
  }
}

export function BookmarkItem({ bookmark, config, onRefresh, onCleanCache }: BookmarkItemProps) {
  const { t } = useTranslation();
  const [screenshotUrl, setScreenshotUrl] = useState<string>(DEFAULT_SCREENSHOT_FILENAME);
  const [assetImageUrl, setAssetImageUrl] = useState<string>(DEFAULT_SCREENSHOT_FILENAME);
  const showWebsitePreview = config?.showWebsitePreview;
  const handleDeleteBookmark = async (id: string) => {
    const toast = await showToast({
      title: t("bookmarkItem.toast.delete.title"),
      message: t("bookmarkItem.toast.delete.loading"),
    });

    try {
      await fetchDeleteBookmark(id);
      toast.title = t("bookmarkItem.toast.delete.success");
      onRefresh();
    } catch (error) {
      toast.title = t("bookmarkItem.toast.delete.error");
    } finally {
      toast.hide();
    }
  };

  useEffect(() => {
    async function loadImages() {
      const screenshot = bookmark.assets?.find((asset) => asset.assetType === "screenshot");
      if (screenshot) {
        try {
          const url = await getScreenshot(screenshot.id);
          setScreenshotUrl(url);
        } catch (error) {
          console.error("Failed to get screenshot:", error);
        }
      }

      if (bookmark.content.type === "asset" && bookmark.content.assetType === "image") {
        try {
          const url = await getScreenshot(bookmark.content.assetId || "");
          setAssetImageUrl(url);
        } catch (error) {
          console.error("Failed to get asset image:", error);
        }
      }
    }

    loadImages();
  }, [bookmark.assets, bookmark.content]);

  const content = renderBookmarkContent(bookmark, showWebsitePreview, assetImageUrl, handleDeleteBookmark, t);
  if (!content) return null;

  return (
    <List.Item
      title={content.title}
      icon={content.icon}
      detail={
        <List.Item.Detail
          markdown={
            bookmark.content.type === "text"
              ? ""
              : content.imageUrl
                ? `<img src="${content.imageUrl}" center width="300"  />`
                : screenshotUrl
                  ? `<img src="${screenshotUrl}" center width="300"  />`
                  : ""
          }
          metadata={content.metadata || null}
        />
      }
      actions={content.actions ? content.actions(onRefresh, onCleanCache) : null}
    />
  );
}
