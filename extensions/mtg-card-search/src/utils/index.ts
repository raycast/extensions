import { ScryfallCard, MtgCard } from "../types";

export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const mapCardFaces = (card: ScryfallCard): MtgCard["faces"] => {
  const source = card?.card_faces ?? [card];

  return source.map((s) => ({
    name: s.name,
    imageUrl: s.image_uris?.png || card.image_uris.png,
    traits: s.type_line,
    text: s.oracle_text,
    flavor: s.flavor_text,
  }));
};

export const mapCard = (card: ScryfallCard): MtgCard => {
  const [frontFace] = card?.card_faces ?? [];

  const manaCost = frontFace?.mana_cost ?? card.mana_cost;

  return {
    id: card.id,
    fullName: card.name,
    links: {
      cardMarket: card.purchase_uris?.cardmarket ?? "",
      tcgPlayer: card.purchase_uris?.tcgplayer ?? "",
      cardHoarder: card.purchase_uris?.cardhoarder ?? "",
      edhrec: card.related_uris?.edhrec ?? "",
      scryfall: card.scryfall_uri,
    },
    metadata: {
      set: {
        name: card.set_name,
        uri: card.set_uri ?? "",
      },
      manaCost,
      rarity: card.rarity,
      prices: {
        eur: card.prices?.eur,
        usd: card.prices?.usd,
      },
      keywords: card.keywords,
      artist: card.artist,
      gameChanger: card.game_changer,
    },
    faces: mapCardFaces(card),
  };
};
