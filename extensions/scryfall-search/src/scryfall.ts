/* eslint-disable id-length, camelcase */
import fetch from 'node-fetch';

import { toCapitalized } from './toCapitalized';
import { CardColor, MTGItem, ScryfallError, ScryfallSearch } from './typings.d';

const magicColors: { [key: string]: CardColor } = {
  W: { text: 'White', color: '#FFFFFF' },
  U: { text: 'Blue', color: '#0000FF' },
  B: { text: 'Black', color: '#000000' },
  R: { text: 'Red', color: '#FF0000' },
  G: { text: 'Green', color: '#008000' },
};

const getCost = (cost: string) => {
  const numbFound = cost.replace(/^\{([0-9X])\}.*/g, '$1');
  // check if the cost is a number via parseInt
  if (!isNaN(parseInt(numbFound, 10))) {
    return numbFound;
  }

  return null;
};
const escapeText = (text: string): string => text.replace(/\n/g, '\\n');

/**
 * Search Scryfall database for cards matching the given search pattern.
 * @docs https://scryfall.com/docs/api/cards/search
 * @docs https://scryfall.com/docs/syntax
 * @function
 * @async
 *
 * @param {string} query search data
 * @returns {Promise<MTGItem[]>}
 */
export const searchCard = async (query: string): Promise<MTGItem[]> => {
  try {
    const encodedName = encodeURIComponent(query);
    const request = await fetch(
      `https://api.scryfall.com/cards/search?order=set&q=${encodedName}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // no cards found
    if (request.status === 404) {
      return [];
    }

    if (request.status !== 200) {
      throw `(searchCard): ${request.status} - ${request.statusText} | ${query}`;
    }

    const response = (await request.json()) as unknown as
      | ScryfallSearch
      | ScryfallError;

    if (response.object === 'error') {
      const { details, warnings } = response as ScryfallError;
      const errMsg = warnings ? warnings.join('\n') : details;

      throw `(searchCard): \n ${errMsg}`;
    }

    const cards = (response as ScryfallSearch).data.map(
      ({
        artist,
        card_faces,
        collector_number,
        colors,
        flavor_text,
        image_uris,
        mana_cost,
        name,
        oracle_text,
        power,
        rarity,
        released_at,
        scryfall_uri,
        set_name,
        set,
        toughness,
        type_line,
      }) => {
        const id = `${name} - (${set}) #${collector_number}`;
        const manaCost = mana_cost ? getCost(mana_cost) : null;
        const manaColors = () => {
          if (!colors || colors?.length === 0) return null;

          const mColors = colors.map<CardColor>(color => magicColors[color]);

          return [
            { text: manaCost, color: '#000000' },
            ...mColors,
          ] as CardColor[];
        };
        const oText = oracle_text
          ? escapeText(oracle_text)
          : card_faces?.[0]?.oracle_text
            ? escapeText(card_faces?.[0]?.oracle_text)
            : null;
        const fText = flavor_text
          ? escapeText(flavor_text)
          : card_faces?.[0]?.flavor_text
            ? escapeText(card_faces?.[0]?.flavor_text)
            : null;
        const item: MTGItem = {
          id,
          name,
          mana_cost: manaCost,
          colors: manaColors(),
          type: type_line,
          set: set.toUpperCase(),
          set_name,
          oracle_text: oText,
          flavor_text: fText,
          power,
          toughness,
          rarity: toCapitalized(rarity),
          collector_number: parseInt(collector_number, 10),
          artist,
          released_at,
          image: image_uris?.png || card_faces?.[0]?.image_uris?.png || '',
          back: card_faces?.[1]?.image_uris?.png || null,
          url: scryfall_uri,
        };

        return item;
      }
    );

    return cards;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
