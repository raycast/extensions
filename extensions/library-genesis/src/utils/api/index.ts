import { load } from "cheerio";

import type { BookEntry } from "@/types";
import { SearchType } from "@/types";

import { getMirror } from "./mirrors";
import { fetchLibgenPage, fetchLibgenSearchPage } from "./request";

export const getLibgenSearchResults = async (
  searchContent: string,
  libgenUrl: string | null,
  abortSignal: AbortSignal,
  searchType: SearchType,
): Promise<BookEntry[]> => {
  console.log("Libgen Mirror URL: " + libgenUrl);

  if (libgenUrl === null) {
    console.log("No Libgen Mirror Found");
    return [];
  }

  const { parse } = getMirror(libgenUrl);

  const fields = [
    "t", // title
    "a", // author(s)
    "s", // series
    "y", // year
    "p", // publisher
    "i", // isbn
  ];
  const objects = [
    "f", // files
    "e", // editions
    "s", // series
    "a", // authors
    "p", // publishers
    "w", // works
  ];
  const topics = {
    fiction: [
      "f", // fiction
      "r", // fiction rus
      "c", // comics
    ],
    nonfiction: [
      "l", // libgen
      "a", // scientific articles
      "m", // magazines
      "s", // standards
    ],
  };
  const params = new URLSearchParams({
    req: searchContent,
    res: "100",
    covers: "on",
    filesuns: "all",
  });
  fields.forEach((column) => params.append("columns[]", column));
  objects.forEach((object) => params.append("objects[]", object));
  if (searchType === SearchType.Fiction) topics.fiction.forEach((topic) => params.append("topics[]", topic));
  else if (searchType === SearchType.NonFiction) topics.nonfiction.forEach((topic) => params.append("topics[]", topic));
  else [...topics.fiction, ...topics.nonfiction].forEach((topic) => params.append("topics[]", topic));

  const queryUrl = new URL("index.php", `${libgenUrl.replace(/\/+$/, "")}/`);
  queryUrl.search = params.toString();

  console.log(`Libgen Query URL: ${queryUrl}`);

  const data = await fetchLibgenSearchPage(queryUrl.toString(), abortSignal);
  return parse(data, libgenUrl);
};

export const getUrlFromDownloadPage = async (downloadUrl: string): Promise<string | undefined> => {
  const data = await fetchLibgenPage(downloadUrl);

  const $ = load(data);
  const pathname = $("#main").find("a").first().attr("href");
  const url = new URL(downloadUrl);
  url.pathname = pathname || "";
  return `${url.origin}/${pathname}`;
};
