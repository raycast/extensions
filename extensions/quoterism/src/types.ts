export enum QuoteMode {
  RANDOM = "random",
  QUOTE_OF_THE_DAY = "quote-of-the-day",
}

export type Quote = {
  id: string;
  text: string;
  author: {
    id: string;
    name: string;
  };
};
