import { Action, ActionPanel, Icon, Image, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { fetchDeleteBookmark, fetchGetSingleBookmark, fetchSummarizeBookmark, fetchUpdateBookmark } from "../apis";
import {
  ARCHIVED_COLOR,
  DEFAULT_COLOR,
  DEFAULT_SCREENSHOT_FILENAME,
  FAVOURED_COLOR,
  TAG_AI_COLOR,
  TAG_HUMAN_COLOR,
} from "../constants";
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
  onVisit?: (bookmark: Bookmark) => void;
  isSelected?: boolean;
}

function getPreviewAssetIds(bookmark: Bookmark): { screenshotId?: string; imageAssetId?: string } {
  const screenshotId = bookmark.assets?.find((asset) => asset.assetType === "screenshot")?.id;
  const imageAssetId =
    bookmark.content.type === "asset" && bookmark.content.assetType === "image" ? bookmark.content.assetId : undefined;
  return { screenshotId, imageAssetId };
}

function useAuthenticatedAssetUrl(assetId: string | undefined, enabled: boolean) {
  const [url, setUrl] = useState<string>(DEFAULT_SCREENSHOT_FILENAME);
  const lastAssetIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Reset when asset changes so we don't accidentally show a stale URL
    // if the component gets enabled later.
    if (assetId !== lastAssetIdRef.current) {
      lastAssetIdRef.current = assetId;
      setUrl(DEFAULT_SCREENSHOT_FILENAME);
    }
  }, [assetId]);

  useEffect(() => {
    if (!enabled || !assetId) return;

    let cancelled = false;
    (async () => {
      try {
        const imageUrl = await getScreenshot(assetId);
        if (!cancelled) {
          setUrl(imageUrl);
        }
      } catch (error) {
        logger.error("Failed to get authenticated image", { assetId, error });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetId, enabled]);

  return url;
}

function useBookmarkImages(bookmark: Bookmark, enabled: boolean) {
  const { screenshotId, imageAssetId } = getPreviewAssetIds(bookmark);
  const screenshot = useAuthenticatedAssetUrl(screenshotId, enabled);
  const asset = useAuthenticatedAssetUrl(imageAssetId, enabled);

  return { screenshot, asset };
}

function useBookmarkHandlers({
  bookmark,
  setBookmark,
  onRefresh,
}: {
  bookmark: Bookmark;
  setBookmark: (bookmark: Bookmark) => void;
  onRefresh: () => void;
}) {
  const { push } = useNavigation();
  const { t } = useTranslation();

  const fetchLatestBookmark = useCallback(async () => {
    try {
      const latest = await fetchGetSingleBookmark(bookmark.id);
      if (latest) {
        setBookmark(latest as Bookmark);
      }
    } catch (error) {
      logger.error("Failed to fetch latest bookmark", { bookmarkId: bookmark.id, error });
    }
  }, [bookmark.id, setBookmark]);

  const handleToast = useCallback(
    async (action: string, operation: () => Promise<void>) => {
      const toast = await showToast({
        title: t(`bookmark.toast.${action}.title`),
        message: t(`bookmark.toast.${action}.loading`),
      });

      try {
        await operation();
        toast.style = Toast.Style.Success;
        toast.title = t(`bookmark.toast.${action}.success`);
        if (action !== "delete") {
          await fetchLatestBookmark();
        }
      } catch (error) {
        logger.error(`Bookmark action '${action}' failed`, error);
        toast.style = Toast.Style.Failure;
        toast.message = String(error);
        if (action !== "delete") {
          await fetchLatestBookmark();
        }
        throw error;
      }
    },
    [t, fetchLatestBookmark],
  );

  const handleDeleteBookmark = useCallback(async () => {
    await handleToast("delete", async () => {
      await fetchDeleteBookmark(bookmark.id);
      onRefresh();
    });
  }, [bookmark.id, handleToast, onRefresh]);

  const handleEditUpdate = useCallback(async () => {
    await fetchLatestBookmark();
  }, [fetchLatestBookmark]);

  const handleEdit = useCallback(() => {
    push(<BookmarkEdit bookmark={bookmark} onRefresh={handleEditUpdate} />);
  }, [bookmark, handleEditUpdate, push]);

  const handleSummarize = useCallback(async () => {
    await handleToast("summarize", async () => {
      await fetchSummarizeBookmark(bookmark.id);
    });
  }, [bookmark.id, handleToast, setBookmark, t]);

  const handleUpdate = useCallback(
    async (options: { archived?: boolean; favourited?: boolean }) => {
      await handleToast("update", async () => {
        await fetchUpdateBookmark(bookmark.id, options);
      });
    },
    [bookmark.id, handleToast, setBookmark],
  );

  return {
    handleDeleteBookmark,
    handleEdit,
    handleSummarize,
    handleUpdate,
  };
}

function BookmarkMetadata({ bookmark, config, t }: { bookmark: Bookmark; config: Config; t: (key: string) => string }) {
  const renderCommonMetadata = () => (
    <>
      {config.displayBookmarkStatus && (
        <>
          <Metadata.TagList title={t("bookmark.metadata.status")}>
            <Metadata.TagList.Item
              text={bookmark.favourited ? t("bookmark.status.favorited") : t("bookmark.status.unfavorited")}
              color={bookmark.favourited ? FAVOURED_COLOR : DEFAULT_COLOR}
              icon={bookmark.favourited ? Icon.Star : Icon.StarDisabled}
            />
            <Metadata.TagList.Item
              text={bookmark.archived ? t("bookmark.status.archived") : t("bookmark.status.unarchived")}
              color={bookmark.archived ? ARCHIVED_COLOR : DEFAULT_COLOR}
              icon={bookmark.archived ? Icon.SaveDocument : Icon.BlankDocument}
            />
            {bookmark.content.type === "link" && bookmark.content.url && (
              <Metadata.TagList.Item
                text={bookmark.summary ? t("bookmark.status.summarized") : t("bookmark.status.unsummarized")}
                color={bookmark.summary ? TAG_AI_COLOR : DEFAULT_COLOR}
                icon={Icon.Wand}
              />
            )}
          </Metadata.TagList>
          <Metadata.Separator />
        </>
      )}
      {config.displayCreatedAt && (
        <>
          <Metadata.Label
            title={t("bookmark.metadata.createdAt")}
            text={new Date(bookmark.createdAt).toLocaleString()}
          />
          <Metadata.Separator />
        </>
      )}
      {config.displayTags && bookmark.tags.length > 0 && (
        <>
          <Metadata.TagList title={t("bookmark.metadata.tags")}>
            {bookmark.tags.map((tag) => (
              <Metadata.TagList.Item
                key={tag.id}
                text={tag.name}
                color={tag.attachedBy === "ai" ? TAG_AI_COLOR : TAG_HUMAN_COLOR}
              />
            ))}
          </Metadata.TagList>
          <Metadata.Separator />
        </>
      )}
      {config.displayNote && bookmark.note && (
        <>
          <Metadata.Label title={t("bookmark.metadata.note")} text={bookmark.note} />
          <Metadata.Separator />
        </>
      )}

      {config.displaySummary && bookmark.summary && (
        <>
          <Metadata.Label title={t("bookmark.metadata.summary")} text={bookmark.summary} />
          <Metadata.Separator />
        </>
      )}
    </>
  );

  const renderContentSpecificMetadata = () => {
    switch (bookmark.content.type) {
      case "text":
        return (
          <>
            <Metadata.Label title={t("bookmark.metadata.content")} text={bookmark.content.text || ""} />
            <Metadata.Separator />
          </>
        );

      case "asset":
        return (
          <>
            <Metadata.Label title={t("bookmark.metadata.filename")} text={bookmark.content.fileName || ""} />
            <Metadata.Separator />
          </>
        );

      case "link":
        return (
          <>
            <Metadata.Link title="URL" target={bookmark.content.url || ""} text={bookmark.content.url || ""} />
            <Metadata.Separator />
            {config.displayDescription && bookmark.content.description && (
              <>
                <Metadata.Label title={t("bookmark.metadata.description")} text={bookmark.content.description} />
                <Metadata.Separator />
              </>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Metadata>
      {renderContentSpecificMetadata()}
      {renderCommonMetadata()}
    </Metadata>
  );
}

function BookmarkActions({
  bookmark,
  config,
  onRefresh,
  onCleanCache,
  handlers,
  images,
  t,
  onVisit,
}: {
  bookmark: Bookmark;
  config: Config;
  onRefresh: () => void;
  onCleanCache?: () => void;
  handlers: ReturnType<typeof useBookmarkHandlers>;
  images: ReturnType<typeof useBookmarkImages>;
  t: (key: string) => string;
  onVisit?: (bookmark: Bookmark) => void;
}) {
  const getMainAction = () => {
    const pushDetailAction = (
      <Action.Push
        icon={Icon.Sidebar}
        target={<BookmarkDetail bookmark={bookmark} onRefresh={onRefresh} />}
        title={t("bookmarkItem.actions.viewDetail")}
      />
    );

    const editAction = (
      <Action
        icon={Icon.Pencil}
        title={t("bookmark.actions.edit")}
        onAction={handlers.handleEdit}
        shortcut={{ modifiers: ["ctrl"], key: "e" }}
      />
    );

    switch (bookmark.content.type) {
      case "link":
        if (bookmark.content.url) {
          const openInBrowserAction = (
            <Action.OpenInBrowser
              url={bookmark.content.url}
              title={t("bookmark.actions.openLink")}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onOpen={() => onVisit?.(bookmark)}
            />
          );

          switch (config.linkMainAction) {
            case "openInBrowser":
              return openInBrowserAction;
            case "edit":
              return editAction;
            case "viewDetail":
            default:
              return pushDetailAction;
          }
        }
        break;

      case "text":
        if (bookmark.content.text) {
          const copyAction = (
            <Action.CopyToClipboard
              content={bookmark.content.text}
              title={t("bookmark.actions.copyContent")}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onCopy={() => onVisit?.(bookmark)}
            />
          );

          switch (config.textMainAction) {
            case "copy":
              return copyAction;
            case "edit":
              return editAction;
            case "viewDetail":
            default:
              return pushDetailAction;
          }
        }
        break;

      case "asset":
        if (bookmark.content.assetType === "image" && images.asset !== DEFAULT_SCREENSHOT_FILENAME) {
          const viewImageAction = <Action.OpenInBrowser url={images.asset} title={t("bookmark.actions.viewImage")} />;

          switch (config.linkMainAction) {
            case "openInBrowser":
              return viewImageAction;
            case "edit":
              return editAction;
            case "viewDetail":
            default:
              return pushDetailAction;
          }
        }
        break;
    }

    return pushDetailAction;
  };

  const mainAction = getMainAction();

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {mainAction}
        {mainAction.props.title !== t("bookmarkItem.actions.viewDetail") && (
          <Action.Push
            icon={Icon.Sidebar}
            target={<BookmarkDetail bookmark={bookmark} onRefresh={onRefresh} />}
            title={t("bookmarkItem.actions.viewDetail")}
          />
        )}
        {mainAction.props.title !== t("bookmark.actions.edit") && (
          <Action
            icon={Icon.Pencil}
            title={t("bookmark.actions.edit")}
            onAction={handlers.handleEdit}
            shortcut={{ modifiers: ["ctrl"], key: "e" }}
          />
        )}
        {bookmark.content.type === "link" &&
          bookmark.content.url &&
          mainAction.props.title !== t("bookmark.actions.openLink") && (
            <>
              <Action.OpenInBrowser
                url={bookmark.content.url}
                title={t("bookmark.actions.openLink")}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onOpen={() => onVisit?.(bookmark)}
              />
              <Action.CopyToClipboard
                content={bookmark.content.url}
                title={t("bookmark.actions.copyLink")}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onCopy={() => onVisit?.(bookmark)}
              />
            </>
          )}
        {bookmark.content.type === "text" &&
          bookmark.content.text &&
          mainAction.props.title !== t("bookmark.actions.copyContent") && (
            <Action.CopyToClipboard
              content={bookmark.content.text}
              title={t("bookmark.actions.copyContent")}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onCopy={() => onVisit?.(bookmark)}
            />
          )}
        {bookmark.content.type === "asset" &&
          bookmark.content.assetType === "image" &&
          images.asset !== DEFAULT_SCREENSHOT_FILENAME &&
          mainAction.props.title !== t("bookmark.actions.viewImage") && (
            <Action.OpenInBrowser url={images.asset} title={t("bookmark.actions.viewImage")} />
          )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {bookmark.content.type === "link" && bookmark.content.url && (
          <Action
            title={t("bookmark.actions.aiSummary")}
            onAction={handlers.handleSummarize}
            icon={Icon.Wand}
            shortcut={{ modifiers: ["ctrl"], key: "s" }}
          />
        )}
        <Action
          title={bookmark.favourited ? t("bookmark.actions.unfavorite") : t("bookmark.actions.favorite")}
          onAction={() => handlers.handleUpdate({ favourited: !bookmark.favourited })}
          icon={bookmark.favourited ? Icon.StarCircle : Icon.Star}
          shortcut={{ modifiers: ["ctrl"], key: "f" }}
        />
        <Action
          title={bookmark.archived ? t("bookmark.actions.unarchive") : t("bookmark.actions.archive")}
          onAction={() => handlers.handleUpdate({ archived: !bookmark.archived })}
          icon={bookmark.archived ? Icon.BlankDocument : Icon.SaveDocument}
          shortcut={{ modifiers: ["ctrl"], key: "a" }}
        />
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
          onAction={handlers.handleDeleteBookmark}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function BookmarkItem({
  bookmark: initialBookmark,
  config,
  onRefresh,
  onCleanCache,
  onVisit,
  isSelected,
}: BookmarkItemProps) {
  const { t } = useTranslation();
  const [bookmark, setBookmark] = useState<Bookmark>(initialBookmark);
  useEffect(() => {
    setBookmark(initialBookmark);
  }, [initialBookmark]);

  const shouldPrewarmPreview =
    Boolean(isSelected) &&
    ((bookmark.content.type === "link" && config.displayBookmarkPreview) ||
      (bookmark.content.type === "asset" && bookmark.content.assetType === "image"));
  const images = useBookmarkImages(bookmark, shouldPrewarmPreview);

  const handlers = useBookmarkHandlers({
    bookmark,
    setBookmark,
    onRefresh,
  });

  const customTitle = Boolean(bookmark.title);
  const defaultTitle = t("bookmark.untitled");

  const getDisplayTitle = () => {
    switch (bookmark.content.type) {
      case "text":
        return customTitle ? bookmark.title : bookmark.content.text?.slice(0, 50) || defaultTitle;
      case "asset":
        return bookmark.title || bookmark.content.fileName || defaultTitle;
      case "link":
        return customTitle ? bookmark.title : bookmark.content.title || defaultTitle;
      default:
        return defaultTitle;
    }
  };

  const getIcon = () => {
    if (bookmark.content.type === "link" && config.showWebsitePreview && bookmark.content.favicon) {
      return { source: bookmark.content.favicon, mask: Image.Mask.Circle };
    }

    switch (bookmark.content.type) {
      case "text":
        return Icon.Text;
      case "asset":
        return bookmark.content.assetType === "image" ? Icon.Image : Icon.Document;
      default:
        return Icon.Link;
    }
  };

  const getPreviewImage = () => {
    if (bookmark.content.type === "link" && config.displayBookmarkPreview) {
      return images.screenshot;
    }
    if (bookmark.content.type === "asset" && bookmark.content.assetType === "image") {
      return images.asset;
    }
    return undefined;
  };

  const previewImage = getPreviewImage();

  return (
    <List.Item
      id={bookmark.id}
      title={getDisplayTitle() || ""}
      icon={getIcon()}
      detail={
        <List.Item.Detail
          markdown={previewImage ? `<img src="${previewImage}" center width="300" />` : ""}
          metadata={<BookmarkMetadata bookmark={bookmark} config={config} t={t} />}
        />
      }
      actions={
        <BookmarkActions
          bookmark={bookmark}
          config={config}
          onRefresh={onRefresh}
          onCleanCache={onCleanCache}
          handlers={handlers}
          images={images}
          t={t}
          onVisit={onVisit}
        />
      }
    />
  );
}
