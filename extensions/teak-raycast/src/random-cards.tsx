import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { AccountActions } from "./components/AccountActions";
import { CardDetail } from "./components/CardDetail";
import { getCardAccessories, getCardSubtitle } from "./components/cardListItem";
import { MissingApiKeyDetail } from "./components/MissingApiKeyDetail";
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
import { getCardListIcon } from "./lib/cardIcons";
import { removeCardById } from "./lib/cardListState";
import { TEAK_HOME_URL } from "./lib/constants";
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
  // How many cards the last shuffle dealt, so an empty vault isn't "done".
  const [dealt, setDealt] = useState(0);

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
          setDealt(response.items.length);
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
    return (
      <List isLoading searchBarPlaceholder="Revisit a few cards you saved" />
    );
  }

  if (!isAuthenticated) {
    return <MissingApiKeyDetail error={authError} onSignedIn={refreshAuth} />;
  }

  const reshuffle = () => setSeed(newShuffleSeed());
  const deckActions = (
    <>
      <ActionPanel.Section>
        <Action
          icon={Icon.Shuffle}
          onAction={reshuffle}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          title="Shuffle Again"
        />
        <Action.OpenInBrowser
          icon={Icon.AppWindow}
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
      searchBarPlaceholder="Revisit a few cards you saved"
    >
      {error ? (
        <List.EmptyView
          actions={<ActionPanel>{deckActions}</ActionPanel>}
          description="Check your connection, then shuffle again."
          icon={Icon.ExclamationMark}
          title={error}
        />
      ) : null}
      {!(error || isLoading) && cards.length === 0 ? (
        <List.EmptyView
          actions={<ActionPanel>{deckActions}</ActionPanel>}
          description={
            dealt > 0
              ? "You've gone through this set. Shuffle for another."
              : "Save a few cards to Teak, then come back to revisit them."
          }
          icon={Icon.Shuffle}
          title={
            dealt > 0 ? "Nothing left to revisit" : "No cards to shuffle yet"
          }
        />
      ) : null}
      <List.Section
        subtitle={
          cards.length > 0 ? `${cards.length} of ${dealt} left` : undefined
        }
        title="Shuffled"
      >
        {cards.map((card) => {
          const openableUrl = getOpenableUrl(card);
          return (
            <List.Item
              accessories={getCardAccessories(card)}
              actions={
                <ActionPanel title={getCardTitle(card, 40)}>
                  <ActionPanel.Section>
                    <Action
                      icon={Icon.Checkmark}
                      onAction={() => void handleKeep(card)}
                      title="Keep"
                    />
                    <Action
                      icon={Icon.Box}
                      onAction={() => void archiveCard(card, handleUpdated)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      title="Archive"
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.Push
                      icon={Icon.Sidebar}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      target={
                        <CardDetail
                          card={card}
                          onCardDeleted={handleRemoved}
                          onCardUpdated={handleUpdated}
                          onNavigateBackAfterDelete={() => undefined}
                          onSignedOut={refreshAuth}
                        />
                      }
                      title="View Card"
                    />
                    {openableUrl ? (
                      <Action.OpenInBrowser
                        shortcut={{
                          modifiers: ["cmd", "shift"],
                          key: "return",
                        }}
                        title="Open URL"
                        url={openableUrl}
                      />
                    ) : null}
                    <Action.OpenInBrowser
                      icon={Icon.AppWindow}
                      shortcut={Keyboard.Shortcut.Common.Open}
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
                      title="More Like This"
                    />
                  </ActionPanel.Section>
                  {deckActions}
                </ActionPanel>
              }
              icon={getCardListIcon(card)}
              key={card.id}
              subtitle={getCardSubtitle(card)}
              title={getCardTitle(card)}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
