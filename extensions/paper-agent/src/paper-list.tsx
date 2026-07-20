import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import { type Paper, renderPaperDetailMarkdown } from "./paper-utils";
import { useFavoritePapers } from "./favorite-utils";
import { getPaperStateKey, useReadPapers } from "./read-utils";
import { useReadingQueue } from "./reading-queue-utils";

const READ_AFTER_MS = 5000;

type SubtitleMode = "authors" | "date-and-authors";

function shortenTitle(title: string, maxLength = 56): string {
  return title.length > maxLength ? `${title.slice(0, maxLength - 1)}…` : title;
}

type PaperListViewProps = {
  papers: Paper[];
  emptyTitle: string;
  emptyDescription: string;
  subtitleMode: SubtitleMode;
  isLoading?: boolean;
  showOpenFavoritesAction?: boolean;
  showOpenQueueAction?: boolean;
  searchBarPlaceholder?: string;
  onSearchTextChange?: (text: string) => void;
};

function buildSubtitle(paper: Paper, subtitleMode: SubtitleMode): string | undefined {
  if (subtitleMode === "authors") {
    return paper.authors?.length ? paper.authors.join(", ") : undefined;
  }

  const subtitle = [paper.date, paper.authors?.length ? paper.authors.join(", ") : undefined]
    .filter(Boolean)
    .join(" · ");
  return subtitle || undefined;
}

async function toggleFavoritePaper(
  paper: Paper,
  isFavorite: boolean,
  addFavorite: (paper: Paper) => Promise<void>,
  removeFavorite: (paper: Paper) => Promise<void>,
): Promise<void> {
  try {
    if (isFavorite) {
      await removeFavorite(paper);
      await showToast({
        style: Toast.Style.Success,
        title: "Removed from favorites",
        message: paper.title,
      });
      return;
    }

    await addFavorite(paper);
    await showToast({
      style: Toast.Style.Success,
      title: "Added to favorites",
      message: paper.title,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: isFavorite ? "Failed to remove favorite" : "Failed to add favorite",
      message: error instanceof Error ? error.message : paper.title,
    });
  }
}

async function toggleReadPaper(
  paper: Paper,
  isRead: boolean,
  markAsRead: (paper: Paper) => Promise<void>,
  markAsUnread: (paper: Paper) => Promise<void>,
): Promise<void> {
  try {
    if (isRead) {
      await markAsUnread(paper);
      await showToast({
        style: Toast.Style.Success,
        title: "Marked as unread",
        message: paper.title,
      });
      return;
    }

    await markAsRead(paper);
    await showToast({
      style: Toast.Style.Success,
      title: "Marked as read",
      message: paper.title,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: isRead ? "Failed to mark as unread" : "Failed to mark as read",
      message: error instanceof Error ? error.message : paper.title,
    });
  }
}

async function toggleQueuePaper(
  paper: Paper,
  isQueued: boolean,
  addToQueue: (paper: Paper) => Promise<void>,
  removeFromQueue: (paper: Paper) => Promise<void>,
): Promise<void> {
  try {
    if (isQueued) {
      await removeFromQueue(paper);
      await showToast({
        style: Toast.Style.Success,
        title: "Removed from reading queue",
        message: paper.title,
      });
      return;
    }

    await addToQueue(paper);
    await showToast({
      style: Toast.Style.Success,
      title: "Added to reading queue",
      message: paper.title,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: isQueued ? "Failed to remove from reading queue" : "Failed to add to reading queue",
      message: error instanceof Error ? error.message : paper.title,
    });
  }
}

