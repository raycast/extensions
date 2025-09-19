import { load } from "cheerio";
import fetch from "node-fetch";

import type { BookEntry, LibgenDownloadGateway } from "@/types";
import { SearchType } from "@/types";

import { getMirror } from "./mirrors";

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

  const queryUrl = libgenUrl + "/index.php?" + params.toString();

  console.log(`Libgen Query URL: ${queryUrl}`);

  try {
    const response = await fetch(queryUrl, {
      signal: abortSignal,
    });
    const data = await response.text();

    return parse(data, libgenUrl);
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getUrlFromDownloadPage = async (
  downloadUrl: string,
  gateWay: LibgenDownloadGateway,
): Promise<string | undefined> => {
  const response = await fetch(downloadUrl);
  const data = await response.text();

  const $ = load(data);
  console.log(downloadUrl);
  const pathname = $("#main").find("a").first().attr("href");
  const url = new URL(downloadUrl);
  url.pathname = pathname || "";
  return url.toString();

  const downloadLinks = $("#download").find("a");
  const downloadLink = downloadLinks.eq(gateWay).attr("href");
  return downloadLink;
};
