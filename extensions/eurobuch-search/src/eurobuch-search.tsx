import {
  List,
  Action,
  ActionPanel,
  Icon,
  Color,
  getPreferenceValues,
  showToast,
  Toast,
  getSelectedText,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { useCachedPromise } from "@raycast/utils";

interface Preferences {
  platform: string;
  password: string;
  resultLimit: string;
}

interface Book {
  title: string;
  author: string;
  isbn: string;
  price: number;
  shipping: number;
  dealer: string;
  platform: string;
  link: string;
  condition?: string;
}

const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch("https://api.ipify.org?format=text");
    return await response.text();
  } catch {
    return "0.0.0.0";
  }
};

const parseEurobuchXML = (xml: string): Book[] => {
  const books: Book[] = [];
  const bookRegex = /<Book\s+([^>]*?)\s*\/>/g;
  let match;

  // Helper to decode XML entities
  const decodeXMLEntities = (str: string): string => {
    return str
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  };

  while ((match = bookRegex.exec(xml)) !== null) {
    const getAttribute = (name: string): string => {
      const regex = new RegExp(`${name}="([^"]*)"`, "i");
      const value = regex.exec(match[1])?.[1] || "";
      return decodeXMLEntities(value);
    };

    const priceStr = getAttribute("price") || getAttribute("priceeur");
    const shippingStr = getAttribute("versandkosten_eur");

    const book: Book = {
      title: getAttribute("title"),
      author: getAttribute("author"),
      isbn: getAttribute("isbn"),
      price: parseFloat(priceStr.replace(",", ".")) || 0,
      shipping: parseFloat(shippingStr.replace(",", ".")) || 0,
      dealer: getAttribute("dealer"),
      platform: getAttribute("platform"),
      link: getAttribute("url"),
      condition: getAttribute("condition"),
    };

    if (book.title && book.link) {
      books.push(book);
    }
  }

  return books;
};