function PaperActions(props: {
  paper: Paper;
  isFavorite: boolean;
  isQueued: boolean;
  isRead: boolean;
  favoriteCount: number;
  queueCount: number;
  addFavorite: (paper: Paper) => Promise<void>;
  removeFavorite: (paper: Paper) => Promise<void>;
  addToQueue: (paper: Paper) => Promise<void>;
  removeFromQueue: (paper: Paper) => Promise<void>;
  markAsRead: (paper: Paper) => Promise<void>;
  markAsUnread: (paper: Paper) => Promise<void>;
  showOpenFavoritesAction: boolean;
  showOpenQueueAction: boolean;
}): ReactElement {
  const {
    paper,
    isFavorite,
    isQueued,
    isRead,
    favoriteCount,
    queueCount,
    addFavorite,
    removeFavorite,
    addToQueue,
    removeFromQueue,
    markAsRead,
    markAsUnread,
    showOpenFavoritesAction,
    showOpenQueueAction,
  } = props;

  return (
    <ActionPanel>
      {paper.link && <Action.OpenInBrowser url={paper.link} title="Open Paper" />}
      {paper.hasNote && <Action.Open title="Open Local Note" target={paper.notePath} />}
      {paper.relatedLocalPapers && paper.relatedLocalPapers.length > 0 && (
        <ActionPanel.Section title="Related Papers">
          {paper.relatedLocalPapers.map((related) =>
            related.hasNote && related.notePath ? (
              <Action.Open
                key={`related-note-${paper.id}-${related.id}`}
                title={`Open Related Note: ${shortenTitle(related.title)}`}
                target={related.notePath}
                icon={Icon.Document}
              />
            ) : related.link ? (
              <Action.OpenInBrowser
                key={`related-link-${paper.id}-${related.id}`}
                title={`Open Related Paper: ${shortenTitle(related.title)}`}
                url={related.link}
                icon={Icon.Link}
              />
            ) : null,
          )}
        </ActionPanel.Section>
      )}
      <Action
        title={isRead ? "Mark as Unread" : "Mark as Read"}
        icon={isRead ? Icon.Circle : Icon.CheckCircle}
        onAction={() => toggleReadPaper(paper, isRead, markAsRead, markAsUnread)}
      />
      <Action
        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        icon={isFavorite ? Icon.XMarkCircle : Icon.Star}
        onAction={() => toggleFavoritePaper(paper, isFavorite, addFavorite, removeFavorite)}
      />
      <Action
        title={isQueued ? "Remove from Reading Queue" : "Add to Reading Queue"}
        icon={isQueued ? Icon.XMarkCircle : Icon.List}
        onAction={() => toggleQueuePaper(paper, isQueued, addToQueue, removeFromQueue)}
      />
      {showOpenFavoritesAction && (
        <Action.Push
          title={favoriteCount > 0 ? `Open Favorites (${favoriteCount})` : "Open Favorites"}
          icon={Icon.Star}
          target={<FavoritePapersView />}
        />
      )}
      {showOpenQueueAction && (
        <Action.Push
          title={queueCount > 0 ? `Open Reading Queue (${queueCount})` : "Open Reading Queue"}
          icon={Icon.List}
          target={<ReadingQueueView />}
        />
      )}
    </ActionPanel>
  );
}

