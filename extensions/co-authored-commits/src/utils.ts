import { Cache } from "@raycast/api";
import { Author, AuthorMap, Authors } from "./types";

export const cache = new Cache();

export const KEY = "authors";

function setAuthors(authors: AuthorMap) {
  const arr = mapToArr(authors);
  cache.set(KEY, JSON.stringify(arr));
}
function arrToMap(arr: Authors) {
  const map: AuthorMap = new Map();
  arr.map((author) => map.set(author.email, author));
  return map;
}

function mapToArr(map: AuthorMap) {
  const arr: Authors = [];
  map.forEach((author) => arr.push(author));
  return arr;
}

export function getAuthorsArrFromCache() {
  const cached = cache.get(KEY);
  const authors: Authors = cached ? JSON.parse(cached) : [];
  return authors;
}
function getAuthorsMapFromCache() {
  const arr = getAuthorsArrFromCache();
  return arrToMap(arr);
}

export function addAuthorToCache(author: Author) {
  const authors = getAuthorsMapFromCache();

  authors.set(author.email, author);
  setAuthors(authors);
}

export function removeAuthorFromCache(email: string) {
  const authors = getAuthorsMapFromCache();
  authors.delete(email);
  setAuthors(authors);
}
