import { Action, ActionPanel, Grid, Icon, List } from '@raycast/api';
import { usePromise } from '@raycast/utils';
import { useEffect, useState } from 'react';
import { CardDetailView } from './components/card-detail-view';
import { Card, CardSlot } from './types/types';
import { gethsguruBestDecks } from './utils/hsguru';
import {
  classIcon,
  ellipsize,
  findCard,
  formatDust,
  formatWinrate,
  getAmountEmoji,
  getLocalCardData,
  getRarityColor,
} from './utils/utils';

export default function Command() {
  const [format, setFormat] = useState(1);
  const { data: decks, isLoading: decksLoading } = usePromise(gethsguruBestDecks, [format]);

  const [cardData, setCardData] = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  useEffect(() => {
    const loadCardData = async () => {
      try {
        const data = await getLocalCardData();
        setCardData(data);
        setCardsLoading(false);
      } catch (error) {
        console.error('Error loading card data:', error);
        setCardsLoading(false);
      }
    };

    loadCardData();
  }, []);

  const isLoading = decksLoading || cardsLoading;

  return (
    <Grid
      isLoading={isLoading}
      columns={5}
      inset={Grid.Inset.Medium}
      aspectRatio="1"
      fit={Grid.Fit.Fill}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Select Format" onChange={(value) => setFormat(Number(value))}>
          <Grid.Dropdown.Section title="Game Mode">
            <Grid.Dropdown.Item title="Wild" value="1" />
            <Grid.Dropdown.Item title="Standard" value="2" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {decks?.map((deck) => (
        <Grid.Item
          key={deck.code}
          content={{
            source: classIcon(deck.className).source,
            tintColor: null,
          }}
          title={ellipsize(deck.title, 10)}
          subtitle={`▲ ${formatWinrate(deck.winrate)}    ♦ ${formatDust(deck.dust)}`}
          actions={
            <ActionPanel title={deck.title}>
              <ActionPanel.Section>
                <Action.Push
                  title="Show Deck Details"
                  target={
                    <DeckDetails
                      title={deck.title}
                      slots={deck.slots}
                      cardData={cardData}
                      deckCode={deck.code}
                      className={deck.className}
                      format={format}
                    />
                  }
                />
                <Action.CopyToClipboard content={deck.code} title="Copy Deck Code" />
                <Action.OpenInBrowser url={`https://www.hsguru.com/decks?format=${format}`} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

function DeckDetails({
  title,
  slots,
  cardData,
  deckCode,
  className,
}: {
  title: string;
  slots: CardSlot[];
  cardData: Card[];
  deckCode: string;
  className: string;
  format: number;
}) {
  return (
    <List searchBarPlaceholder={`Browsing cards in: ${title}`}>
      <List.Section title={title} subtitle={`Class: ${className}`}>
        {slots.map((slot, index) => {
          // 使用 ID 优先匹配
          const card = findCard(
            slot.card.name,
            cardData,
            // 尝试从 slot 中获取 ID（如果有的话）
            slot.card.id,
          );

          const rarityText = slot.card.rarity || 'Unknown';

          return (
            <List.Item
              key={index}
              icon={{
                source: Icon.CircleFilled,
                tintColor: getRarityColor(rarityText),
              }}
              title={`${slot.card.name}`}
              accessories={[
                { text: rarityText },
                { text: `♦${(slot.card.mana ?? 0).toString().padStart(3, '0')}` },
                { text: getAmountEmoji(slot.amount) },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Card Details"
                    target={<CardDetailView slot={slot} card={card || null} deckCode={deckCode} />}
                    icon={Icon.Eye}
                  />
                  <Action.CopyToClipboard content={deckCode} title="Copy Deck Code" />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
