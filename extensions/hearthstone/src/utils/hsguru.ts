import { Cache } from '@raycast/api';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { CardSlot, ClassName, Deck, Rarity } from '../types/types';
import { CacheEntry } from './utils';

const CACHE_DURATION_IN_MS = 3600 * 1_000;
export const hsguru_BEST_DECKS_URL = (format: number) => `https://www.hsguru.com/decks/?format=${format}`;

const cache = new Cache();

export const hsguruBestDecksWithFiltersUrl = (className: ClassName, format: number, minGames?: number) => {
  // 将类名转换为API所需的大写格式
  const classNameForApi = className.toString().replace(/\s+/g, '').toUpperCase();

  let url = `https://www.hsguru.com/decks/?format=${format}&player_class=${classNameForApi}`;
  if (minGames) {
    url += `&min_games=${minGames}`;
  }
  return url;
};

export const gethsguruBestDecks = async (format: number = 1) => {
  const cacheKey = `all_classes_${format}`;

  const cachedDecks = getFromCache(cacheKey);

  if (cachedDecks) {
    return Promise.resolve(cachedDecks);
  }

  const decks = await fetchDecks(hsguru_BEST_DECKS_URL(format));
  saveToCache(cacheKey, decks);

  return decks;
};

export const gethsguruBestDecksByClass = async (className: ClassName, format: number = 1, minGames?: number) => {
  const cacheKey = `${className.toString()}_${format}_${minGames || ''}`;

  const cachedDecks = getFromCache(cacheKey);

  if (cachedDecks) {
    return Promise.resolve(cachedDecks);
  }

  const decks = await fetchDecks(hsguruBestDecksWithFiltersUrl(className, format, minGames));
  saveToCache(cacheKey, decks);

  return decks;
};

const getFromCache = (cacheKey: string) => {
  const cachedResponse = cache.get(cacheKey);
  if (cachedResponse) {
    const parsed: CacheEntry = JSON.parse(cachedResponse);

    const elapsed = Date.now() - parsed.timestamp;

    if (elapsed <= CACHE_DURATION_IN_MS) {
      return parsed.decks;
    }
  }

  return null;
};

const saveToCache = (cacheKey: string, decks: Deck[]) => {
  cache.set(cacheKey, JSON.stringify({ timestamp: Date.now(), decks: decks }));
};

export const fetchDecks = async (url: string) => {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const elements = $('div.card');
  const decks: Deck[] = [];

  elements.each((_, el) => {
    // 提取卡组ID
    const deckId = $(el).find('div[id^="deck_stats-"]').attr('id')?.replace('deck_stats-', '');

    const fullText = $(el).find('h2.deck-title').text().trim();
    const className = $(el)
      .find('.decklist-info')
      .attr('class')
      ?.split(' ')
      .filter((cl) => cl !== 'decklist-info')
      .join(' ') as ClassName;

    const title = fullText.split('\n')[0].replace('### ', '').replace(new RegExp(className, 'i'), '').trim();
    const code = $(el).find('button[data-clipboard-text]').attr('data-clipboard-text');
    const winrateText = $(el).find('span.basic-black-text').text();
    const dust = parseInt($(el).find('div.dust-bar-inner').text().trim());
    const winrate = winrateText ? parseFloat(winrateText) : null;

    // 使用 cheerio 选择卡牌容器
    const cardContainers = $(el).find('div.decklist_card_container');

    // 使用 .get() 将 cheerio 对象转换为数组
    const slots: CardSlot[] = cardContainers
      .get()
      .map((cardContainer: cheerio.Element) => {
        const hsguruId = $(cardContainer).find('div[phx-value-card_id]').attr('phx-value-card_id');
        const numericHsguruId = hsguruId ? parseInt(hsguruId, 10) : 0;

        const cardName = $(cardContainer).find('div.card-name').text().trim();

        const manaMatch = cardName.match(/# (?:\d+)x \((\d+)\)/);
        const mana = manaMatch ? parseInt(manaMatch[1], 10) : 0;

        const amountMatch = cardName.match(/# (\d+)x/);
        const amount = amountMatch ? (parseInt(amountMatch[1], 10) as 1 | 2) : 1;

        const cleanName = cardName.replace(/# \d+x \(\d+\)\s*/, '').trim();

        const rarity = parseCardRarity(cardContainer);

        return {
          card: {
            id: '', // 提供默认值
            name: cleanName,
            cost: mana,
            mana: mana,
            rarity: rarity,
            collectible: true,
            dbfId: numericHsguruId,
          },
          amount: amount,
        };
      })
      .sort((a, b) => a.card.cost - b.card.cost);

    if (title && code && className && winrate && dust && slots.length > 0) {
      decks.push({
        deckID: deckId as string, // 添加卡组ID
        title,
        code,
        className,
        winrate,
        dust,
        slots,
      });
    }
  });

  return decks;
};

const parseCardRarity = (cardContainer: cheerio.Element): Rarity => {
  const $ = cheerio.load(cardContainer);

  const styleAttr = $(cardContainer).find('.decklist-card').attr('style') || '';

  if (styleAttr.includes('--color-dark-legendary')) {
    return Rarity.LEGENDARY;
  } else if (styleAttr.includes('--color-dark-epic')) {
    return Rarity.EPIC;
  } else if (styleAttr.includes('--color-dark-rare')) {
    return Rarity.RARE;
  } else {
    return Rarity.COMMON;
  }
};
