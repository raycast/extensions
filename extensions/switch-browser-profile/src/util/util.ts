import { URL } from "url";
import { runAppleScript } from "@raycast/utils";
import path from "path";
import { defaultChromeStatePath } from "../constants";

export const createBookmarkListItem = (url: string, name?: string) => {
  const urlOrigin = new URL(url).origin;
  const urlToDisplay = url.replace(/(^\w+:|^)\/\//, "");
  return {
    url: url,
    title: name ? name : urlToDisplay,
    subtitle: name ? urlToDisplay : undefined,
    iconURL: `${urlOrigin}/favicon.ico`,
  };
};

export const matchSearchText = (searchText: string, url: string, name?: string) => {
  const searchWords = searchText
    .split(" ")
    .flatMap((e) => e.split("/"))
    .flatMap((e) => e.split("."))
    .filter((e) => e)
    .map(lowerCased);

  const nameWords =
    name
      ?.split(" ")
      .map(lowerCased)
      .filter((e) => e) ?? [];

  if (hasMatch(searchWords, nameWords)) {
    return true;
  }

  const urlWords = url
    .replace("https://", "")
    .replace("http://", "")
    .split("/")
    .flatMap((e) => e.split("."))
    .filter((e) => e)
    .map(lowerCased);

  if (hasMatch(searchWords, urlWords)) {
    return true;
  }

  return false;
};

const lowerCased = (text: string) => text.toLowerCase();

const hasMatch = (search: string[], words: string[]) => {
  for (const element of search) {
    for (const word of words) {
      if (word.includes(element)) {
        return true;
      }
    }
  }
  return false;
};

export const isValidUrl = (urlString: string) => {
  try {
    new URL(urlString);
    return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return false;
  }
};

export const formatAsUrl = (str: string) => {
  if (str.startsWith("http://") || str.startsWith("https://")) {
    return str;
  } else {
    return `https://${str}`;
  }
};

export const openGoogleChrome = async (profileDirectory: string, link: string, willOpen: () => Promise<void>) => {
  const script = `
    set theAppPath to quoted form of "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    set theProfile to quoted form of "${profileDirectory}"
    set theLink to quoted form of "${link || "about:blank"}"
    do shell script theAppPath & " --profile-directory=" & theProfile & " " & theLink
    set theWindowID to missing value
    tell application "Google Chrome"
      activate
      set theWindowID to id of front window
    end tell
    return theWindowID
  `;

  try {
    await willOpen();
    const windowId = await runAppleScript(script);
    return windowId;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return null;
  }
};
export const listProfileHistories = async (profileDirectory: string, searchQuery = "") => {
  const script = `
    set profileDir to "${profileDirectory}"
    set searchTerm to "${searchQuery}"

    set historyPath to (POSIX path of (path to library folder from user domain)) & "Application Support/Google/Chrome/" & profileDir & "/History"
    set tempHistory to "/tmp/chrome_history_temp_" & (do shell script "date +%s") & ".db"
    do shell script "cp " & quoted form of historyPath & " " & quoted form of tempHistory
    set historyQuery to "SELECT url, title, datetime(last_visit_time/1000000-11644473600,'unixepoch','localtime') as visit_time FROM urls WHERE url LIKE '%" & searchTerm & "%' OR title LIKE '%" & searchTerm & "%' ORDER BY last_visit_time DESC LIMIT 10;"
    set historyResults to do shell script "sqlite3 -json " & quoted form of tempHistory & " " & quoted form of historyQuery
    try
        do shell script "rm " & quoted form of tempHistory
    end try

    return historyResults
`;
  try {
    const data = await runAppleScript(script);
    return data;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    //
  }
};

export const getAllWindowIds = async () => {
  const script = `
  tell application "Google Chrome"
    set windowIDs to id of every window
  end tell
  return windowIDs`;
  try {
    const data = await runAppleScript(script);
    if (!data) return [];
    return data.split(",").map((id) => parseInt(id, 10)) ?? [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return [];
  }
};
export const switchChromeWindow = async (windowId: number, willOpen: () => Promise<void>) => {
  const script = `
  set targetWindowID to ${windowId}
  tell application "Google Chrome"
      activate
      set index of (first window whose id is targetWindowID) to 1
  end tell`;
  try {
    await willOpen();
    await runAppleScript(script);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    //
  }
};

export function parseHistoryResults(response?: string) {
  try {
    if (!response || response.trim() === "") {
      return [];
    }
    const results: Record<string, string>[] = JSON.parse(response);

    return results.map((item) => {
      let favicon = "";

      try {
        const urlObj = new URL(item.url);
        favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
      } catch (e) {
        console.log(e);
        favicon = "";
      }

      return {
        url: item.url,
        title: item.title || item.url,
        visitTime: item.visitTime,
        icon: favicon,
      };
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return [];
  }
}

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};

export const getLocalStatePath = () => path.join(userLibraryDirectoryPath(), ...defaultChromeStatePath);

export interface ParsedQuery {
  includeTerms: string[];
  excludeTerms: string[];
}

export function parseSearchQuery(query: string): ParsedQuery {
  if (!query) {
    return { includeTerms: [], excludeTerms: [] };
  }

  const terms = query.trim().split(/\s+/);
  const includeTerms: string[] = [];
  const excludeTerms: string[] = [];

  for (const term of terms) {
    if (term.startsWith("\\-") && term.length > 1) {
      includeTerms.push(term.slice(1).toLowerCase());
    } else if (term.startsWith("-") && term.length > 1) {
      excludeTerms.push(term.slice(1).toLowerCase());
    } else if (term.length > 0 && term !== "-") {
      includeTerms.push(term.toLowerCase());
    }
  }

  return { includeTerms, excludeTerms };
}

export function matchesQuery(text: string, parsedQuery: ParsedQuery): boolean {
  const { includeTerms, excludeTerms } = parsedQuery;

  const hasAllIncludeTerms = includeTerms.length === 0 || includeTerms.every((term) => text.includes(term));
  const hasNoExcludeTerms = excludeTerms.length === 0 || !excludeTerms.some((term) => text.includes(term));

  return hasAllIncludeTerms && hasNoExcludeTerms;
}