// Helper: Convert ISBN-10 to ISBN-13
const convertISBN10to13 = (isbn10: string): string => {
  // Remove hyphens and spaces
  const clean = isbn10.replace(/[-\s]/g, "");

  // Check if it's a valid ISBN-10 (9 digits + checksum)
  if (clean.length !== 10) return isbn10;

  // Take first 9 digits and prepend 978
  const isbn13base = "978" + clean.substring(0, 9);

  // Calculate ISBN-13 checksum
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn13base[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;

  return isbn13base + checksum;
};

const searchBooks = async (query: string, prefs: Preferences): Promise<Book[]> => {
  if (!query || query.length < 2) {
    return [];
  }

  if (!prefs.platform || !prefs.password) {
    throw new Error("Please configure your Eurobuch credentials in extension preferences");
  }

  // Try to detect and convert ISBN-10 to ISBN-13
  let searchQuery = query;
  const cleanQuery = query.replace(/[-\s]/g, "");

  // If it looks like ISBN-10 (10 chars, last might be X)
  if (cleanQuery.length === 10 && /^\d{9}[\dXx]$/.test(cleanQuery)) {
    const isbn13 = convertISBN10to13(cleanQuery);
    showToast({
      style: Toast.Style.Success,
      title: "ISBN-10 converted",
      message: `${cleanQuery} → ${isbn13}`,
    });
    searchQuery = isbn13;
  }

  const clientIP = await getClientIP();
  const maxResults = parseInt(prefs.resultLimit) || 10;

  const params = new URLSearchParams({
    platform: prefs.platform,
    password: prefs.password,
    isbn: searchQuery,
    author: searchQuery,
    title: searchQuery,
    mediatype: "0",
    clientip: clientIP,
    format: "xml",
    maxresults: maxResults.toString(),
  });

  const response = await fetch(`https://www.eurobuch.de/extreq/meta/extquery.php?${params}`);

  if (!response.ok) {
    throw new Error(`Search failed: HTTP ${response.status}`);
  }

  const xml = await response.text();
  const books = parseEurobuchXML(xml);

  return books.sort((a, b) => a.price + a.shipping - (b.price + b.shipping));
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimer = useRef<NodeJS.Timeout>();
  const initializedRef = useRef(false);

  // Auto-fill from selection or clipboard on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function initializeSearch() {
      try {
        // First try to get selected text
        const selected = await getSelectedText();
        const cleaned = selected.trim();

        // Check if it looks like an ISBN (10 or 13 digits, possibly with X)
        if (/^\d{10}[\dXx]?$|^\d{13}$/.test(cleaned.replace(/[-\s]/g, ""))) {
          setSearchText(cleaned);
          return;
        }
      } catch {
        // No selection, try clipboard
        try {
          const clipboardText = await Clipboard.readText();
          if (clipboardText) {
            const cleaned = clipboardText.trim();

            // Check if clipboard contains an ISBN
            if (/^\d{10}[\dXx]?$|^\d{13}$/.test(cleaned.replace(/[-\s]/g, ""))) {
              setSearchText(cleaned);
              return;
            }
          }
        } catch {
          // No clipboard or error - user will type manually
        }
      }
    }

    initializeSearch();
  }, []);

  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 500);

    return () => clearTimeout(debounceTimer.current);
  }, [searchText]);

  const {
    data: books = [],
    isLoading,
    error,
  } = useCachedPromise(
    async (query: string) => {
      if (!query || query.length < 2) return [];
      return searchBooks(query, preferences);
    },
    [debouncedSearch],
    {
      keepPreviousData: true,
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Search Error",
          message: err.message,
        });
      },
    },
  );

  const priceRange =
    books.length > 1
      ? `€${(books[0].price + books[0].shipping).toFixed(2)} - €${(
          books[books.length - 1].price + books[books.length - 1].shipping
        ).toFixed(2)}`
      : books.length === 1
        ? `€${(books[0].price + books[0].shipping).toFixed(2)}`
        : null;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by ISBN, title, or author..."
      searchText={searchText}
      throttle
      isShowingDetail
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="Search Error"
          description={error.message}
        />
      ) : books.length === 0 && searchText.length < 2 ? (
        <List.EmptyView
          icon={{ source: Icon.Book, tintColor: Color.Blue }}
          title="Search for Books"
          description="Enter at least 2 characters to start searching"
        />
      ) : books.length === 0 && searchText.length >= 2 && !isLoading ? (
        <List.EmptyView
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Orange }}
          title="No Results Found"
          description="Try the Eurobuch website for more results"
          actions={
            <ActionPanel>
              {/^\d+$/.test(searchText.replace(/[-\s]/g, "")) && (
                <Action.OpenInBrowser
                  url={`https://www.eurobuch.de/buch/isbn/${searchText.replace(/[-\s]/g, "")}.html`}
                  title="Search on Eurobuch Website"
                  icon={Icon.Globe}
                />
              )}
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title={priceRange ? `Found ${books.length} results` : undefined}
          subtitle={
            books.length > 0 && books.length < 5 && priceRange
              ? `${priceRange} • Tip: Check Eurobuch website for more offers`
              : priceRange || undefined
          }
        >
          {books.map((book, index) => {
            const total = book.price + book.shipping;
            const totalFormatted = total.toFixed(2);

            return (
              <List.Item
                key={`${book.isbn}-${book.dealer}-${index}`}
                icon={{ source: Icon.Book, tintColor: Color.Blue }}
                title={book.title}
                subtitle={book.author || "Unknown Author"}
                accessories={[
                  { text: `€${totalFormatted}` },
                  { text: book.dealer },
                  ...(book.condition ? [{ tag: { value: book.condition, color: Color.Green } }] : []),
                ]}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Title" text={book.title} />
                        <List.Item.Detail.Metadata.Label title="Author" text={book.author || "Unknown"} />
                        <List.Item.Detail.Metadata.Label title="ISBN" text={book.isbn || "N/A"} />
                        {book.condition && (
                          <List.Item.Detail.Metadata.TagList title="Condition">
                            <List.Item.Detail.Metadata.TagList.Item text={book.condition} color={Color.Green} />
                          </List.Item.Detail.Metadata.TagList>
                        )}
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Price"
                          text={`€${book.price.toFixed(2)}`}
                          icon={{ source: Icon.BankNote, tintColor: Color.Blue }}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Shipping"
                          text={`€${book.shipping.toFixed(2)}`}
                          icon={{ source: Icon.Truck, tintColor: Color.Orange }}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Total"
                          text={`€${totalFormatted}`}
                          icon={{ source: Icon.Euro, tintColor: Color.Green }}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Dealer"
                          text={book.dealer}
                          icon={{ source: Icon.Store, tintColor: Color.Purple }}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Platform"
                          text={book.platform}
                          icon={{ source: Icon.Globe, tintColor: Color.Blue }}
                        />
                        <List.Item.Detail.Metadata.Link title="URL" target={book.link} text="Open in Browser" />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    {book.isbn ? (
                      <Action.OpenInBrowser
                        url={`https://www.eurobuch.de/buch/isbn/${book.isbn}.html`}
                        title="Open on Eurobuch (Price Overview)"
                        icon={Icon.Globe}
                      />
                    ) : null}
                    <Action.OpenInBrowser
                      url={book.link}
                      title={book.isbn ? "Open Direct Offer" : "Open in Browser"}
                      icon={Icon.Store}
                      shortcut={book.isbn ? { modifiers: ["cmd"], key: "o" } : undefined}
                    />
                    <Action.CopyToClipboard
                      title="Copy Link"
                      content={book.link}
                      icon={Icon.Link}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    {book.isbn ? (
                      <Action.CopyToClipboard
                        title="Copy ISBN"
                        content={book.isbn}
                        icon={Icon.Barcode}
                        shortcut={{ modifiers: ["cmd"], key: "i" }}
                      />
                    ) : null}
                    <Action.CopyToClipboard
                      title="Copy All Details"
                      content={`${book.title}\nAuthor: ${book.author || "Unknown"}\nISBN: ${book.isbn || "N/A"}\nCondition: ${
                        book.condition || "N/A"
                      }\nPrice: €${book.price.toFixed(2)}\nShipping: €${book.shipping.toFixed(
                        2,
                      )}\nTotal: €${totalFormatted}\nDealer: ${book.dealer}\nPlatform: ${book.platform}\n\nDirect offer: ${
                        book.link
                      }${book.isbn ? `\nEurobuch overview: https://www.eurobuch.de/buch/isbn/${book.isbn}.html` : ""}`}
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