export function PaperListView({
  papers,
  emptyTitle,
  emptyDescription,
  subtitleMode,
  isLoading: externalIsLoading = false,
  showOpenFavoritesAction = true,
  showOpenQueueAction = true,
  searchBarPlaceholder,
  onSearchTextChange,
}: PaperListViewProps): ReactElement {
  const { favorites, isLoading, isFavorite, addFavorite, removeFavorite } = useFavoritePapers();
  const { queue, isLoading: isQueueLoading, isQueued, addToQueue, removeFromQueue } = useReadingQueue();
  const { isLoading: isReadLoading, isRead, markAsRead, markAsUnread } = useReadPapers();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const papersById = useMemo(() => new Map(papers.map((paper) => [getPaperStateKey(paper), paper])), [papers]);

  useEffect(() => {
    if (!selectedItemId) {
      return;
    }

    const selectedPaper = papersById.get(selectedItemId);
    if (!selectedPaper || isRead(selectedPaper)) {
      return;
    }

    const timer = setTimeout(() => {
      void markAsRead(selectedPaper);
    }, READ_AFTER_MS);

    return () => clearTimeout(timer);
  }, [selectedItemId, papersById, isRead, markAsRead]);

  return (
    <List
      isShowingDetail
      isLoading={externalIsLoading || isLoading || isQueueLoading || isReadLoading}
      searchBarPlaceholder={searchBarPlaceholder}
      onSearchTextChange={onSearchTextChange}
      onSelectionChange={setSelectedItemId}
    >
      {papers.length === 0 && <List.EmptyView title={emptyTitle} description={emptyDescription} />}
      {papers.map((paper) => {
        const favorite = isFavorite(paper);
        const read = isRead(paper);
        const subtitle = buildSubtitle(paper, subtitleMode);
        const accessories = [];

        accessories.push({
          icon: { source: read ? Icon.CheckCircle : Icon.Circle, tintColor: read ? Color.Green : Color.SecondaryText },
          tooltip: read ? "Read" : "Unread",
        });

        if (favorite) {
          accessories.push({
            icon: { source: Icon.Star, tintColor: Color.Yellow },
            tooltip: "In favorites",
          });
        }

        const queued = isQueued(paper);
        if (queued) {
          accessories.push({
            icon: { source: Icon.List, tintColor: Color.Blue },
            tooltip: "In reading queue",
          });
        }

        return (
          <List.Item
            id={getPaperStateKey(paper)}
            key={getPaperStateKey(paper)}
            title={paper.title}
            subtitle={subtitle}
            accessories={accessories}
            detail={<List.Item.Detail markdown={renderPaperDetailMarkdown(paper, paper.published ?? paper.date)} />}
            actions={
              <PaperActions
                paper={paper}
                isFavorite={favorite}
                isQueued={queued}
                isRead={read}
                favoriteCount={favorites.length}
                queueCount={queue.length}
                addFavorite={addFavorite}
                removeFavorite={removeFavorite}
                addToQueue={addToQueue}
                removeFromQueue={removeFromQueue}
                markAsRead={markAsRead}
                markAsUnread={markAsUnread}
                showOpenFavoritesAction={showOpenFavoritesAction}
                showOpenQueueAction={showOpenQueueAction}
              />
            }
          />
        );
      })}
    </List>
  );
}

export function FavoritePapersView(): ReactElement {
  const { favorites, isLoading, addFavorite, removeFavorite } = useFavoritePapers();
  const { queue, isLoading: isQueueLoading, isQueued, addToQueue, removeFromQueue } = useReadingQueue();
  const { isLoading: isReadLoading, isRead, markAsRead, markAsUnread } = useReadPapers();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const favoritesById = useMemo(() => new Map(favorites.map((paper) => [getPaperStateKey(paper), paper])), [favorites]);

  useEffect(() => {
    if (!selectedItemId) {
      return;
    }

    const selectedPaper = favoritesById.get(selectedItemId);
    if (!selectedPaper || isRead(selectedPaper)) {
      return;
    }

    const timer = setTimeout(() => {
      void markAsRead(selectedPaper);
    }, READ_AFTER_MS);

    return () => clearTimeout(timer);
  }, [selectedItemId, favoritesById, isRead, markAsRead]);

  return (
    <List
      isShowingDetail
      isLoading={isLoading || isQueueLoading || isReadLoading}
      onSelectionChange={setSelectedItemId}
    >
      {favorites.length === 0 && (
        <List.EmptyView
          title="No favorites yet"
          description="Add papers to favorites from Today Papers, Recent Papers, or Search Papers."
        />
      )}
      {favorites.map((paper) => (
        <List.Item
          id={getPaperStateKey(paper)}
          key={getPaperStateKey(paper)}
          title={paper.title}
          subtitle={buildSubtitle(paper, "date-and-authors")}
          accessories={[
            {
              icon: {
                source: isRead(paper) ? Icon.CheckCircle : Icon.Circle,
                tintColor: isRead(paper) ? Color.Green : Color.SecondaryText,
              },
              tooltip: isRead(paper) ? "Read" : "Unread",
            },
            {
              icon: { source: Icon.Star, tintColor: Color.Yellow },
              tooltip: "In favorites",
            },
          ]}
          detail={<List.Item.Detail markdown={renderPaperDetailMarkdown(paper, paper.published ?? paper.date)} />}
          actions={
            <PaperActions
              paper={paper}
              isFavorite
              isQueued={isQueued(paper)}
              isRead={isRead(paper)}
              favoriteCount={favorites.length}
              queueCount={queue.length}
              addFavorite={addFavorite}
              removeFavorite={removeFavorite}
              addToQueue={addToQueue}
              removeFromQueue={removeFromQueue}
              markAsRead={markAsRead}
              markAsUnread={markAsUnread}
              showOpenFavoritesAction={false}
              showOpenQueueAction={true}
            />
          }
        />
      ))}
    </List>
  );
}

