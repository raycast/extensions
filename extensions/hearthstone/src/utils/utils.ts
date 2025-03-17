import { Image, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import axios from "axios";
import { Card, ClassName, Deck, MatchResult } from "../types/types";

export const classIcon = (className: ClassName) => {
  // Create a mapping of occupation names to image file names
  const iconMap: Record<string, string> = {
    [ClassName.DRUID]: "druid.png",
    [ClassName.HUNTER]: "hunter.png",
    [ClassName.MAGE]: "mage.png",
    [ClassName.PALADIN]: "paladin.png",
    [ClassName.PRIEST]: "priest.png",
    [ClassName.ROGUE]: "rogue.png",
    [ClassName.SHAMAN]: "shaman.png",
    [ClassName.WARLOCK]: "warlock.png",
    [ClassName.WARRIOR]: "warrior.png",
    [ClassName.DEMONHUNTER]: "demonhunter.png",
    [ClassName.DEATHKNIGHT]: "deathknight.png",
  };

  // Make sure each class has a corresponding icon
  if (!iconMap[className]) {
    // Convert class names to file name format
    // eg "Demon Hunter" -> "demonhunter.png"
    const fallbackIcon = className.toLowerCase().replace(/\s+/g, "") + ".png";
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
    return str.substring(0, maxLength - 1) + "…";
  }
};

export type CacheEntry = {
  timestamp: number;
  decks: Deck[];
};

// Update findCard function to support more flexible search
// Update findCard function to support matching by dbfId
export const findCard = (
  cardTitle: string,
  cardDataArray: Card[],
  hsguruId?: number | string, // This is the ID obtained from HSGuru, corresponding to dbfId in cards.json
) => {
  // If there is a hsguruId, use it first to match the dbfId in cards.json
  if (hsguruId) {
    const numericHsguruId =
      typeof hsguruId === "string" ? parseInt(hsguruId, 10) : hsguruId;
    console.log(`Looking for card with dbfId: ${numericHsguruId}`);

    const idMatchedCard = cardDataArray.find(
      (card) => card.dbfId === numericHsguruId,
    );
    if (idMatchedCard) {
      console.log(`Found card by dbfId ${numericHsguruId}:`, {
        name: idMatchedCard.name,
        dbfId: idMatchedCard.dbfId,
        id: idMatchedCard.id,
      });
      return idMatchedCard;
    }
  }

  // If the input is empty, return null directly
  if (!cardTitle || cardDataArray.length === 0) {
    return null;
  }

  // Preprocessing functions: more comprehensive character normalization
  const normalizeString = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5\w\s]/g, "") // Support Chinese characters
      .replace(/\s+/g, " ")
      .trim();

  const normalizedTitle = normalizeString(cardTitle);

  const matchResults: MatchResult[] = cardDataArray
    .map((card) => {
      const normalizedCardName = normalizeString(card.name);

      // Exact match
      if (normalizedCardName === normalizedTitle) {
        return { card, matchScore: 3 }; // Highest score
      }

      // Exactly contains match
      if (
        normalizedCardName.includes(normalizedTitle) ||
        normalizedTitle.includes(normalizedCardName)
      ) {
        return { card, matchScore: 2 }; // Medium score
      }

      // Word level fuzzy matching
      const cardWords = normalizedCardName.split(" ");
      const titleWords = normalizedTitle.split(" ");

      const wordMatchCount = titleWords.filter((titleWord) =>
        cardWords.some((cardWord) => cardWord.includes(titleWord)),
      ).length;

      if (wordMatchCount > 0) {
        return {
          card,
          matchScore:
            1 + wordMatchCount / Math.max(cardWords.length, titleWords.length),
        };
      }

      return null;
    })
    .filter((result): result is MatchResult => result !== null)
    .sort((a, b) => b.matchScore - a.matchScore);

  // Return the best match
  return matchResults.length > 0 ? matchResults[0].card : null;
};

