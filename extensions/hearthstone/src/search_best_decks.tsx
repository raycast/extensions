import { Action, ActionPanel, Grid, Icon, List } from '@raycast/api';
import { usePromise } from '@raycast/utils';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { CardDetailView } from './CardDetailView';
import { CardSlot } from './domain';
import { gethsguruBestDecks } from './hsguru';
import { classIcon, ellipsize, formatDust, formatWinrate, getLocalCardData, getRarityColor, type Card } from './utils';

export default function Command() {
  const [format, setFormat] = useState(1);
  const { data: decks, isLoading: decksLoading } = usePromise(gethsguruBestDecks, [format]);

  const [cardData, setCardData] = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  useEffect(() => {
    const loadCardData = async () => {
      try {
        let data = await getLocalCardData();

        if (!data || data.length === 0) {
          console.log('Fetching card data from API...');
          const response = await axios.get('https://api.hearthstonejson.com/v1/latest/enUS/cards.json');
          data = response.data;
        }

        setCardData(data as Card[]);
      } catch (error) {
        console.error('Error loading card data:', error);
      } finally {
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
          subtitle={`[↑]${formatWinrate(deck.winrate)}  [☺]${formatDust(deck.dust)}`}
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
  format,
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
          // 查找卡牌数据
          let card = cardData.find((c) => c.name?.toLowerCase() === slot.card.title.toLowerCase());

          if (!card) {
            card = cardData.find(
              (c) =>
                c.name &&
                slot.card.title &&
                (c.name.toLowerCase().includes(slot.card.title.toLowerCase()) ||
                  slot.card.title.toLowerCase().includes(c.name.toLowerCase())),
            );
          }

          // 创建卡牌稀有度显示
          const rarityText = slot.card.rarity || 'Unknown';

          return (
            <List.Item
              key={index}
              icon={{
                source: Icon.CircleFilled,
                tintColor: getRarityColor(rarityText),
              }}
              title={`${slot.card.title} [♦]  ${slot.card.mana}`}
              subtitle={`[♠] ${slot.amount}`}
              accessories={[{ text: rarityText }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Card Details"
                    target={<CardDetailView slot={slot} card={card || null} deckCode={deckCode} />}
                    icon={Icon.Eye}
                  />
                  <Action.CopyToClipboard content={deckCode} title="Copy Deck Code" />
                  <Action.OpenInBrowser url={`https://www.hsguru.com/decks?format=${format}`} title="Open in HSGuru" />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
