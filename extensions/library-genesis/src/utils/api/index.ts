import { load } from "cheerio";

import type { BookEntry } from "@/types";
import { SearchType } from "@/types";

import { getMirror } from "./mirrors";
import { fetchLibgenDocument, fetchLibgenSearchPage } from "./request";

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

export const getUrlFromDownloadPage = async (downloadUrl: string, signal?: AbortSignal): Promise<string> => {
  const document = await fetchLibgenDocument(downloadUrl, signal);

  const $ = load(document.content);
  const links = $("#main a[href]").toArray();
  const link = links.find((element) => $(element).text().trim().toUpperCase() === "GET");
  const href = link && $(link).attr("href");
  if (!href) throw new Error("The download page did not provide a GET link. Try another mirror.");

  const url = new URL(href, document.url);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("The download page returned an invalid GET link.");
  return url.toString();
};
