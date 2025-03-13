import { Image, LocalStorage } from '@raycast/api';
import axios from 'axios';
import { Card, ClassName, Deck, MatchResult } from '../types/types';

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
    [ClassName.DEMONHUNTER]: 'demonhunter.png',
    [ClassName.DEATHKNIGHT]: 'deathknight.png',
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

// 更新 findCard 函数以支持更灵活的搜索
// 更新 findCard 函数以支持通过 dbfId 匹配
export const findCard = (
  cardTitle: string,
  cardDataArray: Card[],
  hsguruId?: number | string, // 这是从 HSGuru 获取的 ID，对应 cards.json 中的 dbfId
) => {
  // 如果有 hsguruId，优先使用它匹配 cards.json 中的 dbfId
  if (hsguruId) {
    const numericHsguruId = typeof hsguruId === 'string' ? parseInt(hsguruId, 10) : hsguruId;
    console.log(`Looking for card with dbfId: ${numericHsguruId}`);

    const idMatchedCard = cardDataArray.find((card) => card.dbfId === numericHsguruId);
    if (idMatchedCard) {
      console.log(`Found card by dbfId ${numericHsguruId}:`, {
        name: idMatchedCard.name,
        dbfId: idMatchedCard.dbfId,
        id: idMatchedCard.id,
      });
      return idMatchedCard;
    }
  }

  // 如果输入为空，直接返回 null
  if (!cardTitle || cardDataArray.length === 0) {
    return null;
  }

  // 预处理函数：更全面的字符规范化
  const normalizeString = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5\w\s]/g, '') // 支持中文字符
      .replace(/\s+/g, ' ')
      .trim();

  const normalizedTitle = normalizeString(cardTitle);

  const matchResults: MatchResult[] = cardDataArray
    .map((card) => {
      const normalizedCardName = normalizeString(card.name);

      // 精确匹配
      if (normalizedCardName === normalizedTitle) {
        return { card, matchScore: 3 }; // 最高分
      }

      // 完全包含匹配
      if (normalizedCardName.includes(normalizedTitle) || normalizedTitle.includes(normalizedCardName)) {
        return { card, matchScore: 2 }; // 中等分
      }

      // 单词级别模糊匹配
      const cardWords = normalizedCardName.split(' ');
      const titleWords = normalizedTitle.split(' ');

      const wordMatchCount = titleWords.filter((titleWord) =>
        cardWords.some((cardWord) => cardWord.includes(titleWord)),
      ).length;

      if (wordMatchCount > 0) {
        return {
          card,
          matchScore: 1 + wordMatchCount / Math.max(cardWords.length, titleWords.length),
        };
      }

      return null;
    })
    .filter((result): result is MatchResult => result !== null)
    .sort((a, b) => b.matchScore - a.matchScore);

  // 返回最佳匹配
  return matchResults.length > 0 ? matchResults[0].card : null;
};

// 使用 axios 获取卡牌数据
// 在 utils.ts 中
export const getLocalCardData = async (language: 'enUS' | 'zhCN' = 'enUS') => {
  try {
    const cacheKey = `cards_data_${language}`;

    // 尝试从 LocalStorage 获取卡牌数据
    const data = await LocalStorage.getItem(cacheKey);
    if (data) {
      const parsedData = JSON.parse(data as string);
      return parsedData;
    }

    // 如果 LocalStorage 中没有数据，则尝试从 API 获取
    console.log(`No card data found in LocalStorage for ${language}, fetching from API...`);
    const response = await axios.get(`https://api.hearthstonejson.com/v1/latest/${language}/cards.json`);

    const cardData = response.data;

    // 将获取到的数据存储到 LocalStorage 中，以便下次使用
    try {
      // 只保存可收集的卡牌，并确保正确包含ID字段
      const collectibleCards = cardData.filter((card: Card) => card.collectible);

      // 处理每张卡牌，确保费用和ID信息正确
      const processedCards = collectibleCards.map((card: Card) => ({
        ...card,
        // 确保cost属性有效，如果无效则使用0
        cost: typeof card.cost === 'number' ? card.cost : 0,
        // 保留原始id和dbfId
        id: card.id,
        dbfId: card.dbfId,
      }));

      await LocalStorage.setItem(cacheKey, JSON.stringify(processedCards));
      console.log('Card data saved to LocalStorage');
      return processedCards;
    } catch (e) {
      console.error('Failed to save card data to LocalStorage:', e);
      return cardData.filter((card: Card) => card.collectible);
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

// 在 utils.ts 文件中添加这个函数
export const getAmountEmoji = (amount: 1 | 2): string => {
  return amount === 1 ? '🂠¹' : '🂠²'; // 使用上标数字
  // 或者使用其他emoji
  // return amount === 1 ? "🃏" : "🃏🃏"; // 使用扑克牌emoji
  // return amount === 1 ? "🎴" : "🎴🎴"; // 使用花牌emoji
  // return amount === 1 ? "🧩" : "🧩🧩"; // 使用拼图emoji
};

//Cards 搜索分页
export const getCardsList = async (page = 1, pageSize = 10, searchTerm = '', searchByCost?: number) => {
  const allCards = await getLocalCardData();

  let filteredCards = allCards.filter((card: Card) => card.collectible); // 添加类型注解

  // 按名称搜索
  if (searchTerm) {
    filteredCards = filteredCards.filter(
      (
        card: Card, // 添加类型注解
      ) => card.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }

  if (searchByCost !== undefined) {
    filteredCards = filteredCards.filter(
      (card: Card) => card.mana === searchByCost, // 使用 mana 而不是 cost
    );
  }

  // 分页
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCards = filteredCards.slice(startIndex, endIndex);

  return {
    cards: paginatedCards,
    total: filteredCards.length,
    hasMore: endIndex < filteredCards.length,
  };
};