// Use axios to get card data
export const getLocalCardData = async (language: "enUS" | "zhCN" = "enUS") => {
  try {
    const cacheKey = `cards_data_${language}`;

    // Try to get the card data from LocalStorage
    const data = await LocalStorage.getItem(cacheKey);
    if (data) {
      const parsedData = JSON.parse(data as string);
      return parsedData;
    }

    // If there is no data in LocalStorage, try to get it from the API
    console.log(
      `No card data found in LocalStorage for ${language}, fetching from API...`,
    );
    const response = await axios.get(
      `https://api.hearthstonejson.com/v1/latest/${language}/cards.json`,
    );

    const cardData = response.data;

    // Store the acquired data in LocalStorage for next use
    try {
      // Only save collectible cards, and make sure to include the ID field correctly
      const collectibleCards = cardData.filter(
        (card: Card) => card.collectible,
      );

      // Process each card, ensuring the cost and ID information are correct
      const processedCards = collectibleCards.map((card: Card) => ({
        ...card,
        // Make sure the cost attribute is valid, if not use 0
        cost: typeof card.cost === "number" ? card.cost : 0,
        // Keep the original id and dbfId
        id: card.id,
        dbfId: card.dbfId,
      }));

      await LocalStorage.setItem(cacheKey, JSON.stringify(processedCards));
      console.log("Card data saved to LocalStorage");
      return processedCards;
    } catch (e) {
      showFailureToast(e, {
        title: "Failed to save card data to LocalStorage",
      });
      return cardData.filter((card: Card) => card.collectible);
    }
  } catch (error) {
    showFailureToast(error, { title: "Error getting card data" });
    return [];
  }
};

// Get the game mode name
export const getGameModeName = (format: number): string => {
  return format === 1 ? "Wild" : "Standard";
};

// Use the monospaced font feature to format titles
export const formatTitle = (title: string): string => {
  // Crop the title to a fixed length, such as 10 characters
  if (title.length <= 15) {
    return title;
  } else {
    return title.substring(0, 12) + "…";
  }
};

// Format win rate to a unified format
export const formatWinrate = (winrate: number | null): string => {
  if (winrate === null) return "N/A";
  return winrate.toFixed(2) + "%";
};

// Format dust crystals to a unified format
export const formatDust = (dust: number): string => {
  const inK = dust / 1000;
  return inK.toFixed(2) + "k";
};

// Returns the corresponding color code according to the rarity of the card
export const getRarityColor = (rarity: string): string => {
  switch (rarity?.toLowerCase()) {
    case "legendary":
      return "#ff8000";
    case "epic":
      return "#a335ee";
    case "rare":
      return "#0070dd";
    case "common":
      return "#ffffff";
    default:
      return "#9d9d9d";
  }
};

export const getAmountEmoji = (amount: 1 | 2): string => {
  return amount === 1 ? "🂠¹" : "🂠²"; // Use superscript numbers
  // Or use other emojis
  // return amount === 1 ? "🃏" : "🃏🃏"; // Use playing card emoji
  // return amount === 1 ? "🎴" : "🎴🎴"; // Use flower emoji
  // return amount === 1 ? "🧩" : "🧩🧩"; // Use puzzle emoji
};

//Cards Search Pagination
export const getCardsList = async (
  page = 1,
  pageSize = 10,
  searchTerm = "",
  searchByCost?: number,
) => {
  const allCards = await getLocalCardData();

  let filteredCards = allCards.filter((card: Card) => card.collectible);

  // Search by Name
  if (searchTerm) {
    filteredCards = filteredCards.filter((card: Card) =>
      card.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }

  if (searchByCost !== undefined) {
    filteredCards = filteredCards.filter(
      (card: Card) => card.mana === searchByCost, // Use mana instead of cost
    );
  }

  // Pagination
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCards = filteredCards.slice(startIndex, endIndex);

  return {
    cards: paginatedCards,
    total: filteredCards.length,
    hasMore: endIndex < filteredCards.length,
  };
};
