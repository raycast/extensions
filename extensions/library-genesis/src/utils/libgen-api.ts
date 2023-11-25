import { BookEntry, LibgenDownloadGateway } from "../types";
import libgen = require("libgen");
import fetch from "node-fetch";
import cheerio = require("cheerio");
import { extractNumber } from "./common-utils";
import { getPreferenceValues } from "@raycast/api";
import { LibgenPreferences } from "../types";

export const getLibgenUrl = async () => {
  const urlString = await libgen.mirror();
  return urlString;
};

// depracated in favor of getLibgenSearchResults
export const getLibgenSearchResultsLibgenAPI = async (searchContent: string) => {
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

export const getLibgenSearchResults = async (searchContent: string, results = 100) => {
  const { preferredLibgenMirror } = getPreferenceValues<LibgenPreferences>();
  const books: BookEntry[] = [];

  const libgenUrl =
    preferredLibgenMirror || (await libgen.mirror().then((url: string) => url.replace("http", "https")));

  console.log("Libgen Mirror URL: " + libgenUrl);
  const queryUrl =
    libgenUrl +
    "/search.php?" +
    new URLSearchParams({
      req: searchContent,
      open: "0",
      res: results.toString(),
      view: "detailed",
      phrase: "1",
      column: "def",
    });

  console.log(`Libgen Query URL: ${queryUrl}`);

  const response = await fetch(queryUrl);
  const data = await response.text();

  const $ = cheerio.load(data);

  // get all the book elements from the page
  // the detailed page uses tables to display each book entry
  // the correct tables are direct children of the body
  const bookElements = $("body")
    .children("table")
    .filter((i, el) => {
      // filter out the table that contains the search results
      return $(el).attr("rules") === "cols" && $(el).attr("width") === "100%" && $(el).attr("border") === "0";
    });

  // get the book entries from the table
  for (let i = 0; i < bookElements.length; i++) {
    const bookElement = bookElements.eq(i);
    const book = parseBookFromTableInDetailedView(bookElement, libgenUrl);
    books.push(book);
  }

  return books;
};

export const parseBookFromTableInDetailedView = (table: cheerio.Cheerio<cheerio.Element>, libgenUrl?: string) => {
  const bookElement = table.children("tbody").first();
  const contentRows = bookElement.children("tr");

  // data from 1st <tr>
  const downloadUrl = contentRows.eq(1).children("td").eq(0).children("a").first().attr("href") || "";
  const md5 = downloadUrl.split("md5=")[1];
  const coverUrl = contentRows.eq(1).children("td").eq(0).children("a").first().children("img").first().attr("src");
  const title = contentRows.eq(1).children("td").eq(2).find("a").first().text().trim();
  // book url need clean up
  // sample: ../book/index.php?md5=765E68B6A05373020ACE192312B56859
  const bookUrl = contentRows.eq(1).children("td").eq(2).find("a").first().attr("href")?.replace("..", "");

  // data from 2nd row
  const author = contentRows.eq(2).children("td").eq(1).find("a").first().text().trim();

  // data from 3rd row
  // const series = contentRows.eq(3).children("td").eq(1).text().trim();
  // const periodical = contentRows.eq(3).children("td").eq(3).text().trim();

  // data from 4th row
  const publisher = contentRows.eq(4).children("td").eq(1).text().trim();
  // const city = contentRows.eq(4).children("td").eq(3).text().trim();

  // data from 5th row
  const year = contentRows.eq(5).children("td").eq(1).text().trim();
  const edition = contentRows.eq(5).children("td").eq(3).text().trim();

  // data from 6th row
  const language = contentRows.eq(6).children("td").eq(1).text().trim();
  const pages = contentRows.eq(6).children("td").eq(3).text().trim();

  // data from 7th row
  const isbn = contentRows.eq(7).children("td").eq(1).text().trim();
  const id = contentRows.eq(7).children("td").eq(3).text().trim();

  // data from 8th row
  const timeAdded = contentRows.eq(8).children("td").eq(1).text().trim();
  const timeLastModified = contentRows.eq(8).children("td").eq(3).text().trim();

  // data from 9th row
  const fileSize = contentRows.eq(9).children("td").eq(1).text().trim();
  const extension = contentRows.eq(9).children("td").eq(3).text().trim();

  libgenUrl = libgenUrl ? libgenUrl : "libgen.rs";

  const book: BookEntry = {
    title: title,
    author: author,
    year: year,
    edition: edition,
    downloadUrl: libgenUrl + downloadUrl || "",
    infoUrl: libgenUrl + bookUrl || "",
    pages: extractNumber(pages),
    language: language,
    publisher: publisher,
    fileSize: fileSize,
    extension: extension,
    coverUrl: libgenUrl + coverUrl || "",
    md5: md5,
    id: id,
    timeAdded: timeAdded,
    timeLastModified: timeLastModified,
    isbn: isbn,
  };

  return book;
};

export const getUrlFromDownloadPage = async (downloadUrl: string, gateWay: LibgenDownloadGateway) => {
  const response = await fetch(downloadUrl);
  const data = await response.text();

  const $ = cheerio.load(data);
  console.log(downloadUrl);
  const downloadLinks = $("#download").find("a");

  const downloadLink = downloadLinks.eq(gateWay).attr("href");
  return downloadLink;
};
