import { describe, test, expect } from "vitest";
import { promisify } from "util";
import * as path from "path";
import { readFile } from "simple-plist";
import { PLIST_PATH } from "../constants";
import { Bookmark, BookmarkPListResult, GeneralBookmark, ReadingListBookmark } from "../types";
import { chain } from "lodash";
import { execSync } from "child_process";

const readPlist = promisify(readFile);

// pure functions, import @raycast/api would damage test
const parseUrl = (url: string) => {
  try {
    return new URL(url);
  } catch (err) {
    return null;
  }
};

const getUrlDomain = (url: string) => {
  const parsedUrl = parseUrl(url);
  if (parsedUrl && parsedUrl.hostname) {
    return parsedUrl.hostname.replace(/^www\./, "");
  }
};

function extractReadingListBookmarks(
  bookmarks: BookmarkPListResult,
  readingListOnly?: boolean,
): (ReadingListBookmark | GeneralBookmark)[] {
  if (readingListOnly) {
    return chain(bookmarks.Children)
      .find(["Title", "com.apple.ReadingList"])
      .thru((res) => res.Children as Bookmark[])
      .map((res) => ({
        uuid: res.WebBookmarkUUID,
        url: res.URLString,
        domain: getUrlDomain(res.URLString),
        title: res.ReadingListNonSync?.Title || res.URIDictionary.title,
        dateAdded: res.ReadingList.DateAdded,
        dateLastViewed: res.ReadingList.DateLastViewed,
        description: res.ReadingList.PreviewText || "",
      }))
      .orderBy("dateAdded", "desc")
      .value();
  }

  const flattenBookmarks = (
    node:
      | BookmarkPListResult
      | {
          Title: string;
          Children: Bookmark[] | BookmarkPListResult;
        },
    parent?:
      | BookmarkPListResult
      | {
          Title: string;
          Children: Bookmark[] | BookmarkPListResult;
        },
  ) => {
    const arr: GeneralBookmark[] = [];
    if ("Title" in node && node.Title == "com.apple.ReadingList") {
      // Ignore reading list items
    } else {
      if ("Children" in node) {
        (node.Children as []).forEach((child) => arr.push(...flattenBookmarks(child, node)));
      } else if ((node as Bookmark).WebBookmarkType == "WebBookmarkTypeLeaf") {
        const res = node as Bookmark;
        const resParent = parent as BookmarkPListResult;
        arr.push({
          uuid: res.WebBookmarkUUID,
          url: res.URLString,
          domain: getUrlDomain(res.URLString),
          title: "Title" in res ? (res.Title as string) : res.URIDictionary.title,
          folder: resParent.Title,
        });
      }
    }
    return arr;
  };

  return chain(flattenBookmarks(bookmarks)).value() as GeneralBookmark[];
}

describe("test bookmarks parser", () => {
  test("read bookmarks from mock data", async () => {
    const mockBookmarksPath = path.resolve(__dirname, "../mock/safari_bookmarks.plist");
    const plistContent = await readPlist(mockBookmarksPath);
    expect(plistContent).toBeDefined();
    expect(plistContent).toMatchInlineSnapshot(`
      {
        "Children": [
          {
            "Children": [
              {
                "URIDictionary": {
                  "title": "GitHub",
                },
                "URLString": "https://github.com",
              },
              {
                "URIDictionary": {
                  "title": "Stack Overflow",
                },
                "URLString": "https://stackoverflow.com",
              },
            ],
            "Title": "Favorites",
          },
          {
            "Children": [
              {
                "URIDictionary": {
                  "title": "Jira",
                },
                "URLString": "https://jira.company.com",
              },
            ],
            "Title": "Work Bookmarks",
          },
        ],
      }
    `);
  });

  test("read bookmarks via go parser", async () => {
    const mockBookmarksPath = path.resolve(__dirname, "../mock/safari_bookmarks.plist");
    const GO_PARSER_PATH = path.join(__dirname, "../tools", "bookmarks-parser");
    const result = execSync(`${GO_PARSER_PATH} -input ${mockBookmarksPath}`, { encoding: "utf-8" });
    expect(result).toBeDefined();
    expect(result).toMatchInlineSnapshot(`
      "{
        "Children": [
          {
            "Children": [
              {
                "URIDictionary": {
                  "title": "GitHub"
                },
                "URLString": "https://github.com"
              },
              {
                "URIDictionary": {
                  "title": "Stack Overflow"
                },
                "URLString": "https://stackoverflow.com"
              }
            ],
            "Title": "Favorites"
          },
          {
            "Children": [
              {
                "URIDictionary": {
                  "title": "Jira"
                },
                "URLString": "https://jira.company.com"
              }
            ],
            "Title": "Work Bookmarks"
          }
        ]
      }
      "
    `);
    const simplePlistResult = await readPlist(mockBookmarksPath);
    expect(JSON.parse(result)).toMatchObject(simplePlistResult as object);
  });

  test("user bookmarks", async () => {
    const simplePListResult = await readPlist(PLIST_PATH);
    const parsedSimplePListResult = extractReadingListBookmarks(simplePListResult as BookmarkPListResult);

    const GO_PARSER_PATH = path.join(__dirname, "../tools", "bookmarks-parser");
    const result = execSync(`${GO_PARSER_PATH} -input ${PLIST_PATH}`, { encoding: "utf-8" });
    const parsedGoResult = extractReadingListBookmarks(JSON.parse(result) as BookmarkPListResult);

    // result must be equal
    expect(parsedGoResult).toMatchObject(parsedSimplePListResult);
  });
});
