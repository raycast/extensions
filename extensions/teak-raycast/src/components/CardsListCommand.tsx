import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type CardSearchInput,
  type CardsResponse,
  getUserFacingErrorMessage,
  type RaycastCard,
  setCardFavorite,
} from "../lib/api";
import { getCardTitle } from "../lib/cardDetailModel";
import { getCardTypeIcon } from "../lib/cardIcons";
import { removeCardById, upsertCard } from "../lib/cardListState";
import {
  HIDDEN_CARDS_HINT,
  isHiddenTag,
  searchNamesHiddenTag,
  shouldCheckForHiddenCards,
} from "../lib/hiddenTags";
import {
  applySortFilter,
  applyTagFilter,
  clearSearchFilters,
  parseSearchFilters,
  toApiQuery,
} from "../lib/searchFilters";
import { newShuffleSeed } from "../lib/shuffleSeed";
import { useHiddenCardsHint } from "../lib/useHiddenCardsHint";
import { useTeakAuth } from "../lib/useTeakAuth";
import { CardListActions } from "./CardListActions";
import { getCardAccessories, getCardSubtitle } from "./cardListItem";
import { MissingApiKeyDetail } from "./MissingApiKeyDetail";
import { SetApiKeyAction } from "./SetApiKeyAction";
import { SignOutAction } from "./SignOutAction";

const PAGE_SIZE = 50;

interface CardsListCommandProps {
  /** Offers Save Search as Smart Folder; only the unscoped Search Cards list can save its whole search. */
  canSaveSmartFolder?: boolean;
  emptyDescription: string;
  emptyIcon: Icon;
  emptyTitle: string;
  latestSectionTitle: string;
  loadCards: (input: CardSearchInput) => Promise<CardsResponse>;
  navigationTitle: string;
  removeTagFilterFromList?: boolean;
  removeUnfavoritedFromList?: boolean;
  /** The tag this list is scoped to, so a hidden tag's list keeps its cards. */
  scopeTag?: string;
  searchBarPlaceholder: string;
  /** Keeps the API's own order (closest first) until a sort is typed. */
  serverOrder?: boolean;
}

// A whole number the API takes as a shuffle seed; the same seed gives the
// same order on every page.
export function CardsListCommand({
  canSaveSmartFolder = false,
  emptyDescription,
  emptyIcon,
  emptyTitle,
  latestSectionTitle,
  loadCards,
  navigationTitle,
  removeTagFilterFromList = false,
  removeUnfavoritedFromList = false,
  scopeTag,
  searchBarPlaceholder,
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
      if (generation === requestGeneration.current) {
        setError(getUserFacingErrorMessage(requestError));
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
    setItems((previous) => removeCardById(previous, cardId).cards);
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
      } catch {
        handleCardUpdated(card);
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
    return <List isLoading navigationTitle={navigationTitle} />;
  }

  if (!isAuthenticated) {
    return <MissingApiKeyDetail error={authError} onSignedIn={refreshAuth} />;
  }

  const isFiltered = Boolean(parsedFilters.rawQuery.trim());
  let title = isFiltered ? navigationTitle : latestSectionTitle;
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

  return (
    <List
      isLoading={isLoading}
      navigationTitle={title}
      onSearchTextChange={setQuery}
      pagination={{
        hasMore: Boolean(nextCursor),
        onLoadMore: () => void loadMore(),
        pageSize: PAGE_SIZE,
      }}
      searchBarPlaceholder={searchBarPlaceholder}
      searchText={query}
      throttle
    >
      {error ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  void load(requestInput);
                }}
                title="Retry"
              />
              {parsedFilters.hasExplicitFilters ? (
                <Action
                  icon={Icon.XMarkCircle}
                  onAction={() => {
                    setQuery((previous) => clearSearchFilters(previous));
                  }}
                  title="Clear Filters"
                />
              ) : null}
              <SetApiKeyAction />
              <SignOutAction onSignedOut={refreshAuth} />
            </ActionPanel>
          }
          description="Check your API key and network connection, then retry."
          icon={Icon.ExclamationMark}
          title={error}
        />
      ) : null}

      <List.Section
        subtitle={inTrash ? "Teak empties Trash after 30 days" : undefined}
        title={inTrash ? "Trash" : undefined}
      >
        {items.map((card) => (
          <List.Item
            accessories={getCardAccessories(card)}
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
            icon={getCardTypeIcon(card)}
            key={card.id}
            subtitle={getCardSubtitle(card)}
            title={getCardTitle(card)}
          />
        ))}
      </List.Section>

      {!(isLoading || error) && items.length === 0 ? (
        <List.EmptyView
          description={empty.description}
          icon={empty.icon}
          title={empty.title}
        />
      ) : null}
    </List>
  );
}
