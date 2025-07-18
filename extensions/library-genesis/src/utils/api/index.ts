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

  const params = new URLSearchParams({
    req: searchContent,
    res: "100",
    covers: "on",
    filesuns: "all"
  });
  ["t", "a", "s", "y", "p", "i"].forEach(column => params.append("columns[]", column));
  ["f", "e", "s", "a", "p", "w"].forEach(object => params.append("objects[]", object));
  ["l", "c", "a", "m", "r", "s"].forEach(topic => params.append("topics[]", topic));

  const queryUrl =
    searchType === SearchType.Fiction
      ? libgenUrl +
        `/fiction/?` +
        new URLSearchParams({
          q: searchContent,
          criteria: "",
          language: "",
          format: "",
        })
      : libgenUrl +
        "/index.php?" +
        new URLSearchParams(params);

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
  const downloadLinks = $("#download").find("a");

  const downloadLink = downloadLinks.eq(gateWay).attr("href");
  return downloadLink;
};
