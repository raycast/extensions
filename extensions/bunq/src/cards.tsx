/**
 * Cards command for managing bunq debit and virtual cards.
 */

import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { useBunqSession, withSessionRefresh } from "./hooks/useBunqSession";
import { getCards, type Card } from "./api/endpoints";
import { ErrorView } from "./components";
import {
  CardListItem,
  getCardName,
  isCardActive,
  isCardExpired,
  getCardCategoryLabel,
  groupCardsByCategory,
} from "./components/cards";
import { getErrorMessage } from "./lib/errors";

// ============== Archived Cards Lists ==============

function ReplacedCardsList({ cards, session }: { cards: Card[]; session: ReturnType<typeof useBunqSession> }) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  return (
    <List navigationTitle="Replaced Cards" isShowingDetail onSelectionChange={(id) => setSelectedCardId(id || null)}>
      {cards.map((card) => (
        <CardListItem
          key={card.id}
          card={card}
          userId={session.userId!}
          session={session}
          onUpdate={() => {}}
          isSelected={selectedCardId === card.id.toString()}
        />
      ))}
    </List>
  );
}

function ExpiredCardsList({ cards, session }: { cards: Card[]; session: ReturnType<typeof useBunqSession> }) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  return (
    <List navigationTitle="Expired Cards" isShowingDetail onSelectionChange={(id) => setSelectedCardId(id || null)}>
      {cards.map((card) => (
        <CardListItem
          key={card.id}
          card={card}
          userId={session.userId!}
          session={session}
          onUpdate={() => {}}
          isSelected={selectedCardId === card.id.toString()}
        />
      ))}
    </List>
  );
}

// ============== Main Command ==============

export default function CardsCommand() {
  const session = useBunqSession();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const { push } = useNavigation();

  const {
    data: cards,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async (): Promise<Card[]> => {
      if (!session.userId || !session.sessionToken) return [];
      return withSessionRefresh(session, () => getCards(session.userId!, session.getRequestOptions()));
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  if (session.isLoading) {
    return <List isLoading />;
  }

  if (session.error || error) {
    return (
      <ErrorView
        title="Error Loading Cards"
        message={getErrorMessage(session.error || error)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  // Deduplicate by card ID and sort alphabetically
  const uniqueCards = cards
    ? [...new Map(cards.map((card) => [card.id, card])).values()].sort((a, b) =>
        getCardName(a).localeCompare(getCardName(b)),
      )
    : [];

  // Active cards: status is active/none AND not expired
  const activeCards = uniqueCards.filter((card) => isCardActive(card) && !isCardExpired(card));
  // Expired cards: past expiry date (regardless of status)
  const expiredCards = uniqueCards.filter((card) => isCardExpired(card));
  // Replaced cards: inactive status (not active/none) and not expired
  const replacedCards = uniqueCards.filter((card) => !isCardActive(card) && !isCardExpired(card));

  // Group active cards by category (Physical/Debit, Virtual/Credit, etc.)
  const groupedActiveCards = groupCardsByCategory(activeCards);

  return (
    <List isLoading={isLoading} isShowingDetail onSelectionChange={(id) => setSelectedCardId(id || null)}>
      {uniqueCards.length === 0 && (
        <List.EmptyView icon={Icon.CreditCard} title="No Cards" description="You don't have any cards yet" />
      )}
      {Array.from(groupedActiveCards.entries()).map(([category, cardsInGroup]) => (
        <List.Section key={category} title={getCardCategoryLabel(category)}>
          {cardsInGroup.map((card) => (
            <CardListItem
              key={card.id}
              card={card}
              userId={session.userId!}
              session={session}
              onUpdate={revalidate}
              isSelected={selectedCardId === card.id.toString()}
            />
          ))}
        </List.Section>
      ))}
      {(expiredCards.length > 0 || replacedCards.length > 0) && (
        <List.Section title="Archived">
          {expiredCards.length > 0 && (
            <List.Item
              id="expired-cards"
              title="Expired Cards"
              subtitle={`${expiredCards.length} card${expiredCards.length !== 1 ? "s" : ""}`}
              icon={{ source: Icon.Clock, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action
                    title="View Expired Cards"
                    icon={Icon.List}
                    onAction={() => push(<ExpiredCardsList cards={expiredCards} session={session} />)}
                  />
                </ActionPanel>
              }
            />
          )}
          {replacedCards.length > 0 && (
            <List.Item
              id="replaced-cards"
              title="Replaced Cards"
              subtitle={`${replacedCards.length} card${replacedCards.length !== 1 ? "s" : ""}`}
              icon={{ source: Icon.Switch, tintColor: Color.Orange }}
              actions={
                <ActionPanel>
                  <Action
                    title="View Replaced Cards"
                    icon={Icon.List}
                    onAction={() => push(<ReplacedCardsList cards={replacedCards} session={session} />)}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}
    </List>
  );
}
