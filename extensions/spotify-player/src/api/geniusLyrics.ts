import fetch from "node-fetch";

// Rate limiting: track last request time to prevent API blocks
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

async function rateLimitedDelay(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const delay = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  lastRequestTime = Date.now();
}

export interface GeniusLyricsResult {
  lyrics: string | null;
  url?: string;
}

/**
 * Search for lyrics on Genius using improved web scraping
 */
export async function searchGeniusLyrics(songTitle: string, artistName: string): Promise<GeniusLyricsResult> {
  try {
    // Apply rate limiting to prevent API blocks
    await rateLimitedDelay();
    // Clean search terms
    const cleanTitle = songTitle.replace(/[([].+?[)\]]/g, "").trim();
    const cleanArtist = artistName.replace(/[([].+?[)\]]/g, "").trim();

    // Create search query for Genius
    const searchQuery = `${cleanTitle} ${cleanArtist}`;
    const encodedQuery = encodeURIComponent(searchQuery);

    // Try the Genius API first
    try {
      const apiUrl = `https://genius.com/api/search/multi?per_page=5&q=${encodedQuery}`;
      const apiResponse = await fetch(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept: "application/json",
        },
      });

      if (apiResponse.ok) {
        const apiData = (await apiResponse.json()) as Record<string, unknown>;
        const response = apiData?.response as {
          sections?: Array<{ type: string; hits?: Array<{ result: { url: string } }> }>;
        };
        const songs = response?.sections?.find((section) => section.type === "song")?.hits;

        if (songs && songs.length > 0) {
          const firstSong = songs[0].result;
          const songUrl = firstSong.url;

          // Try to get lyrics from the song page
          const lyricsResult = await extractLyricsFromPage(songUrl);
          if (lyricsResult.lyrics) {
            return lyricsResult;
          }
        }
      }
    } catch {
      // Silently fall back to web search if API fails
    }

    // Fallback to web search
    const searchUrl = `https://genius.com/search?q=${encodedQuery}`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`Search request failed: ${searchResponse.status}`);
    }

    const searchHtml = await searchResponse.text();

    // Look for song URLs in search results
    const urlPatterns = [
      /href="(\/[^"]*lyrics[^"]*)"/g,
      /href="(https:\/\/genius\.com\/[^"]*lyrics[^"]*)"/g,
      /"url":"(https:\/\/genius\.com\/[^"]*lyrics[^"]*)"/g,
    ];

    let songUrl = null;

    for (const pattern of urlPatterns) {
      const match = pattern.exec(searchHtml);
      if (match) {
        songUrl = match[1];
        if (!songUrl.startsWith("http")) {
          songUrl = `https://genius.com${songUrl}`;
        }
        break;
      }
    }

    if (!songUrl) {
      return { lyrics: null };
    }

    // Extract lyrics from the song page
    return await extractLyricsFromPage(songUrl);
  } catch (error) {
    console.error("Error searching for lyrics:", error);
    return { lyrics: null };
  }
}

