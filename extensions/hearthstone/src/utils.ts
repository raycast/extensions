import { Image, LocalStorage } from '@raycast/api';
import axios from 'axios';
import { ClassName, Deck } from './domain';

export interface Card {
  id: string;
  name: string;
  cost: number;
}

export const classIcon = (className: ClassName) => {
  // 创建职业名称到图片文件名的映射
  const iconMap: Record<string, string> = {
    [ClassName.DRUID]: 'druid.png',
    [ClassName.HUNTER]: 'hunter.png',
    [ClassName.MAGE]: 'mage.png',
    [ClassName.PALADIN]: 'paladin.png',
    [ClassName.PRIEST]: 'priest.png',
    [ClassName.ROGUE]: 'rogue.png',
    [ClassName.SHAMAN]: 'shaman.png',
    [ClassName.WARLOCK]: 'warlock.png',
    [ClassName.WARRIOR]: 'warrior.png',
    [ClassName.DEMONHUNTER]: 'demonhunter.png', // 使用您提供的文件名
    [ClassName.DEATHKNIGHT]: 'deathknight.png', // 使用您提供的文件名
  };

  // 确保每个职业都有对应的图标
  if (!iconMap[className]) {
    // 将职业名称转换为文件名格式
    // 例如 "Demon Hunter" -> "demonhunter.png"
    const fallbackIcon = className.toLowerCase().replace(/\s+/g, '') + '.png';
    return {
      source: fallbackIcon,
      mask: Image.Mask.Circle,
    };
  }

  return {
    source: iconMap[className],
    mask: Image.Mask.Circle,
  };
};

export const ellipsize = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) {
    return str;
  } else {
    return str.substring(0, maxLength - 1) + '…';
  }
};

export type CacheEntry = {
  timestamp: number;
  decks: Deck[];
};

// 使用 axios 获取卡牌数据
export const getLocalCardData = async () => {
  try {
    const cacheKey = 'cards_data';

    // 尝试从 LocalStorage 获取卡牌数据
    const data = await LocalStorage.getItem(cacheKey);
    if (data) {
      return JSON.parse(data as string);
    }

    // 如果 LocalStorage 中没有数据，则尝试从 API 获取
    console.log('No card data found in LocalStorage, fetching from API...');
    const response = await axios.get('https://api.hearthstonejson.com/v1/latest/enUS/cards.json');

    const cardData = response.data;

    // 将获取到的数据存储到 LocalStorage 中，以便下次使用
    try {
      // 由于数据可能很大，我们只存储必要的字段
      const simplifiedData = cardData.map((card: Card) => ({
        id: card.id,
        name: card.name,
        cost: card.cost,
      }));

      await LocalStorage.setItem(cacheKey, JSON.stringify(simplifiedData));
      console.log('Card data saved to LocalStorage');
      return simplifiedData;
    } catch (e) {
      console.error('Failed to save card data to LocalStorage:', e);
      // 如果存储失败，我们仍然返回获取到的数据
      return cardData;
    }
  } catch (error) {
    console.error('Error getting card data:', error);
    return [];
  }
};

// 获取游戏模式名称
export const getGameModeName = (format: number): string => {
  return format === 1 ? 'Wild' : 'Standard';
};

// 使用等宽字体特性来格式化标题
export const formatTitle = (title: string): string => {
  // 将标题裁剪为一个固定长度，例如10个字符
  if (title.length <= 15) {
    return title;
  } else {
    return title.substring(0, 12) + '...';
  }
};

// 格式化胜率为统一格式
export const formatWinrate = (winrate: number | null): string => {
  if (winrate === null) return 'N/A';
  return winrate.toFixed(2) + '%';
};

// 格式化尘晶为统一格式
export const formatDust = (dust: number): string => {
  const inK = dust / 1000;
  return inK.toFixed(2) + 'k';
};

// 根据卡牌稀有度返回对应的颜色代码
export const getRarityColor = (rarity: string): string => {
  switch (rarity?.toLowerCase()) {
    case 'legendary':
      return '#ff8000'; // 橙色
    case 'epic':
      return '#a335ee'; // 紫色
    case 'rare':
      return '#0070dd'; // 蓝色
    case 'common':
      return '#ffffff'; // 白色
    default:
      return '#9d9d9d'; // 灰色（未知稀有度）
  }
};
