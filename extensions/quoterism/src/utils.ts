import { Quote } from "./types";

export const getQuoteLink = (quote: Quote | undefined) =>
  quote ? `https://www.quoterism.com/quotes/${quote.id}` : "https://www.quoterism.com";
