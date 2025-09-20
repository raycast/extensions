import { Quote } from "./types";

export const BASE_URL = "https://www.quoterism.com";

export const getQuoteLink = (quote: Quote | undefined) => (quote ? `${BASE_URL}/quotes/${quote.id}` : BASE_URL);

export const getAuthorLink = (quote: Quote | undefined) =>
  quote?.author ? `${BASE_URL}/authors/${quote.author.id}` : BASE_URL;
