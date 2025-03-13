import { Action, ActionPanel, Grid, Icon, List } from '@raycast/api';
import { usePromise } from '@raycast/utils';
import { useEffect, useState } from 'react';
import { Card, DeckDetailsProps, DeckListProps } from '../types/types';
import { gethsguruBestDecks, gethsguruBestDecksByClass } from '../utils/hsguru';
import {
  classIcon,
  ellipsize,
  findCard,
  formatDust,
  formatWinrate,
  getAmountEmoji,
  getLocalCardData,
  getRarityColor,
} from '../utils/utils';
import { CardDetailView } from './card-detail-view';

export const DeckList: React.FC<DeckListProps> = ({ className, format = 1, minGames }) => {
  const { data: decks, isLoading: decksLoading } = className
    ? usePromise(gethsguruBestDecksByClass, [className, format, minGames], {})
    : usePromise(gethsguruBestDecks, [format], {});

  // 使用本地卡牌数据
  const [cardData, setCardData] = useState<Card[]>([]);

  const [cardsLoading, setCardsLoading] = useState(true);

  useEffect(() => {
    const loadCardData = async () => {
      try {
        const data = await getLocalCardData();
        setCardData(data);
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
    <Grid isLoading={isLoading} columns={5} inset={Grid.Inset.Medium} aspectRatio="1" fit={Grid.Fit.Fill}>
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
                <Action.OpenInBrowser
                  title="Open on HSGuru"
                  url={`https://www.hsguru.com/decks?format=${format}&player_class=${encodeURIComponent(deck.className)}`}
                  shortcut={{ modifiers: ['cmd'], key: 'h' }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
};

function DeckDetails({ title, slots, cardData, deckCode, className }: DeckDetailsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchByCost, setSearchByCost] = useState<number | undefined>(undefined);

  // 过滤卡牌的逻辑
  const filteredSlots = slots.filter((slot) => {
    // 名称搜索
    const matchesName = !searchTerm || slot.card.name.toLowerCase().includes(searchTerm.toLowerCase());

    // 费用搜索
    const matchesCost = searchByCost === undefined || slot.card.cost === searchByCost;

    return matchesName && matchesCost;
  });

  return (
    <List
      searchBarPlaceholder={`Browsing cards in: ${title}`}
      searchText={searchTerm}
      onSearchTextChange={setSearchTerm}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by Mana Cost"
          onChange={(value) => setSearchByCost(value === 'all' ? undefined : Number(value))}
        >
          <Grid.Dropdown.Item title="All Costs" value="all" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((cost) => (
            <Grid.Dropdown.Item key={cost} title={`Cost ${cost}`} value={cost.toString()} />
          ))}
        </Grid.Dropdown>
      }
    >
      <List.Section title={title} subtitle={`Class: ${className}`}>
        {filteredSlots.map((slot, index) => {
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
                { text: `♦${slot.card.mana?.toString().padStart(3, '0') ?? '000'}` },
                { text: getAmountEmoji(slot.amount) },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Card Details"
                    target={
                      <CardDetailView
                        slot={slot}
                        card={findCard(slot.card.name, cardData, slot.card.dbfId) || null}
                        deckCode={deckCode}
                      />
                    }
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
