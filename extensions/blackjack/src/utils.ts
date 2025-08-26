import { Card, Hand, Suit, Rank } from "./types";

export const FreshDeck = (): Card[] => {
  const suits: Suit[] = ["Hearts", "Diamonds", "Clubs", "Spades"];
  const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const getHandValue = (hand: Hand): number => {
  let value = 0;
  let aceCount = 0;
  for (const card of hand) {
    if (card.rank === "A") {
      aceCount++;
      value += 11;
    } else if (["K", "Q", "J"].includes(card.rank)) {
      value += 10;
    } else {
      value += parseInt(card.rank);
    }
  }
  while (value > 21 && aceCount > 0) {
    value -= 10;
    aceCount--;
  }
  return value;
};

export const dealCard = (hand: Hand, deck: Card[]): { newHand: Hand; newDeck: Card[] } => {
  const newDeck = [...deck];
  const newHand = [...hand, newDeck.pop()!];
  return { newHand, newDeck };
};

export const initialDeal = (): { playerHand: Hand; dealerHand: Hand; deck: Card[] } => {
  const deck = shuffleDeck(FreshDeck());
  let playerHand: Hand = [];
  let dealerHand: Hand = [];

  const deal = (hand: Hand) => {
    const card = deck.pop()!;
    return [...hand, card];
  };

  playerHand = deal(playerHand);
  dealerHand = deal(dealerHand);
  playerHand = deal(playerHand);
  dealerHand = deal(dealerHand);

  return { playerHand, dealerHand, deck };
};

export const determineWinner = (playerValue: number, dealerValue: number): string | null => {
  if (playerValue > 21) return "Dealer";
  if (dealerValue > 21) return "Player";
  if (playerValue > dealerValue) return "Player";
  if (dealerValue > playerValue) return "Dealer";
  return "Push";
};

export const getCardUnicode = (card: Card): string => {
  const suits: Record<Suit, string> = {
    Hearts: "♥",
    Diamonds: "♦",
    Clubs: "♣",
    Spades: "♠",
  };
  return `${card.rank}${suits[card.suit]}`;
};
