import { Action, ActionPanel, Icon, List } from '@raycast/api';
import { usePromise } from '@raycast/utils';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { CardSlot, ClassName, Deck } from './domain';
import { gethsguruBestDecks, gethsguruBestDecksByClass } from './hsguru';
import { classIcon, ellipsize, formatNumberWithK, getLocalCardData } from './utils';

// Define card data types
interface CardData {
  id: string;
  name: string;
  cost: number;
}

type DeckListProps = {
  className?: ClassName;
  format?: number;
  minGames?: number;
};

export const DeckList: React.FC<DeckListProps> = ({ className, format = 1, minGames }) => {
  const { data: decks, isLoading: decksLoading } = className
    ? usePromise(gethsguruBestDecksByClass, [className, format, minGames], {})
    : usePromise(gethsguruBestDecks, [format], {});

  // 使用本地卡牌数据而不是从API获取
  const [cardData, setCardData] = useState<CardData[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  useEffect(() => {
    const loadCardData = async () => {
      try {
        // 尝试获取卡牌数据
        let data = await getLocalCardData();

        // 如果数据为空，尝试从 API 获取
        if (!data || data.length === 0) {
          console.log('Fetching card data from API...');
          const response = await axios.get('https://api.hearthstonejson.com/v1/latest/enUS/cards.json');
          data = response.data;
        }

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
    <List isLoading={isLoading} isShowingDetail>
      {decks?.map((deck) => (
        <List.Item
          key={deck.code}
          icon={classIcon(deck.className)}
          title={ellipsize(deck.title, 10)}
          accessories={[winrate(deck), dust(deck)]}
          actions={
            <Actions
              title={deck.title}
              code={deck.code}
              className={deck.className} // 添加className传递
            />
          }
          detail={<DeckDetails title={deck.title} slots={deck.slots} cardData={cardData} />}
        />
      ))}
    </List>
  );
};

// 修改后的Actions组件
interface ActionsProps {
  title: string;
  code: string;
  className: ClassName; // 添加类型定义
}

function Actions({ title, code, className }: ActionsProps) {
  return (
    <ActionPanel title={title}>
      <ActionPanel.Section>
        <Action.CopyToClipboard content={code} title="Copy Deck Code" />
        <Action.OpenInBrowser
          url={`https://www.hsguru.com/decks?format=1&player_class=${encodeURIComponent(className)}`}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function DeckDetails({ title, slots, cardData }: { title: string; slots: CardSlot[]; cardData: CardData[] }) {
  return <List.Item.Detail markdown={generateMarkdownList(title, slots, cardData)} />;
}

const generateMarkdownList = (title: string, cardSlots: CardSlot[], cardData: CardData[]): string => {
  let markdown = `# ${title}\n\n`;

  cardSlots.forEach((slot) => {
    // 尝试多种方式匹配卡牌
    let card = cardData.find((c) => c.name?.toLowerCase() === slot.card.title.toLowerCase());

    // 如果没有找到，尝试部分匹配
    if (!card) {
      card = cardData.find(
        (c) =>
          c.name &&
          slot.card.title &&
          (c.name.toLowerCase().includes(slot.card.title.toLowerCase()) ||
            slot.card.title.toLowerCase().includes(c.name.toLowerCase())),
      );
    }

    if (card && card.id) {
      const cardId = card.id; // 使用卡牌 ID
      const cardName = card.name || slot.card.title;

      markdown += `${slot.amount}x (${slot.card.mana})  ${cardName}\n\n`;
      markdown += `<img src="https://art.hearthstonejson.com/v1/render/latest/enUS/256x/${cardId}.png" alt="${cardName}">\n`;
    } else {
      markdown += `- ${slot.amount}x (${slot.card.mana})  ${slot.card.title} (Card image not found)\n\n`;
    }
  });

  return markdown;
};

const winrate = (deck: Deck) => {
  return { icon: Icon.LineChart, text: `${deck.winrate}%`, tooltip: 'winrate' };
};

const dust = (deck: Deck) => {
  return { icon: Icon.Raindrop, text: formatNumberWithK(deck.dust), tooltip: 'dust' };
};
