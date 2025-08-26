export type Suit = "Hearts" | "Diamonds" | "Clubs" | "Spades";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type Hand = Card[];

export interface GameState {
  playerHand: Hand;
  dealerHand: Hand;
  deck: Card[];
  isPlayerTurn: boolean;
  winner: string | null;
}
