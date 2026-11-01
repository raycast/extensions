import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type CardSearchInput,
  type CardsResponse,
  getUserFacingErrorMessage,
  type RaycastCard,
  setCardFavorite,
} from "../lib/api";
import { failureMessage } from "../lib/cardActions";
import { getCardTitle } from "../lib/cardDetailModel";
import { getCardListIcon } from "../lib/cardIcons";
import { removeCardById, upsertCard } from "../lib/cardListState";
import { TEAK_HOME_URL } from "../lib/constants";
import {
  HIDDEN_CARDS_HINT,
  isHiddenTag,
  searchNamesHiddenTag,
  shouldCheckForHiddenCards,
} from "../lib/hiddenTags";
import {
  applyArchivedFilter,
  applySortFilter,
  applyTagFilter,
  applyTrashedFilter,
  applyTypeFilter,
  clearSearchFilters,
  parseSearchFilters,
  toApiQuery,
} from "../lib/searchFilters";
import { newShuffleSeed } from "../lib/shuffleSeed";
import { useHiddenCardsHint } from "../lib/useHiddenCardsHint";
import { useTeakAuth } from "../lib/useTeakAuth";
import { AccountActions } from "./AccountActions";
import { CardListActions } from "./CardListActions";
import { CardTypeDropdown } from "./CardTypeDropdown";
import { getCardAccessories, getCardSubtitle } from "./cardListItem";
import { MissingApiKeyDetail } from "./MissingApiKeyDetail";

const PAGE_SIZE = 50;

interface CardsListCommandProps {
  /** Offers Save Search as Smart Folder; only the unscoped Search Cards list can save its whole search. */
  canSaveSmartFolder?: boolean;
  emptyDescription: string;
  emptyIcon: Icon;
  emptyTitle: string;
  loadCards: (input: CardSearchInput) => Promise<CardsResponse>;
  /** Only for pushed lists; a root command keeps Raycast's own title. */
  navigationTitle?: string;
  removeTagFilterFromList?: boolean;
  removeUnfavoritedFromList?: boolean;
  /** The tag this list is scoped to, so a hidden tag's list keeps its cards. */
  scopeTag?: string;
  searchBarPlaceholder: string;
  /** Heads the list until a search or filter is typed. */
  sectionTitle: string;
  /** Keeps the API's own order (closest first) until a sort is typed. */
  serverOrder?: boolean;
}

const countLabel = (count: number, hasMore: boolean): string =>
  `${count}${hasMore ? "+" : ""} card${count === 1 && !hasMore ? "" : "s"}`;

