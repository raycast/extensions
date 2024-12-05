import { Action, ActionPanel, Icon, Image, List, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { fetchDeleteBookmark } from "../apis";
import { DEFAULT_SCREENSHOT_FILENAME, TAG_AI_COLOR, TAG_HUMAN_COLOR } from "../constants";
import { useTranslation } from "../hooks/useTranslation";
import { Bookmark, Config } from "../types";
import { getScreenshot } from "../utils/screenshot";
import { BookmarkDetail } from "./BookmarkDetail";
import { BookmarkEdit } from "./BookmarkEdit";

const { Metadata } = List.Item.Detail;

interface BookmarkItemProps {
  bookmark: Bookmark;
  config: Config;
  onRefresh: () => void;
  onCleanCache?: () => void;
}

const TextBookmarkMetadata = ({ bookmark, t }: { bookmark: Bookmark; t: (key: string) => string }) => (
  <Metadata>
    <Metadata.Label title={t("bookmarkItem.metadata.content")} text={bookmark.content.text || ""} />
    <BookmarkCommonMetadata bookmark={bookmark} t={t} />
  </Metadata>
);

const AssetBookmarkMetadata = ({ bookmark, t }: { bookmark: Bookmark; t: (key: string) => string }) => (
  <Metadata>
    <Metadata.Label title={t("bookmarkItem.metadata.filename")} text={bookmark.content.fileName || ""} />
    <BookmarkCommonMetadata bookmark={bookmark} t={t} />
  </Metadata>
);

const LinkBookmarkMetadata = ({ bookmark, t }: { bookmark: Bookmark; t: (key: string) => string }) => (
  <Metadata>
    <Metadata.Label title="URL" text={bookmark.content.url} />
    <BookmarkCommonMetadata bookmark={bookmark} t={t} />
    {bookmark.content.description && (
      <Metadata.Label title={t("bookmarkItem.metadata.description")} text={bookmark.content.description} />
    )}
  </Metadata>
);

const BookmarkCommonMetadata = ({ bookmark, t }: { bookmark: Bookmark; t: (key: string) => string }) => (
  <>
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
  </>
);

const CommonActions = ({
  bookmark,
  onRefresh,
  onCleanCache,
  handleEditBookmark,
  handleDeleteBookmark,
  t,
  children,
}: {
  bookmark: Bookmark;
  onRefresh: () => void;
  onCleanCache?: () => void;
  handleEditBookmark: () => void;
  handleDeleteBookmark: (id: string) => void;
  t: (key: string) => string;
  children?: React.ReactNode;
}) => (
  <ActionPanel>
    <ActionPanel.Section>
      <Action.Push
        icon={Icon.Sidebar}
        target={<BookmarkDetail bookmark={bookmark} onRefresh={onRefresh} />}
        title={t("bookmarkItem.actions.viewDetail")}
      />
      <Action
        icon={Icon.Pencil}
        title={t("bookmark.actions.edit")}
        onAction={handleEditBookmark}
        shortcut={{ modifiers: ["ctrl"], key: "e" }}
      />
      {children}
    </ActionPanel.Section>
    <ActionPanel.Section>
      <Action
        icon={Icon.ArrowClockwise}
        title={t("bookmarkItem.actions.refresh")}
        onAction={onRefresh}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      {onCleanCache && (
        <Action
          icon={Icon.Trash}
          title={t("bookmarkItem.actions.clearCache")}
          onAction={onCleanCache}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      )}
    </ActionPanel.Section>
    <ActionPanel.Section>
      <Action
        icon={Icon.Trash}
        title={t("bookmarkItem.actions.delete")}
        onAction={() => handleDeleteBookmark(bookmark.id)}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
      />
    </ActionPanel.Section>
  </ActionPanel>
);

export function BookmarkItem({ bookmark, config, onRefresh, onCleanCache }: BookmarkItemProps) {
  const { push } = useNavigation();
  const { t } = useTranslation();
  const [screenshotUrl, setScreenshotUrl] = useState<string>(DEFAULT_SCREENSHOT_FILENAME);
  const [assetImageUrl, setAssetImageUrl] = useState<string>(DEFAULT_SCREENSHOT_FILENAME);
  const showWebsitePreview = config?.showWebsitePreview;

  const handleEditUpdate = useCallback(async () => {
    await onRefresh();
  }, [onRefresh]);

  const handleDeleteBookmark = useCallback(
    async (id: string) => {
      const toast = await showToast({
        title: t("bookmarkItem.toast.delete.title"),
        message: t("bookmarkItem.toast.delete.loading"),
      });

      try {
        await fetchDeleteBookmark(id);
        toast.title = t("bookmarkItem.toast.delete.success");
        await onRefresh();
      } catch (error) {
        toast.title = t("bookmarkItem.toast.delete.error");
      } finally {
        toast.hide();
      }
    },
    [t, onRefresh],
  );

  const handleEdit = useCallback(() => {
    push(<BookmarkEdit bookmark={bookmark} onRefresh={handleEditUpdate} />);
  }, [bookmark, handleEditUpdate, push]);

  useEffect(() => {
    const loadImages = async () => {
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
    };

    loadImages();
  }, [bookmark.assets, bookmark.content]);

  const renderContent = useCallback(() => {
    const customTitle = Boolean(bookmark.title);
    const defaultTitle = t("bookmarkItem.untitled");

    switch (bookmark.content.type) {
      case "text":
        return {
          title: customTitle ? bookmark.title : bookmark.content.text?.slice(0, 50) || defaultTitle,
          icon: Icon.Text,
          metadata: <TextBookmarkMetadata bookmark={bookmark} t={t} />,
          actions: (
            <CommonActions
              bookmark={bookmark}
              onRefresh={onRefresh}
              onCleanCache={onCleanCache}
              handleEditBookmark={handleEdit}
              handleDeleteBookmark={handleDeleteBookmark}
              t={t}
            >
              <Action.CopyToClipboard
                content={bookmark.content.text || ""}
                title={t("bookmarkItem.actions.copyContent")}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </CommonActions>
          ),
        };

      case "asset": {
        const { assetType, fileName } = bookmark.content;
        const displayTitle = bookmark.title || fileName || defaultTitle;

        if (assetType === "image" || assetType === "pdf") {
          return {
            title: displayTitle,
            icon: assetType === "image" ? Icon.Image : Icon.Document,
            metadata: <AssetBookmarkMetadata bookmark={bookmark} t={t} />,
            imageUrl: assetImageUrl,
            actions: (
              <CommonActions
                bookmark={bookmark}
                onRefresh={onRefresh}
                onCleanCache={onCleanCache}
                handleEditBookmark={handleEdit}
                handleDeleteBookmark={handleDeleteBookmark}
                t={t}
              >
                {assetType === "image" && assetImageUrl && (
                  <Action.OpenInBrowser url={assetImageUrl} title={t("bookmarkItem.actions.viewImage")} />
                )}
              </CommonActions>
            ),
          };
        }
        return null;
      }

      case "link":
        return {
          title: customTitle ? bookmark.title : bookmark.content.title || defaultTitle,
          icon:
            showWebsitePreview && bookmark.content.favicon
              ? { source: bookmark.content.favicon, mask: Image.Mask.Circle }
              : Icon.Link,
          metadata: <LinkBookmarkMetadata bookmark={bookmark} t={t} />,
          actions: (
            <CommonActions
              bookmark={bookmark}
              onRefresh={onRefresh}
              onCleanCache={onCleanCache}
              handleEditBookmark={handleEdit}
              handleDeleteBookmark={handleDeleteBookmark}
              t={t}
            >
              <Action.OpenInBrowser
                url={bookmark.content.url || ""}
                title={t("bookmarkItem.actions.openLink")}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action.CopyToClipboard
                content={bookmark.content.url || ""}
                title={t("bookmarkItem.actions.copyLink")}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </CommonActions>
          ),
        };

      default:
        return null;
    }
  }, [bookmark, showWebsitePreview, assetImageUrl, t, onRefresh, onCleanCache, handleEdit, handleDeleteBookmark]);

  const content = renderContent();
  if (!content) return null;

  const markdown = (() => {
    if (
      bookmark.content.type === "text" ||
      (bookmark.content.type === "asset" && bookmark.content.assetType === "pdf")
    ) {
      return "";
    }
    return content.imageUrl
      ? `<img src="${content.imageUrl}" center width="300" />`
      : screenshotUrl
        ? `<img src="${screenshotUrl}" center width="300" />`
        : "";
  })();

  return (
    <List.Item
      title={content.title || t("bookmarkItem.untitled")}
      icon={content.icon}
      id={bookmark.id}
      detail={<List.Item.Detail markdown={markdown} metadata={content.metadata} />}
      actions={content.actions}
    />
  );
}
