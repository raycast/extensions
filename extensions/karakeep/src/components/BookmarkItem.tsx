import { Action, ActionPanel, Icon, Image, List, showToast, Toast, useNavigation, Keyboard } from "@raycast/api";
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
import { Bookmark, Config, List as BookmarkListType } from "../types";
import { markdownImage } from "../utils/markdown";
import { getScreenshot } from "../utils/screenshot";
import { markToastFailed, toErrorMessage } from "../utils/toast";
import { BookmarkDetail } from "./BookmarkDetail";
import { BookmarkEdit } from "./BookmarkEdit";
import { NoteEdit } from "./NoteEdit";
import { AddToListSubmenu } from "./AddToListSubmenu";

const log = logger.child("[BookmarkItem]");
const { Metadata } = List.Item.Detail;

interface BookmarkItemProps {
  bookmark: Bookmark;
  config: Config;
  onRefresh: () => void;
  onCleanCache?: () => void;
  onVisit?: (bookmark: Bookmark) => void;
  isSelected?: boolean;
  /** Supplied by BookmarkList so the Add to List submenu costs one request per view, not per row. */
  lists?: BookmarkListType[];
  isLoadingLists?: boolean;
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
        log.error("Failed to get authenticated image", { assetId, error: toErrorMessage(error) });
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
      log.error("Failed to fetch latest bookmark", { bookmarkId: bookmark.id, error });
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
        log.error(`Bookmark action '${action}' failed`, error);
        markToastFailed(toast, toast.title, error);
        if (action !== "delete") {
          await fetchLatestBookmark();
        }
        throw error;
      }
    },
    [t, fetchLatestBookmark],
  );

  const handleDeleteBookmark = useCallback(async () => {
    log.info("Deleting bookmark", { bookmarkId: bookmark.id });
    await handleToast("delete", async () => {
      await fetchDeleteBookmark(bookmark.id);
      onRefresh();
    });
  }, [bookmark.id, handleToast, onRefresh]);

  const handleEditUpdate = useCallback(async () => {
    await fetchLatestBookmark();
  }, [fetchLatestBookmark]);

  const handleEdit = useCallback(() => {
    if (bookmark.content.type === "text") {
      push(<NoteEdit bookmark={bookmark} onRefresh={handleEditUpdate} />);
    } else {
      push(<BookmarkEdit bookmark={bookmark} onRefresh={handleEditUpdate} />);
    }
  }, [bookmark, handleEditUpdate, push]);

  const handleSummarize = useCallback(async () => {
    await handleToast("summarize", async () => {
      await fetchSummarizeBookmark(bookmark.id);
    });
  }, [bookmark.id, handleToast]);

  const handleUpdate = useCallback(
    async (options: { archived?: boolean; favourited?: boolean }) => {
      await handleToast("update", async () => {
        await fetchUpdateBookmark(bookmark.id, options);
      });
    },
    [bookmark.id, handleToast],
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
                icon={tag.attachedBy === "ai" ? Icon.Wand : undefined}
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
  lists,
  isLoadingLists,
}: {
  bookmark: Bookmark;
  config: Config;
  onRefresh: () => void;
  onCleanCache?: () => void;
  handlers: ReturnType<typeof useBookmarkHandlers>;
  images: ReturnType<typeof useBookmarkImages>;
  t: (key: string) => string;
  onVisit?: (bookmark: Bookmark) => void;
  lists?: BookmarkListType[];
  isLoadingLists?: boolean;
}) {
  const isNote = bookmark.content.type === "text";
  const editTitle = isNote ? t("notes.actions.edit") : t("bookmark.actions.edit");
  const deleteTitle = isNote ? t("notes.actions.delete") : t("bookmarkItem.actions.delete");
  const viewDetailTitle = isNote ? t("notes.actions.viewDetail") : t("bookmarkItem.actions.viewDetail");
  const copyNoteTitle = t("notes.actions.copy");

  const getMainAction = () => {
    const pushDetailAction = (
      <Action.Push
        icon={Icon.Sidebar}
        target={<BookmarkDetail bookmark={bookmark} onRefresh={onRefresh} lists={lists} />}
        title={viewDetailTitle}
      />
    );

    const editAction = (
      <Action
        icon={Icon.Pencil}
        title={editTitle}
        onAction={handlers.handleEdit}
        shortcut={Keyboard.Shortcut.Common.Edit}
      />
    );

    switch (bookmark.content.type) {
      case "link":
        if (bookmark.content.url) {
          const openInBrowserAction = (
            <Action.OpenInBrowser
              url={bookmark.content.url}
              title={t("bookmark.actions.openLink")}
              shortcut={Keyboard.Shortcut.Common.Open}
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
              title={copyNoteTitle}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }}
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
        {/* Open is skipped when it is ALREADY the main action, or the panel
            would list it twice. Copy is not a duplicate of anything, so it is
            gated separately — sharing one guard meant Copy disappeared for
            everyone on the default "Open in Browser" setting. */}
        {bookmark.content.type === "link" &&
          bookmark.content.url &&
          mainAction.props.title !== t("bookmark.actions.openLink") && (
            <Action.OpenInBrowser
              url={bookmark.content.url}
              title={t("bookmark.actions.openLink")}
              shortcut={Keyboard.Shortcut.Common.Open}
              onOpen={() => onVisit?.(bookmark)}
            />
          )}
        {bookmark.content.type === "link" && bookmark.content.url && (
          <Action.CopyToClipboard
            content={bookmark.content.url}
            title={t("bookmark.actions.copyLink")}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }}
            onCopy={() => onVisit?.(bookmark)}
          />
        )}
        {bookmark.content.type === "text" && bookmark.content.text && mainAction.props.title !== copyNoteTitle && (
          <Action.CopyToClipboard
            content={bookmark.content.text}
            title={copyNoteTitle}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }}
            onCopy={() => onVisit?.(bookmark)}
          />
        )}
        {bookmark.content.type === "asset" &&
          bookmark.content.assetType === "image" &&
          images.asset !== DEFAULT_SCREENSHOT_FILENAME &&
          mainAction.props.title !== t("bookmark.actions.viewImage") && (
            <Action.OpenInBrowser url={images.asset} title={t("bookmark.actions.viewImage")} />
          )}
        {/* Generic actions come after the type-specific ones: what you do with
            a bookmark's own content (open it, copy it) outranks what you do to
            the record. Whichever of these is the ↵ action is hoisted above and
            skipped here. */}
        {mainAction.props.title !== editTitle && (
          <Action
            icon={Icon.Pencil}
            title={editTitle}
            onAction={handlers.handleEdit}
            shortcut={Keyboard.Shortcut.Common.Edit}
          />
        )}
        {mainAction.props.title !== viewDetailTitle && (
          <Action.Push
            icon={Icon.Sidebar}
            target={<BookmarkDetail bookmark={bookmark} onRefresh={onRefresh} lists={lists} />}
            title={viewDetailTitle}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {bookmark.content.type === "link" && bookmark.content.url && (
          <>
            <Action
              title={t("bookmark.actions.aiSummary")}
              onAction={handlers.handleSummarize}
              icon={Icon.Wand}
              shortcut={{ macOS: { modifiers: ["ctrl"], key: "s" }, Windows: { modifiers: ["ctrl"], key: "s" } }}
            />
          </>
        )}
        {lists && lists.length > 0 && (
          <AddToListSubmenu bookmarkId={bookmark.id} lists={lists} isLoading={isLoadingLists} />
        )}
        <Action
          title={bookmark.favourited ? t("bookmark.actions.unfavorite") : t("bookmark.actions.favorite")}
          onAction={() => handlers.handleUpdate({ favourited: !bookmark.favourited })}
          icon={bookmark.favourited ? Icon.StarCircle : Icon.Star}
          shortcut={{ macOS: { modifiers: ["ctrl"], key: "f" }, Windows: { modifiers: ["ctrl"], key: "f" } }}
        />
        <Action
          title={bookmark.archived ? t("bookmark.actions.unarchive") : t("bookmark.actions.archive")}
          onAction={() => handlers.handleUpdate({ archived: !bookmark.archived })}
          icon={bookmark.archived ? Icon.BlankDocument : Icon.SaveDocument}
          shortcut={{ macOS: { modifiers: ["ctrl"], key: "a" }, Windows: { modifiers: ["ctrl"], key: "a" } }}
        />
        <Action
          icon={Icon.ArrowClockwise}
          title={t("bookmarkItem.actions.refresh")}
          onAction={onRefresh}
          shortcut={Keyboard.Shortcut.Common.Refresh}
        />
        {onCleanCache && (
          <Action
            icon={Icon.Trash}
            title={t("bookmarkItem.actions.clearCache")}
            onAction={onCleanCache}
            // Clearing every cached preview is a remove-all, not a copy. It sat on
            // Common.Copy because `ray lint --fix` matches the COMBO (⌘⇧C) rather
            // than the meaning — and re-applies that match, so writing the combo
            // out longhand does not survive the next `--fix`. The constant itself
            // has to be the right one. RemoveAll (⌃⇧D) does not clash with the
            // Delete action's Remove (⌃D) in this panel.
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {/* Submenu rather than three top-level actions: these are one-time
            setup steps, and flattening them pushed Delete off the visible
            portion of the panel. */}
        <ActionPanel.Submenu title={t("bookmarkItem.actions.addToBrowser")} icon={Icon.Globe}>
          <Action.OpenInBrowser
            title={t("bookmarkItem.actions.browsers.chrome")}
            url="https://chromewebstore.google.com/detail/karakeep/kgcjekpmcjjogibpjebkhaanilehneje"
            icon={Icon.Globe}
          />
          <Action.OpenInBrowser
            title={t("bookmarkItem.actions.browsers.firefox")}
            url="https://addons.mozilla.org/en-US/firefox/addon/karakeep/"
            icon={Icon.Globe}
          />
          <Action.OpenInBrowser
            title={t("bookmarkItem.actions.browsers.safari")}
            url="https://apps.apple.com/us/app/karakeep-app/id6479258022"
            icon={Icon.Globe}
          />
        </ActionPanel.Submenu>
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          icon={Icon.Trash}
          title={deleteTitle}
          style={Action.Style.Destructive}
          onAction={handlers.handleDeleteBookmark}
          shortcut={Keyboard.Shortcut.Common.Remove}
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
  lists,
  isLoadingLists,
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
          markdown={previewImage ? markdownImage(previewImage, getDisplayTitle(), { raycastWidth: 300 }) : ""}
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
          lists={lists}
          isLoadingLists={isLoadingLists}
        />
      }
    />
  );
}