async function extractLyricsFromPage(songUrl: string): Promise<GeniusLyricsResult> {
  try {
    // Apply rate limiting for page fetches too
    await rateLimitedDelay();
    const lyricsResponse = await fetch(songUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });

    if (!lyricsResponse.ok) {
      return { lyrics: null, url: songUrl };
    }

    const lyricsHtml = await lyricsResponse.text();

    // Try multiple methods to extract lyrics
    let lyrics = "";

    // Method 1: Look for data-lyrics-container divs (new Genius format)
    const lyricsContainerRegex = /<div[^>]*data-lyrics-container="true"[^>]*>(.*?)<\/div>/gs;
    const lyricsMatches = [...lyricsHtml.matchAll(lyricsContainerRegex)];

    if (lyricsMatches.length > 0) {
      // Combine ALL lyrics containers to get the complete song
      lyrics = lyricsMatches.map((match) => match[1]).join("\n");
    }

    // Method 2: Look for Lyrics__Container class (React component)
    if (!lyrics || lyrics.length < 20) {
      const reactLyricsRegex = /<div[^>]*class="[^"]*Lyrics__Container[^"]*"[^>]*>(.*?)<\/div>/gs;
      const reactMatches = [...lyricsHtml.matchAll(reactLyricsRegex)];

      if (reactMatches.length > 0) {
        lyrics = reactMatches.map((match) => match[1]).join("\n\n");
      }
    }

    // Method 3: Look for JSON data in script tags
    if (!lyrics || lyrics.length < 20) {
      const jsonDataRegex = /window\.__PRELOADED_STATE__\s*=\s*({.*?});/s;
      const jsonMatch = lyricsHtml.match(jsonDataRegex);

      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]);

          // Navigate through different possible JSON structures
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const songPageData = data as any;
          const possiblePaths = [
            songPageData?.songPage?.lyricsData?.body?.html,
            songPageData?.entities?.songs &&
              Object.values(songPageData.entities.songs)[0] &&
              (Object.values(songPageData.entities.songs)[0] as Record<string, unknown>)?.lyrics,
            songPageData?.songPage?.song?.lyrics,
          ];

          for (const path of possiblePaths) {
            if (path && typeof path === "string" && path.length > 10) {
              lyrics = path;

              break;
            }
          }
        } catch {
          // Ignore JSON parsing errors and continue with other methods
        }
      }
    }

    // Method 4: Generic lyrics class search
    if (!lyrics || lyrics.length < 20) {
      const genericLyricsRegex = /<div[^>]*class="[^"]*lyrics[^"]*"[^>]*>(.*?)<\/div>/gis;
      const genericMatches = [...lyricsHtml.matchAll(genericLyricsRegex)];

      if (genericMatches.length > 0) {
        lyrics = genericMatches.map((match) => match[1]).join("\n\n");
      }
    }

    // Clean up the lyrics while preserving structure
    if (lyrics && lyrics.length > 20) {
      // Preserve the raw structure and be more careful with cleaning
      lyrics = lyrics
        // Convert HTML line breaks to actual line breaks - preserve verse structure
        .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "\n\n") // Double br tags = verse break
        .replace(/<br\s*\/?>/gi, "\n") // Single br tag = line break
        .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n") // Paragraph breaks = verse breaks
        .replace(/<\/p>/gi, "\n")
        .replace(/<p[^>]*>/gi, "")
        // Remove specific HTML tags but keep content
        .replace(/<\/?(?:div|span|strong|b|i|em)[^>]*>/gi, "")
        .replace(/<[^>]*>/g, "") // Remove remaining HTML tags
        // Decode HTML entities
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&#39;/g, "'")
        // Clean up spacing but preserve verse structure
        .replace(/[ \t]+/g, " ") // Multiple spaces to single space
        .replace(/\n[ \t]+/g, "\n") // Remove leading spaces on lines
        .replace(/[ \t]+\n/g, "\n") // Remove trailing spaces on lines
        .replace(/\n{5,}/g, "\n\n\n") // Limit excessive line breaks
        .trim();

      // Format section headers and clean up - apply to all lyrics regardless of length
      lyrics = lyrics
        // Match any text in brackets that looks like a section header
        .replace(/(\[[A-Za-z][^\]]*\])/g, "\n\n$1\n")
        // Handle producer tags in parentheses
        .replace(/(\([^)]*(?:produced|prod|feat|ft)[^)]*\))/gi, "\n$1\n")
        // Clean up excessive line breaks but preserve song structure
        .replace(/\n{4,}/g, "\n\n\n")
        .replace(/^\n+/, "") // Remove leading line breaks
        .replace(/\n+$/, "") // Remove trailing line breaks
        .trim();

      if (lyrics.length > 5) {
        return { lyrics, url: songUrl };
      }
    }

    return { lyrics: null, url: songUrl };
  } catch (error) {
    console.error("Error extracting lyrics:", error);
    return { lyrics: null, url: songUrl };
  }
}
