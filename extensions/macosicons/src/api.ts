import algoliasearch, { SearchIndex } from "algoliasearch/lite";
import { IconDetails } from "./types";

const client = algoliasearch("P1TXH7ZFB3", "0ba04276e457028f3e11e38696eab32c");
const index: SearchIndex = client.initIndex("macOSicons");

export const COLUMNS = 6;
export const ROWS = 30;

export const ICONS_PER_PAGE = COLUMNS * ROWS;

export function fetchPage(query: string, page: number) {
  return index.search<IconDetails>(query, {
    page,
    hitsPerPage: COLUMNS * ROWS,
    filters: "approved: true",
  });
}

export function getItemPageProgress(index: number): number {
  return (index + 1) / ICONS_PER_PAGE;
}

export function getItemPage(index: number): number {
  return Math.ceil(getItemPageProgress(index)) - 1;
}
