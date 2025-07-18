import type { Cheerio, CheerioAPI, Element } from "cheerio";
import { load } from "cheerio";

import type { BookEntry } from "@/types";
import { extractNumber } from "@/utils/common";
import { DEFAULT_MIRROR } from "@/utils/constants";

const parseBookFromTableInDetailedView = (table: Cheerio<Element>, libgenUrl?: string): BookEntry => {
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

  libgenUrl = libgenUrl ? libgenUrl : DEFAULT_MIRROR.name;

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

export const parseContentIntoBooks = (content: string, libgenUrl?: string): BookEntry[] => {
  const books: BookEntry[] = [];
  const $ = load(content);

  // get all the book elements from the page
  const bookElements = $("#tablelibgen tbody tr");
  // get the book entries from the table
  for (let i = 0; i < bookElements.length; i++) {
    const bookElement = bookElements.eq(i);
    const book = parseBookFromRow(bookElement, libgenUrl);
    if (!i) console.log(book)
    books.push(book);
  }

  return books;
};

const parseFiction = ($: CheerioAPI, libgenUrl?: string) => {
  const books: BookEntry[] = [];
  const bookElements = $("table.catalog tbody tr");
  for (let i = 0; i < bookElements.length; i++) {
    const bookElement = bookElements.eq(i);
    const book = parseBookFromFictionTable(bookElement, libgenUrl);
    books.push(book);
  }

  return books;
};

const parseBookFromRow = (row: Cheerio<Element>, libgenUrl?: string): BookEntry => {
  const bookElement = row;
  const contentCols = bookElement.children("td");
  libgenUrl = libgenUrl ? libgenUrl : DEFAULT_MIRROR.name;
  const buildLibgenUrl = (route="") => !route ? "N/A" : new URL(route, libgenUrl).toString();

  //col 1
  const coverUrl = buildLibgenUrl(contentCols.eq(0).children("a").first().children("img").first().attr("src"));
  // col 2
  const titleCol = contentCols.eq(1);
  const titleColLinks = titleCol.find("a");
  const infoUrl = buildLibgenUrl(titleColLinks.first().attr("href"));
  const id = infoUrl.split("id=").pop();
  const title = titleColLinks.first().text().trimEnd();
  const isbn = titleColLinks.find("i font").first().text();
  
  // if (title.includes("Batman & Dracula")) console.log(titleCol.find("a[title]").first().attr("title")?.trim())
  const times = titleCol.find("a[title]").first().attr("title")?.replace("Add/Edit : ", "").split(";")[0].split("/");
  const timeAdded = times ? times[0] : "N/A";
  const timeLastModified = times ? times[1] : "N/A";
  // col 3
  const author = contentCols.eq(2).text();
  // col 4
  const publisher = contentCols.eq(3).text();
  // col 5
  const year = contentCols.eq(4).text().trim();
  const fileCol = contentCols.eq(4).text().trim().split("/");
  const fileSize = fileCol[1];
  // col 6
  const language = contentCols.eq(5).text();
  // col 7
  const pages = contentCols.eq(6).text();
  // col 9
  const extension = contentCols.eq(8).text();
  // col 10
  const downloadUrl = contentCols.eq(9).find("a").first().attr("href") || "";
  const md5 = downloadUrl.split("md5=").at(-1);
  
  const book: BookEntry = {
    title: title,
    author: author || "N/A",
    year,
    edition: "N/A",
    downloadUrl,
    infoUrl,
    pages,
    language: language || "N/A",
    publisher: publisher || "N/A",
    fileSize: fileSize,
    extension: extension,
    coverUrl: coverUrl,
    md5: md5 || "N/A",
    id,
    timeAdded,
    timeLastModified,
    isbn: isbn || "N/A",
  };
  return book;
};
