import { BookEntry } from "../types";
import libgen = require("libgen");

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export const getLibgenUrl = async () => {
  const urlString = await libgen.mirror();
  return urlString;
};

export const getLibgenSearchResult = async (searchContent: string) => {
  const libgenUrl = await libgen.mirror().then((url: string) => url.replace("http", "https"));
  // const betterSearchContent = searchContent.replace(" ", "+");
  const options = {
    mirror: libgenUrl,
    count: 100,
    query: searchContent,
    sort_by: "year",
    reverse: true,
  };

  console.log(`Libgen URL: ${libgenUrl}`);

  const data = await libgen.search(options);
  const n = data.length;
  console.log(`${n} results for "${options.query}"`);
  if (data.length === undefined) {
    throw new Error("No Result");
  }
  const books: BookEntry[] = data.map((d: any) => ({
    title: d.title,
    author: d.author,
    year: d.year,
    url: `${libgenUrl}/book/index.php?md5=${d.md5.toLowerCase()}`,
    pages: d.pages,
    language: d.language,
    publisher: d.publisher,
    commentary: d.commentary,
    coverUrl: `${libgenUrl}/covers/${d.coverurl}`,
    extension: d.extension,
    fileSize: d.filesize,
    md5: d.md5,
    timeAdded: d.timeadded,
    timeLastModified: d.timelastmodified,
  }));
  return books;
};
