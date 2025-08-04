import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { WeReadBook, WeReadBookmark, WeReadThought } from "../types";
import https from "https";
import { URL } from "url";
import zlib from "zlib";

// API Response interfaces
interface WeReadSessionInfo {
  initialized?: boolean;
  [key: string]: unknown;
}

interface WeReadBookData {
  bookId: string;
  noteCount: number;
  book: {
    title: string;
    author: string;
    cover: string;
    translator?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface WeReadShelfResponse {
  books?: WeReadBookData[];
  [key: string]: unknown;
}

interface WeReadBookmarkItem {
  bookmarkId: string;
  chapterUid: number;
  markText: string;
  createTime: number;
  colorStyle: number;
  type: number;
  range: string;
  bookVersion: number;
  style: number;
  [key: string]: unknown;
}

interface WeReadReviewItem {
  reviewId: string;
  bookId: string;
  chapterUid: number;
  chapterTitle: string;
  chapterIdx: number;
  abstract: string;
  content: string;
  createTime: number;
  review: {
    reviewId: string;
    content: string;
  };
  [key: string]: unknown;
}

interface WeReadBookmarkResponse {
  updated: WeReadBookmarkItem[];
  chapters: Array<{ uid: number; title: string; level: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

interface WeReadThoughtResponse {
  reviews: WeReadReviewItem[];
  [key: string]: unknown;
}

const BASE_URL = "https://weread.qq.com";

export class WeReadAPI {
  private cookie: string;
  private sessionInfo: WeReadSessionInfo | null = null;

  constructor(cookie: string) {
    this.cookie = cookie;
  }

  private updateCookieFromResponse(setCookieHeaders: string[]) {
    if (!setCookieHeaders || setCookieHeaders.length === 0) return;

    console.log(`[WeRead API] Updating cookies from response:`, setCookieHeaders);

    // Parse current cookies into a map
    const cookieMap = new Map();
    this.cookie.split(";").forEach((cookie) => {
      const [name, value] = cookie.trim().split("=");
      if (name && value) {
        cookieMap.set(name, value);
      }
    });

    // Update with new cookies from response
    setCookieHeaders.forEach((setCookie) => {
      const [cookiePart] = setCookie.split(";");
      const [name, value] = cookiePart.split("=");
      if (name && value) {
        console.log(`[WeRead API] Updating cookie ${name} = ${value}`);
        cookieMap.set(name.trim(), value.trim());
      }
    });

    // Rebuild cookie string
    this.cookie = Array.from(cookieMap.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");

    console.log(`[WeRead API] Updated cookie string:`, this.cookie);
  }

  private getHeaders(isBookmarksRequest: boolean = false) {
    const baseHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "application/json, text/plain, */*",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Sec-Ch-Ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"macOS"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      DNT: "1",
      Cookie: this.cookie,
    };

    // For bookmarks requests, use the EXACT headers from browser
    if (isBookmarksRequest) {
      return {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
        DNT: "1",
        Priority: "u=0, i",
        "Sec-Ch-Ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        Cookie: this.cookie,
      };
    }

    return baseHeaders;
  }

  private async makeHttpsRequest<T>(
    endpoint: string,
    method: string = "GET",
    isBookmarksRequest: boolean = false,
    returnText: boolean = false,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${BASE_URL}${endpoint}`);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: this.getHeaders(isBookmarksRequest),
      };

      console.log(`[WeRead API] Making HTTPS request to: ${url.toString()}`);
      console.log(`[WeRead API] Headers:`, options.headers);

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];

        console.log(`[WeRead API] Response status: ${res.statusCode}`);
        console.log(`[WeRead API] Response headers:`, res.headers);

        res.on("data", (chunk) => {
          chunks.push(chunk);
        });

        res.on("end", () => {
          try {
            const buffer = Buffer.concat(chunks);
            let data = "";

            // Handle gzip/deflate compression
            const encoding = res.headers["content-encoding"];
            if (encoding === "gzip") {
              data = zlib.gunzipSync(buffer).toString();
            } else if (encoding === "deflate") {
              data = zlib.inflateSync(buffer).toString();
            } else if (encoding === "br") {
              data = zlib.brotliDecompressSync(buffer).toString();
            } else {
              data = buffer.toString();
            }

            // Update cookies from response
            const setCookieHeaders = res.headers["set-cookie"];
            if (setCookieHeaders) {
              this.updateCookieFromResponse(setCookieHeaders);
            }

            if (returnText) {
              console.log(`[WeRead API] Returning raw text response`);
              resolve(data as T);
            } else {
              console.log(`[WeRead API] Decompressed response:`, data);
              const jsonData = JSON.parse(data);
              console.log(`[WeRead API] Parsed JSON:`, jsonData);
              resolve(jsonData);
            }
          } catch (parseError) {
            console.error(`[WeRead API] JSON parse error:`, parseError);
            reject(new Error(`Failed to parse response: ${parseError}`));
          }
        });
      });

      req.on("error", (error) => {
        console.error(`[WeRead API] Request error:`, error);
        reject(error);
      });

      req.end();
    });
  }

  // Initialize session by accessing main page and getting session info
  private async initializeSession(): Promise<void> {
    if (this.sessionInfo) return;

    try {
      console.log(`[WeRead API] Initializing session...`);

      // First, access the main page to establish session
      await this.makeHttpsRequest<string>("/", "GET", false, true);
      console.log(`[WeRead API] Main page accessed successfully`);

      // Then get user info to warm up the session
      try {
        const userResponse = await this.makeHttpsRequest<WeReadSessionInfo>("/api/user");
        console.log(`[WeRead API] User info retrieved:`, userResponse);
        this.sessionInfo = userResponse;
      } catch {
        console.log(`[WeRead API] User info not available, but main page accessed`);
        this.sessionInfo = { initialized: true };
      }
    } catch (error) {
      console.error(`[WeRead API] Failed to initialize session:`, error);
      throw error;
    }
  }

  async getNotebooks(): Promise<WeReadBook[]> {
    try {
      console.log(`[WeRead API] Requesting notebooks with HTTPS module`);

      // Initialize session first
      await this.initializeSession();

      const response = await this.makeHttpsRequest<WeReadShelfResponse>("/api/user/notebook");

      // Handle different possible response structures
      let books: WeReadBookData[] = [];
      if (response.books) {
        books = response.books;
      } else if (Array.isArray(response)) {
        books = response;
      } else {
        console.error("Unexpected response structure:", response);
        throw new Error("Unexpected API response structure");
      }

      if (!books || books.length === 0) {
        await showFailureToast(new Error("No Books Found"), {
          title: "No books with highlights found in your WeRead library.",
        });
        return [];
      }

      // Map and validate the book data
      const validBooks: WeReadBook[] = books
        .filter((item: WeReadBookData) => {
          const isValid = item.bookId && item.book && item.book.title;
          if (!isValid) {
            console.warn("Filtering out invalid book:", item);
          }
          return isValid;
        })
        .map((item: WeReadBookData) => {
          // Handle author with translator if available
          let author = item.book.author || "Unknown Author";
          if (item.book.translator) {
            author += ` (译: ${item.book.translator})`;
          }

          const book = {
            bookId: item.bookId, // Use bookId from top level
            title: item.book.title || "Unknown Title",
            author: author,
            cover: item.book.cover || "",
            noteCount: item.noteCount || 0, // Use noteCount from top level
          };

          // Double check the title exists
          if (!book.title || book.title === "Unknown Title") {
            console.warn("Book with missing/unknown title:", item);
          }

          return book;
        });

      console.log(`Successfully processed ${validBooks.length} out of ${books.length} books`);

      // Log first few books for debugging
      if (validBooks.length > 0) {
        console.log("Sample books:", validBooks.slice(0, 3));
      }

      return validBooks;
    } catch (error) {
      console.error("Failed to get WeRead notebooks:", error);
      throw error;
    }
  }

  async getBookInfo(bookId: string): Promise<{ title: string; author: string; cover: string }> {
    const response = await this.makeHttpsRequest<{
      title: string;
      author: string;
      cover: string;
    }>(`/web/book/info?bookId=${bookId}`);

    return response;
  }

  async getBookmarks(bookId: string): Promise<WeReadBookmark[]> {
    try {
      const endpoint = `/web/book/bookmarklist?bookId=${bookId}`;
      console.log(`[WeRead API] Requesting highlights for book ${bookId} using HTTPS module with browser headers`);

      // Initialize session first (like a browser refresh/login)
      await this.initializeSession();

      // Also try to access the book page first to establish context
      try {
        console.log(`[WeRead API] Accessing book page to establish context...`);
        await this.makeHttpsRequest<string>(`/web/reader/${bookId}`, "GET", false, true);
        console.log(`[WeRead API] Book page accessed successfully`);
      } catch (pageError) {
        console.log(`[WeRead API] Book page access failed, continuing anyway:`, pageError);
      }

      const jsonResponse = await this.makeHttpsRequest<WeReadBookmarkResponse>(endpoint, "GET", true);

      return this.processBookmarksResponse(jsonResponse);
    } catch (e) {
      console.error("get book highlight error for bookId:", bookId, e);
      return [];
    }
  }

  private processBookmarksResponse(response: WeReadBookmarkResponse): WeReadBookmark[] {
    console.log("Processing bookmarks response:", {
      hasUpdated: !!response.updated,
      updatedLength: response.updated?.length || 0,
      hasChapters: !!response.chapters,
      chaptersLength: response.chapters?.length || 0,
      hasError: !!(response.errCode || response.errcode),
      errorCode: response.errCode || response.errcode,
      errorMsg: response.errMsg,
    });

    // If there's an error code (including -2012), log it but continue processing
    if (response.errCode || response.errcode) {
      console.log(
        `[WeRead API] Response contains error ${response.errCode || response.errcode}: ${response.errMsg || "Unknown error"}`,
      );

      // If it's a -2012 error, show a toast but don't crash
      if (response.errCode === -2012 || response.errcode === -2012) {
        showFailureToast(new Error("Book Highlights Unavailable"), {
          title: "Cannot access highlights for this book at the moment.",
        });
      }

      return []; // Return empty array for any error
    }

    // If no bookmarks found, return empty array
    if (!response.updated || response.updated.length === 0) {
      console.log("No bookmarks found in response");
      return [];
    }

    // Create a map of chapterUid to chapter info
    const chapterMap = new Map();
    if (response.chapters && Array.isArray(response.chapters)) {
      response.chapters.forEach((chapter) => {
        chapterMap.set(chapter.chapterUid, {
          title: chapter.title,
          idx: chapter.chapterIdx,
        });
      });
    }

    console.log(`Successfully processing ${response.updated.length} bookmarks`);

    return response.updated.map((item: WeReadBookmarkItem) => {
      const chapterInfo = chapterMap.get(item.chapterUid);
      return {
        bookmarkId: item.bookmarkId,
        chapterUid: item.chapterUid,
        chapterTitle: chapterInfo?.title || "Unknown Chapter",
        chapterIdx: chapterInfo?.idx || 0,
        markText: item.markText,
        createTime: item.createTime,
        colorStyle: item.colorStyle,
        type: item.type,
        range: item.range,
        bookVersion: item.bookVersion || 0,
        style: item.style || 0,
      };
    });
  }

  async getReviews(bookId: string): Promise<WeReadThought[]> {
    try {
      const response = await this.makeHttpsRequest<WeReadThoughtResponse>(
        `/web/review/list?bookId=${bookId}&listType=11&mine=1&synckey=0`,
      );

      console.log(`[WeRead API] Reviews response for book ${bookId}:`, response);

      // Handle error responses
      if (response.errCode || response.errcode) {
        console.log(
          `[WeRead API] Reviews API error: ${response.errCode || response.errcode} - ${response.errMsg || "Unknown error"}`,
        );
        return [];
      }

      // Check if reviews exist and is an array
      if (!response.reviews || !Array.isArray(response.reviews)) {
        console.log(`[WeRead API] No reviews found or invalid reviews structure for book ${bookId}`);
        return [];
      }

      return response.reviews.map((review: WeReadReviewItem) => ({
        reviewId: review.reviewId,
        bookId: review.bookId,
        chapterUid: review.chapterUid,
        chapterTitle: review.chapterTitle,
        chapterIdx: review.chapterIdx,
        abstract: review.abstract,
        content: review.content,
        createTime: review.createTime,
        review: review.review,
      }));
    } catch (error) {
      console.error(`[WeRead API] Failed to get reviews for book ${bookId}:`, error);
      return [];
    }
  }

  async getBookData(bookId: string): Promise<{ bookmarks: WeReadBookmark[]; thoughts: WeReadThought[] }> {
    const [bookmarks, thoughts] = await Promise.all([this.getBookmarks(bookId), this.getReviews(bookId)]);

    return { bookmarks, thoughts };
  }
}

// Hook for fetching notebooks with caching
export function useWeReadBooks(cookie?: string) {
  return useCachedPromise(
    async () => {
      if (!cookie) {
        throw new Error("WeRead cookie not configured");
      }
      const api = new WeReadAPI(cookie);
      return api.getNotebooks();
    },
    [],
    {
      execute: !!cookie,
      keepPreviousData: true,
    },
  );
}

// Hook for fetching book data with caching
export function useWeReadBookData(bookId: string, cookie?: string) {
  return useCachedPromise(
    async (id: string) => {
      if (!cookie) {
        throw new Error("WeRead cookie not configured");
      }
      const api = new WeReadAPI(cookie);
      return api.getBookData(id);
    },
    [bookId],
    {
      execute: !!cookie && !!bookId,
      keepPreviousData: true,
    },
  );
}