// A whole number the API takes as a shuffle seed; the same seed gives the
// same order on every page.
export function CardsListCommand({
  canSaveSmartFolder = false,
  emptyDescription,
  emptyIcon,
  emptyTitle,
  loadCards,
  navigationTitle,
  removeTagFilterFromList = false,
  removeUnfavoritedFromList = false,
  scopeTag,
  searchBarPlaceholder,
  sectionTitle,
  serverOrder = false,
}: CardsListCommandProps) {
  const [query, setQuery] = useState("");
  const [shuffleSeed, setShuffleSeed] = useState(newShuffleSeed);
  const [similarity, setSimilarity] = useState<CardsResponse["similarity"]>();
  const [items, setItems] = useState<RaycastCard[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  // Where each card sat when it left the list, so Undo puts it back there.
  const removedAt = useRef(new Map<string, number>());

  const {
    isAuthenticated,
    error: authError,
    isLoading: isCheckingAuth,
    refresh: refreshAuth,
  } = useTeakAuth();

  const parsedFilters = useMemo(() => parseSearchFilters(query), [query]);
  const requestInput = useMemo<CardSearchInput>(
    () => ({
      archived: parsedFilters.archived ? "only" : undefined,
      createdAfter: parsedFilters.createdAfter,
      createdBefore: parsedFilters.createdBefore,
      favorited:
        removeUnfavoritedFromList || parsedFilters.favorited ? true : undefined,
      hex: parsedFilters.hex,
      hue: parsedFilters.hue,
      limit: PAGE_SIZE,
      query: toApiQuery(parsedFilters),
      shuffleSeed: parsedFilters.sort === "shuffle" ? shuffleSeed : undefined,
      sort:
        parsedFilters.sort ??
        (serverOrder || parsedFilters.like ? undefined : "newest"),
      style: parsedFilters.style,
      tag: parsedFilters.tag,
      trashed: parsedFilters.trashed,
      type: parsedFilters.type,
    }),
    [parsedFilters, removeUnfavoritedFromList, serverOrder, shuffleSeed],
  );

  const load = useCallback(
    async (input: CardSearchInput) => {
      const generation = ++requestGeneration.current;
      setIsLoading(true);
      setError(null);

      try {
        const response = await loadCards(input);
        if (generation === requestGeneration.current) {
          // A new page has its own order, so old Undo positions no longer fit.
          removedAt.current.clear();
          setItems(response.items);
          setNextCursor(response.nextCursor);
          setSimilarity(response.similarity);
        }
      } catch (requestError) {
        if (generation === requestGeneration.current) {
          setError(getUserFacingErrorMessage(requestError));
          setItems([]);
          setNextCursor(null);
          setSimilarity(undefined);
        }
      } finally {
        if (generation === requestGeneration.current) {
          setIsLoading(false);
        }
      }
    },
    [loadCards],
  );

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoading) {
      return;
    }
    const generation = requestGeneration.current;
    setIsLoading(true);
    try {
      const response = await loadCards({ ...requestInput, cursor: nextCursor });
      if (generation === requestGeneration.current) {
        setItems((previous) => {
          const seen = new Set(previous.map((card) => card.id));
          return [
            ...previous,
            ...response.items.filter((card) => !seen.has(card.id)),
          ];
        });
        setNextCursor(response.nextCursor);
      }
    } catch (requestError) {
      // The cards already shown stay; only an empty list shows the error view.
      if (generation === requestGeneration.current) {
        await showToast({
          message: failureMessage(requestError),
          style: Toast.Style.Failure,
          title: "Couldn't load more cards",
        });
      }
    } finally {
      if (generation === requestGeneration.current) {
        setIsLoading(false);
      }
    }
  }, [isLoading, loadCards, nextCursor, requestInput]);

  useEffect(() => {
    if (isCheckingAuth) {
      return;
    }

    if (!isAuthenticated) {
      setItems([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    void load(requestInput);
  }, [isCheckingAuth, isAuthenticated, load, requestInput]);

  const showsHiddenCards =
    searchNamesHiddenTag(parsedFilters) || isHiddenTag(scopeTag);
  const archivedView = Boolean(parsedFilters.archived);
  const inTrash = Boolean(parsedFilters.trashed);
  let doneView: "done" | "todo" | undefined;
  if (parsedFilters.done) {
    doneView = "done";
  } else if (parsedFilters.todo) {
    doneView = "todo";
  }

  const handleCardUpdated = useCallback(
    (next: RaycastCard) => {
      setItems((previous) => {
        const index = previous.findIndex((card) => card.id === next.id);
        const updated = upsertCard(previous, next, {
          archivedView: inTrash ? undefined : archivedView,
          doneView,
          insertIndex: removedAt.current.get(next.id),
          removeWhenHidden: !showsHiddenCards,
          removeWhenUnfavorited: removeUnfavoritedFromList,
        });
        if (index !== -1 && !updated.some((card) => card.id === next.id)) {
          removedAt.current.set(next.id, index);
        } else {
          removedAt.current.delete(next.id);
        }
        return updated;
      });
    },
    [
      archivedView,
      doneView,
      inTrash,
      removeUnfavoritedFromList,
      showsHiddenCards,
    ],
  );

  const handleCardRemoved = useCallback((cardId: string) => {
    setItems((previous) => {
      const index = previous.findIndex((card) => card.id === cardId);
      if (index !== -1) {
        removedAt.current.set(cardId, index);
      }
      return removeCardById(previous, cardId).cards;
    });
  }, []);

  const handleFilterByTag = useCallback((tag: string) => {
    setQuery((previous) => applyTagFilter(previous, tag));
  }, []);

  const handleShuffle = useCallback(() => {
    setShuffleSeed(newShuffleSeed());
    setQuery((previous) => applySortFilter(previous, "shuffle"));
  }, []);

  const handleToggleFavorite = useCallback(
    async (card: RaycastCard) => {
      const previousState = card.isFavorited;
      handleCardUpdated({ ...card, isFavorited: !previousState });

      try {
        handleCardUpdated(
          await setCardFavorite(card.id, !previousState, "interactive"),
        );
      } catch (error) {
        handleCardUpdated(card);
        await showToast({
          message: failureMessage(error),
          style: Toast.Style.Failure,
          title: "Favorite update failed",
        });
      }
    },
    [handleCardUpdated],
  );

  const showHiddenCardsHint = useHiddenCardsHint(
    isAuthenticated &&
      !(isLoading || error) &&
      items.length === 0 &&
      shouldCheckForHiddenCards(parsedFilters),
  );

  if (isCheckingAuth) {
    return (
      <List
        isLoading
        navigationTitle={navigationTitle}
        onSearchTextChange={setQuery}
        searchBarPlaceholder={searchBarPlaceholder}
        searchText={query}
      />
    );
  }

  if (!isAuthenticated) {
    return <MissingApiKeyDetail error={authError} onSignedIn={refreshAuth} />;
  }

  const isFiltered = Boolean(parsedFilters.rawQuery.trim());
  let title = isFiltered ? "Results" : sectionTitle;
  let empty = isFiltered
    ? {
        description: "Try a different keyword or clear your filters.",
        icon: emptyIcon,
        title: "No matching cards",
      }
    : { description: emptyDescription, icon: emptyIcon, title: emptyTitle };
  if (archivedView && !inTrash) {
    title = "Archive";
    empty = {
      description: "Cards you archive stay here, out of your library.",
      icon: Icon.Box,
      title: "Nothing archived",
    };
  }
  if (inTrash) {
    title = "Trash";
    empty = {
      description: "Cards you move to Trash show up here for 30 days.",
      icon: Icon.Trash,
      title: "Trash is empty",
    };
  }
  if (similarity === "pending") {
    empty = {
      description: "Teak is still reading this card. Try again in a moment.",
      icon: Icon.Clock,
      title: "Finding similar cards",
    };
  } else if (similarity === "unavailable") {
    empty = {
      description: "The card is in Trash or no longer exists.",
      icon: Icon.ExclamationMark,
      title: "No similar cards",
    };
  }
  if (showHiddenCardsHint) {
    empty = { ...empty, description: HIDDEN_CARDS_HINT };
  }

  const hasMore = Boolean(nextCursor);
  const subtitle =
    items.length > 0
      ? [
          countLabel(items.length, hasMore),
          inTrash ? "emptied after 30 days" : undefined,
        ]
          .filter(Boolean)
          .join(" · ")
      : undefined;

  // An empty list has no card to hold the filter and account actions, so it
  // carries its own way back.
  const recoveryActions = (
    <>
      <ActionPanel.Section>
        {inTrash ? (
          <Action
            icon={Icon.ArrowLeft}
            onAction={() =>
              setQuery((previous) => applyTrashedFilter(previous, undefined))
            }
            title="Leave Trash"
          />
        ) : null}
        {archivedView && !inTrash ? (
          <Action
            icon={Icon.ArrowLeft}
            onAction={() =>
              setQuery((previous) => applyArchivedFilter(previous, undefined))
            }
            title="Leave Archive"
          />
        ) : null}
        {parsedFilters.hasExplicitFilters ? (
          <Action
            icon={Icon.XMarkCircle}
            onAction={() =>
              setQuery((previous) => clearSearchFilters(previous))
            }
            title="Clear Filters"
          />
        ) : null}
        <Action
          icon={Icon.ArrowClockwise}
          onAction={() => void load(requestInput)}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          title="Reload"
        />
        <Action.OpenInBrowser
          shortcut={Keyboard.Shortcut.Common.Open}
          title="Open Teak"
          url={TEAK_HOME_URL}
        />
      </ActionPanel.Section>
      <AccountActions onSignedOut={refreshAuth} />
    </>
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      onSearchTextChange={setQuery}
      pagination={{
        hasMore,
        onLoadMore: () => void loadMore(),
        pageSize: PAGE_SIZE,
      }}
      searchBarAccessory={
        <CardTypeDropdown
          onChange={(type) =>
            setQuery((previous) => applyTypeFilter(previous, type))
          }
          type={parsedFilters.type}
        />
      }
      searchBarPlaceholder={searchBarPlaceholder}
      searchText={query}
      throttle
    >
      {error ? (
        <List.EmptyView
          actions={<ActionPanel>{recoveryActions}</ActionPanel>}
          description="Check your connection, then reload."
          icon={Icon.ExclamationMark}
          title={error}
        />
      ) : null}

      <List.Section subtitle={subtitle} title={title}>
        {items.map((card) => (
          <List.Item
            accessories={getCardAccessories(card, {
              inArchive: archivedView && !inTrash,
              inFavorites: removeUnfavoritedFromList,
            })}
            actions={
              <CardListActions
                canSaveSmartFolder={canSaveSmartFolder}
                card={card}
                filters={parsedFilters}
                inTrash={inTrash}
                keepNewestSort={serverOrder}
                onCardRemoved={handleCardRemoved}
                onCardUpdated={handleCardUpdated}
                onFilterByTag={handleFilterByTag}
                onQueryChange={setQuery}
                onShuffle={handleShuffle}
                onSignedOut={refreshAuth}
                onToggleFavorite={(next) => void handleToggleFavorite(next)}
                removeTagFilterFromList={removeTagFilterFromList}
                showFavoritesFilter={!removeUnfavoritedFromList}
              />
            }
            icon={getCardListIcon(card)}
            id={card.id}
            key={card.id}
            subtitle={getCardSubtitle(card)}
            title={getCardTitle(card)}
          />
        ))}
      </List.Section>

      {!(isLoading || error) && items.length === 0 ? (
        <List.EmptyView
          actions={<ActionPanel>{recoveryActions}</ActionPanel>}
          description={empty.description}
          icon={empty.icon}
          title={empty.title}
        />
      ) : null}
    </List>
  );
}
