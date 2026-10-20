import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { CardDetail } from "./components/CardDetail";
import { getCardAccessories, getCardSubtitle } from "./components/cardListItem";
import { MissingApiKeyDetail } from "./components/MissingApiKeyDetail";
import { SetApiKeyAction } from "./components/SetApiKeyAction";
import { SignOutAction } from "./components/SignOutAction";
import { SimilarCardsView } from "./components/SimilarCardsView";
import {
  getUserFacingErrorMessage,
  type RaycastCard,
  searchCards,
} from "./lib/api";
import { archiveCard } from "./lib/cardActions";
import {
  getCardTitle,
  getOpenableUrl,
  getTeakUrl,
} from "./lib/cardDetailModel";
import { getCardTypeIcon } from "./lib/cardIcons";
import { removeCardById } from "./lib/cardListState";
import { newShuffleSeed } from "./lib/shuffleSeed";
import { useTeakAuth } from "./lib/useTeakAuth";

const DECK_SIZE = 20;

export default function RandomCardsCommand() {
  const {
    isAuthenticated,
    error: authError,
    isLoading: isCheckingAuth,
    refresh: refreshAuth,
  } = useTeakAuth();

  const [cards, setCards] = useState<RaycastCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(newShuffleSeed);

  useEffect(() => {
    if (isCheckingAuth) {
      return;
    }
    if (!isAuthenticated) {
      setCards([]);
      setIsLoading(false);
      return;
    }
    let isCurrent = true;
    setIsLoading(true);
    setError(null);
    searchCards(
      { limit: DECK_SIZE, shuffleSeed: seed, sort: "shuffle" },
      "interactive",
    )
      .then((response) => {
        if (isCurrent) {
          setCards(response.items);
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(getUserFacingErrorMessage(requestError));
          setCards([]);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [isCheckingAuth, isAuthenticated, seed]);

  const handleRemoved = useCallback((cardId: string) => {
    setCards((previous) => removeCardById(previous, cardId).cards);
  }, []);

  // Archiving or keeping a card moves on to the next one.
  const handleUpdated = useCallback(
    (next: RaycastCard) => {
      if (next.isArchived || next.isDeleted || next.isHidden) {
        handleRemoved(next.id);
        return;
      }
      setCards((previous) =>
        previous.some((card) => card.id === next.id)
          ? previous.map((card) => (card.id === next.id ? next : card))
          : [next, ...previous],
      );
    },
    [handleRemoved],
  );

  const handleKeep = useCallback(
    async (card: RaycastCard) => {
      handleRemoved(card.id);
      await showToast({ style: Toast.Style.Success, title: "Kept" });
    },
    [handleRemoved],
  );

  if (isCheckingAuth) {
    return <List isLoading navigationTitle="Random Teak Cards" />;
  }

  if (!isAuthenticated) {
    return <MissingApiKeyDetail error={authError} onSignedIn={refreshAuth} />;
  }

  const reshuffle = () => setSeed(newShuffleSeed());

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Random Teak Cards"
      searchBarPlaceholder="Revisit a few cards you saved"
    >
      {error ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowClockwise}
                onAction={reshuffle}
                title="Try Again"
              />
            </ActionPanel>
          }
          description="Check your API key and network connection, then retry."
          icon={Icon.ExclamationMark}
          title={error}
        />
      ) : null}
      {!(error || isLoading) && cards.length === 0 ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Shuffle}
                onAction={reshuffle}
                title="Shuffle Again"
              />
            </ActionPanel>
          }
          description="You've gone through this set. Shuffle for another."
          icon={Icon.Shuffle}
          title="Nothing left to revisit"
        />
      ) : null}
      {cards.map((card) => {
        const openableUrl = getOpenableUrl(card);
        return (
          <List.Item
            accessories={getCardAccessories(card)}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Checkmark}
                  onAction={() => void handleKeep(card)}
                  title="Keep"
                />
                <Action
                  icon={Icon.Box}
                  onAction={() => void archiveCard(card, handleUpdated)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  title="Archive Card"
                />
                <Action.Push
                  icon={Icon.Eye}
                  target={
                    <CardDetail
                      card={card}
                      onCardDeleted={handleRemoved}
                      onCardUpdated={handleUpdated}
                      onFilterByTag={() => undefined}
                      onNavigateBackAfterDelete={() => undefined}
                    />
                  }
                  title="View Card"
                />
                {openableUrl ? (
                  <Action.OpenInBrowser title="Open URL" url={openableUrl} />
                ) : null}
                <Action.OpenInBrowser
                  title="Open in Teak"
                  url={getTeakUrl(card)}
                />
                <Action.Push
                  icon={Icon.Stars}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  target={
                    <SimilarCardsView
                      cardId={card.id}
                      title={getCardTitle(card)}
                    />
                  }
                  title="Find Similar"
                />
                <Action
                  icon={Icon.Shuffle}
                  onAction={reshuffle}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  title="Shuffle Again"
                />
                <SetApiKeyAction />
                <SignOutAction onSignedOut={refreshAuth} />
              </ActionPanel>
            }
            icon={getCardTypeIcon(card)}
            key={card.id}
            subtitle={getCardSubtitle(card)}
            title={getCardTitle(card)}
          />
        );
      })}
    </List>
  );
}
