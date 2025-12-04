export type Pocket = {
  name?: string;
  cards: Card[];
};

export type Card = {
  name: string;
  path: string;
  preview?: string;
};

export interface Preferences {
  walletDirectory: string;
  videoPreviews: boolean;
  rememberPocketFilter: boolean;
  suppressReadErrors?: boolean;
}
