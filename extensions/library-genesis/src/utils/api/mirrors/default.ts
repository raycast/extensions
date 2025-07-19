import type { Cheerio } from "cheerio";
import { load } from "cheerio";
import type { Element } from "domhandler";

import type { BookEntry } from "@/types";
import { DEFAULT_MIRROR } from "@/utils/constants";

export const parseContentIntoBooks = (content: string, libgenUrl?: string): BookEntry[] => {
  const books: BookEntry[] = [];
  const $ = load(content);

  // get all the book elements from the page
  const bookElements = $("#tablelibgen tbody tr");
  // get the book entries from the table
  for (let i = 0; i < bookElements.length; i++) {
    const bookElement = bookElements.eq(i);
    const book = parseBookFromRow(bookElement, libgenUrl);
    books.push(book);
  }

  return books;
};

const parseBookFromRow = (row: Cheerio<Element>, libgenUrl?: string): BookEntry => {
  const bookElement = row;
  const contentCols = bookElement.children("td");
  libgenUrl = libgenUrl ? libgenUrl : DEFAULT_MIRROR.name;
  const buildLibgenUrl = (route = "") => (!route ? "N/A" : new URL(route, libgenUrl).toString());

  //col 1
  const coverUrl = buildLibgenUrl(contentCols.eq(0).children("a").first().children("img").first().attr("src"));
  // col 2
  const titleCol = contentCols.eq(1);
  const titleColLinks = titleCol.find("a");
  const infoUrl = buildLibgenUrl(titleColLinks.first().attr("href"));
  const id = infoUrl.split("id=").pop();
  const title = titleCol.children("b").first().text() || titleColLinks.first().text().trimEnd(); //. title sometimes inside <b> and sometimes inside <a>
  const isbn = titleColLinks.find("i font").first().text();
  const times = titleCol.find("a[title]").first().attr("title")?.replace("Add/Edit : ", "").split(";")[0].split("/");
  const timeAdded = times ? times[0] : "N/A";
  const timeLastModified = times ? times[1] : "N/A";
  // col 3
  const author = contentCols.eq(2).text();
  // col 4
  const publisher = contentCols.eq(3).text();
  // col 5
  const year = contentCols.eq(4).text().trim();
  // col 6
  const language = contentCols.eq(5).text();
  // col 7
  const pages = contentCols.eq(6).text();
  // col 8
  const fileSize = contentCols.eq(7).find("a").first().text();
  // col 9
  const extension = contentCols.eq(8).text();
  // col 10
  const downloadUrl = buildLibgenUrl(contentCols.eq(9).find("a").first().attr("href"));
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
