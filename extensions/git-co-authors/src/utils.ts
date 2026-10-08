import { Cache, showToast, Toast } from "@raycast/api";
import { Author, AuthorMap, Authors } from "./types";

import { readdir } from "node:fs/promises";
import { exec as _exec } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(_exec);

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

export function addAllAuthorsToCache(authors: Authors) {
  const authorsMap = getAuthorsMapFromCache();

  authors.forEach((author) => {
    authorsMap.set(author.email, author);
  });

  setAuthors(authorsMap);
}

export function removeAuthorFromCache(email: string) {
  const authors = getAuthorsMapFromCache();
  authors.delete(email);
  setAuthors(authors);
}

export function clearAuthorsCache() {
  cache.set(KEY, "[]");
}

export async function findGitReposInDir(dir: string): Promise<string[]> {
  const repos: string[] = [];
  let entries = [];

  try {
    entries = await readdir(dir, { withFileTypes: true, recursive: true });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to read directory",
      message: e instanceof Error ? e.message : String(e),
    });
    return [];
  }

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name === ".git") {
      repos.push(entry.parentPath);
    }
  }

  return repos;
}

export async function getCoAuthorsForDir(path: string): Promise<Authors> {
  const cmd = "git --no-pager shortlog --group=author --group=trailer:co-authored-by -s -e -n HEAD";

  try {
    const { stdout } = await exec(cmd, {
      cwd: path,
    });

    const authors = [] as Authors;

    stdout
      .trim()
      .split("\n")
      .forEach((row: string) => {
        const matches = row.match(/\s*[0-9]+\s(.*)<(.*)>/);

        const name = matches?.[1].trim();
        const email = matches?.[2].trim();

        if (email && name) {
          authors.push({
            name,
            email,
          });
        }
      });

    return authors;
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to load co-authors",
      message: e instanceof Error ? e.message : String(e),
    });
  }

  return [];
}