export function ReadingQueueView(): ReactElement {
  const { queue, isLoading, isQueued, addToQueue, removeFromQueue } = useReadingQueue();
  const { favorites, isLoading: isFavoriteLoading, isFavorite, addFavorite, removeFavorite } = useFavoritePapers();
  const { isLoading: isReadLoading, isRead, markAsRead, markAsUnread } = useReadPapers();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const queueById = useMemo(() => new Map(queue.map((paper) => [getPaperStateKey(paper), paper])), [queue]);

  useEffect(() => {
    if (!selectedItemId) {
      return;
    }

    const selectedPaper = queueById.get(selectedItemId);
    if (!selectedPaper || isRead(selectedPaper)) {
      return;
    }

    const timer = setTimeout(() => {
      void markAsRead(selectedPaper);
    }, READ_AFTER_MS);

    return () => clearTimeout(timer);
  }, [selectedItemId, queueById, isRead, markAsRead]);

  return (
    <List
      isShowingDetail
      isLoading={isLoading || isFavoriteLoading || isReadLoading}
      onSelectionChange={setSelectedItemId}
    >
      {queue.length === 0 && (
        <List.EmptyView
          title="Reading queue is empty"
          description="Add papers to the reading queue from Today Papers, Recent Papers, Search Papers, or Favorites."
        />
      )}
      {queue.map((paper) => (
        <List.Item
          id={getPaperStateKey(paper)}
          key={getPaperStateKey(paper)}
          title={paper.title}
          subtitle={buildSubtitle(paper, "date-and-authors")}
          accessories={[
            {
              icon: {
                source: isRead(paper) ? Icon.CheckCircle : Icon.Circle,
                tintColor: isRead(paper) ? Color.Green : Color.SecondaryText,
              },
              tooltip: isRead(paper) ? "Read" : "Unread",
            },
            {
              icon: { source: Icon.List, tintColor: Color.Blue },
              tooltip: "In reading queue",
            },
            ...(isFavorite(paper)
              ? [
                  {
                    icon: { source: Icon.Star, tintColor: Color.Yellow },
                    tooltip: "In favorites",
                  },
                ]
              : []),
          ]}
          detail={<List.Item.Detail markdown={renderPaperDetailMarkdown(paper, paper.published ?? paper.date)} />}
          actions={
            <PaperActions
              paper={paper}
              isFavorite={isFavorite(paper)}
              isQueued={isQueued(paper)}
              isRead={isRead(paper)}
              favoriteCount={favorites.length}
              queueCount={queue.length}
              addFavorite={addFavorite}
              removeFavorite={removeFavorite}
              addToQueue={addToQueue}
              removeFromQueue={removeFromQueue}
              markAsRead={markAsRead}
              markAsUnread={markAsUnread}
              showOpenFavoritesAction={true}
              showOpenQueueAction={false}
            />
          }
        />
      ))}
    </List>
  );
}
