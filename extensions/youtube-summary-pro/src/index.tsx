import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Detail,
  AI,
  Icon,
  LocalStorage,
  environment,
} from "@raycast/api";
import { useState, ReactElement, useEffect, useCallback } from "react";
import { YoutubeTranscript } from "youtube-transcript";

// YouTube URL validation regex
const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})([?&].*)?$/;

// Maximum characters per chunk
const MAX_CHUNK_SIZE = 10000;

// Debounce delay
const HISTORY_SAVE_DEBOUNCE_MS = 1000;

// --- Prompts ---
const DETAIL_PROMPT = `Extract the specific, valuable information as a well-organized, detailed summary with moderate formatting. Focus on capturing details useful for understanding the core concepts and advice.

GUIDELINES:

1. USE a mix of paragraphs and selective bullet points for clarity. Bullets are ideal for lists, steps, or breaking down complex points.
2. BOLD only key terms or concepts central to the discussion (max 5-6 per section).
3. GROUP related information logically within this segment's summary.
4. INCLUDE specific, actionable details and advice:
   - Clearly explain techniques and HOW to apply them, based on the speaker's words.
   - Detail important examples, anecdotes, or case studies with sufficient context to illustrate the point being made.
   - Include relevant direct or closely paraphrased quotes that capture key insights or the speaker's perspective.
5. MAINTAIN a clear, informative tone. Focus on accuracy and completeness of information within this segment.
6. CAPTURE nuances, warnings, or the speaker's specific perspective/framing on concepts discussed.
7. AVOID overly vague statements; prioritize concrete information from the transcript.

Your response should provide enough detail for someone to understand the main points, examples, and advice presented in this part of the video.
`;

const OVERVIEW_PROMPT = `Create a comprehensive, useful summary of this transcript that preserves ALL valuable information while improving organization and readability, focusing on depth and clarity.

1.  **Executive Summary:** Start with a concise paragraph (no heading needed) capturing the video's core topic, main themes, and overall message or purpose.

2.  **Organized Thematic Sections:** Structure the main body using clear section headings (H2 level, like '## Section Title'). Within each section:
    *   Clearly explain ALL key insights, concepts, and arguments discussed, reflecting the speaker's specific definitions or framing.
    *   Integrate ALL important examples, case studies, and anecdotes mentioned, providing enough context to make the point understandable. Use bullet points to list examples if appropriate.
    *   Use bullet points and sub-bullets generously to break down complex ideas, steps, or related points for clarity and scannability.
    *   Capture the speaker's specific nuances, warnings, or philosophical stance related to the topic.

3.  **Actionable Insights/Takeaways:** Include a dedicated section titled '## Actionable Insights & Key Takeaways'. List the most practical advice points using bullet points. For each point, briefly state the *action* and the *intended benefit, reason, or context* based on the speaker's explanation.

4.  **Notable Quotes:** Include a section titled '## Notable Quotes'. List a few (3-5) of the most impactful or representative direct quotes from the speaker.

GUIDELINES for Generation:
- Prioritize specific details, explanations, and examples over high-level generalizations.
- Ensure the summary is detailed enough to be genuinely useful for understanding the content without re-watching.
- Maintain logical flow, grouping related ideas thematically.
- Preserve technical information or specific terminology used by the speaker accurately.
- DO NOT add a title like "Comprehensive Summary" - flow directly from the executive summary.
`;

// --- Interfaces ---
interface TranscriptChunk {
  text: string;
  startTime: number;
  endTime: number;
}

interface SummaryHistoryItem {
  id: string;
  url: string;
  title: string;
  summary: string;
  overview: string;
  detailedChunks: { startTime: number; endTime: number; summary: string }[];
  timestamp: number;
  status?:
    | "pending"
    | "fetching_info"
    | "fetching_transcript"
    | "chunking"
    | "summarizing"
    | "overview"
    | "done"
    | "error";
  displayIcon?: keyof typeof Icon;
}

interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
}

// --- Keyword to Icon Mapping ---
// Using Icon.Heart for fitness/workout as Icon.Run/Activity caused issues
const keywordIconMap: { [key: string]: Icon } = {
  // Programming / Tech
  tutorial: Icon.Book,
  "how to": Icon.Book,
  guide: Icon.Book,
  learn: Icon.Book,
  code: Icon.Code,
  coding: Icon.Code,
  programming: Icon.Code,
  develop: Icon.Code,
  software: Icon.ComputerChip,
  hardware: Icon.ComputerChip,
  "ai ": Icon.Bolt,
  "artificial intelligence": Icon.Bolt,
  "machine learning": Icon.Bolt,
  "data science": Icon.BarChart,
  review: Icon.MagnifyingGlass,
  unboxing: Icon.Box,
  apple: Icon.ComputerChip,
  google: Icon.ComputerChip,
  microsoft: Icon.ComputerChip,
  linux: Icon.ComputerChip,
  "web ": Icon.Globe,
  "app ": Icon.Mobile,
  crypto: Icon.Coins,
  blockchain: Icon.Link,
  // Creative / Media
  music: Icon.Music,
  song: Icon.Music,
  album: Icon.Music,
  band: Icon.Music,
  podcast: Icon.Microphone,
  interview: Icon.Bubble,
  movie: Icon.Video,
  film: Icon.Video,
  cinema: Icon.Video,
  trailer: Icon.Video,
  art: Icon.Brush,
  draw: Icon.Brush,
  paint: Icon.Brush,
  design: Icon.Brush,
  photography: Icon.Camera,
  gaming: Icon.GameController,
  gameplay: Icon.GameController,
  stream: Icon.GameController,
  // News / Info / Business
  news: Icon.List,
  update: Icon.List,
  report: Icon.List,
  finance: Icon.Wallet,
  business: Icon.Folder,
  stock: Icon.BarChart,
  market: Icon.BarChart,
  economy: Icon.BarChart,
  invest: Icon.Coins,
  money: Icon.Coins,
  startup: Icon.Rocket,
  // Lifestyle / Other
  sports: Icon.SoccerBall,
  football: Icon.SoccerBall,
  nba: Icon.Star,
  cooking: Icon.Leaf,
  recipe: Icon.Leaf,
  food: Icon.Leaf,
  travel: Icon.Airplane,
  vlog: Icon.Person,
  health: Icon.Heartbeat,
  fitness: Icon.Heart,
  workout: Icon.Heart, // Using Heart as fallback
  "car ": Icon.Car,
  auto: Icon.Car,
  house: Icon.House,
  home: Icon.House,
  diy: Icon.Hammer,
  history: Icon.BulletPoints,
  science: Icon.Gauge,
  space: Icon.Moon,
  documentary: Icon.BulletPoints,
};

// --- Helper Functions ---

function determineIconFromText(title: string, description: string): Icon {
  const combinedText = `${title.toLowerCase()} ${description?.toLowerCase() || ""}`; // Handle potentially undefined description
  for (const keyword in keywordIconMap) {
    try {
      const regex = new RegExp(
        `\\b${keyword.replace(/[-\\/^$*+?.()|[\]{}]/g, "\\$&")}\\b`,
        "i",
      );
      if (regex.test(combinedText)) return keywordIconMap[keyword];
    } catch {
      if (combinedText.includes(keyword)) return keywordIconMap[keyword];
    }
  }
  return Icon.Video;
}

function debounce<T extends unknown[]>(
  func: (...args: T) => void,
  wait: number,
): (...args: T) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: T): void => {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function formatTime(seconds: number): string {
  seconds = Math.floor(seconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0)
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

async function extractVideoId(url: string): Promise<string | null> {
  try {
    url = url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === "youtu.be") {
      const videoId = parsedUrl.pathname.split("/")[1];
      return videoId && videoId.length === 11 ? videoId : null;
    } else if (parsedUrl.hostname.includes("youtube.com")) {
      if (parsedUrl.pathname === "/watch") {
        const videoId = parsedUrl.searchParams.get("v");
        return videoId && videoId.length === 11 ? videoId : null;
      } else if (parsedUrl.pathname.startsWith("/embed/")) {
        const videoId = parsedUrl.pathname.split("/")[2]?.split("?")[0];
        return videoId && videoId.length === 11 ? videoId : null;
      } else if (parsedUrl.pathname.startsWith("/shorts/")) {
        const videoId = parsedUrl.pathname.split("/")[2];
        return videoId && videoId.length === 11 ? videoId : null;
      }
    }
    return null;
  } catch (error) {
    console.error("Error parsing URL:", url, error);
    return null;
  }
}

// Primary function to get metadata, tries oEmbed first, falls back to scraping
async function getVideoTitleAndDescription(
  videoId: string,
): Promise<{ title: string; description: string }> {
  const defaultTitle = "Untitled Video";
  const defaultDescription = "";
  try {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`;
    const oEmbedResponse = await fetch(oEmbedUrl);

    if (!oEmbedResponse.ok) {
      console.warn(
        `oEmbed fetch failed (${oEmbedResponse.status}), falling back to scraping for video: ${videoId}`,
      );
      return await scrapeTitleAndDescription(videoId); // Fallback call
    }

    const oEmbedData: Record<string, unknown> = await oEmbedResponse.json();
    const title =
      typeof oEmbedData.title === "string"
        ? oEmbedData.title.trim()
        : defaultTitle;
    // oEmbed doesn't provide description, so we might still need scraping for it.
    // Let's try scraping *only* if title was found via oEmbed to potentially get description.
    let description = defaultDescription;
    if (title !== defaultTitle) {
      try {
        console.log(
          "oEmbed successful for title, attempting scrape for description...",
        );
        const scrapedData = await scrapeTitleAndDescription(videoId);
        description = scrapedData.description; // Use scraped description if available
      } catch (scrapeError) {
        console.warn(
          "Scraping for description failed after successful oEmbed title fetch:",
          scrapeError,
        );
        // Keep the description as default if scraping fails here
      }
    } else {
      // If oEmbed failed to get title, scraping was already called as fallback
      // We might need to re-scrape here if the fallback failed but oEmbed returned ok with no title? Unlikely.
      // Let's assume scrapeTitleAndDescription was called if title is defaultTitle here.
    }

    return { title: title.trim(), description: description };
  } catch (error) {
    console.error("oEmbed/Scraping failed:", error);
    try {
      console.log("Final fallback to scraping due to error.");
      return await scrapeTitleAndDescription(videoId);
    } catch (scrapeError) {
      console.error("Final fallback scraping also failed:", scrapeError);
      return { title: defaultTitle, description: defaultDescription };
    }
  }
}

// Original scraping function (now primarily a fallback or for description)
async function scrapeTitleAndDescription(
  videoId: string,
): Promise<{ title: string; description: string }> {
  const defaultTitle = "Untitled Video";
  const defaultDescription = "";

  function decodeHtmlEntities(text: string | null | undefined): string {
    if (!text) return "";
    return text
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
      .replace(/&/g, "&");
  }

  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(
        `Scraping fetch failed: ${response.status} ${response.statusText} for video ${videoId}`,
      );
    }
    const html = await response.text();

    let title = defaultTitle;
    let titleMatch = html.match(/<title>(.*?)<\/title>/);
    if (!titleMatch) titleMatch = html.match(/"title":"(.*?)"/);

    if (titleMatch && titleMatch[1]) {
      title = decodeHtmlEntities(titleMatch[1])
        .replace(/\\u([\dA-Fa-f]{4})/g, (_, grp) =>
          String.fromCharCode(parseInt(grp, 16)),
        )
        .replace(/ - YouTube$/, "")
        .trim();
    }

    let description = defaultDescription;
    let descMatch = html.match(
      /<meta property="og:description" content="([^"]*)"/,
    );
    if (!descMatch)
      descMatch = html.match(/<meta name="description" content="([^"]*)"/);

    if (descMatch && descMatch[1]) {
      description = decodeHtmlEntities(descMatch[1]).trim();
    } else {
      try {
        const scriptMatches = html.match(
          /var ytInitialPlayerResponse = ({.*?});/,
        );
        if (scriptMatches && scriptMatches[1]) {
          const playerResponse = JSON.parse(scriptMatches[1]);
          description =
            playerResponse?.videoDetails?.shortDescription ||
            defaultDescription;
        } // Add more JSON parsing attempts if needed
      } catch (jsonError) {
        console.warn(
          "Failed to parse JSON for description fallback:",
          jsonError,
        );
      }
    }
    return { title, description };
  } catch (error) {
    console.error("Scraping failed:", error);
    return { title: defaultTitle, description: defaultDescription };
  }
}

function chunkTranscript(transcriptItems: TranscriptItem[]): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];
  if (!transcriptItems?.length) return chunks;
  let currentChunkText = "";
  let currentLength = 0;
  let chunkStartTime = transcriptItems[0].offset;
  for (let i = 0; i < transcriptItems.length; i++) {
    const item = transcriptItems[i];
    const nextItem = transcriptItems[i + 1];
    const text = item.text.trim();
    if (!text) continue;
    const textLength = text.length + (currentChunkText ? 1 : 0);
    const isPotentialBoundary =
      nextItem && nextItem.offset - (item.offset + item.duration) > 2;
    if (
      (currentLength + textLength > MAX_CHUNK_SIZE && currentLength > 0) ||
      (isPotentialBoundary &&
        currentLength > MAX_CHUNK_SIZE * 0.5 &&
        currentLength > 0)
    ) {
      chunks.push({
        text: currentChunkText,
        startTime: chunkStartTime,
        endTime: item.offset,
      });
      currentChunkText = text;
      currentLength = text.length;
      chunkStartTime = item.offset;
    } else {
      if (currentChunkText) currentChunkText += " ";
      currentChunkText += text;
      currentLength += textLength;
    }
  }
  if (currentChunkText && transcriptItems.length > 0) {
    const lastItem = transcriptItems[transcriptItems.length - 1];
    chunks.push({
      text: currentChunkText,
      startTime: chunkStartTime,
      endTime: lastItem.offset + lastItem.duration,
    });
  }
  return chunks;
}

async function loadAndMigrateHistory(): Promise<SummaryHistoryItem[]> {
  const keysToTry = [
    "history",
    "youtube-summary-pro-history",
    "preferences",
    "podcast-detail-extractor",
    "podcast-detail-extractor-history",
    "podcast-detail-extractor-preferences",
  ];
  let loadedHistory: SummaryHistoryItem[] | null = null;
  let migrationOccurred = false;
  let migratedFromKey: string | null = null;
  for (const key of keysToTry) {
    try {
      const storedData = await LocalStorage.getItem(key);
      if (!storedData || typeof storedData !== "string") continue;
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(storedData);
      } catch {
        console.warn(`Failed to parse data from key "${key}"`);
        continue;
      }

      interface HistoryItem {
        id: string;
        url: string;
        title: string;
        summary: string;
        timestamp: number;
        overview?: string;
        detailedChunks?: {
          startTime: number;
          endTime: number;
          summary: string;
        }[];
        status?:
          | "pending"
          | "fetching_info"
          | "fetching_transcript"
          | "chunking"
          | "summarizing"
          | "overview"
          | "done"
          | "error";
        displayIcon?: keyof typeof Icon;
      }

      let potentialHistory: HistoryItem[] | null = null;

      if (Array.isArray(parsedData)) {
        potentialHistory = parsedData as HistoryItem[];
      } else if (
        typeof parsedData === "object" &&
        parsedData !== null &&
        Array.isArray((parsedData as Record<string, unknown>).history)
      ) {
        potentialHistory = (parsedData as { history: HistoryItem[] }).history;
      }

      if (
        potentialHistory !== null &&
        potentialHistory.length > 0 &&
        potentialHistory.every(
          (item): item is HistoryItem =>
            typeof item?.id === "string" &&
            typeof item.url === "string" &&
            typeof item.title === "string" &&
            typeof item.timestamp === "number" &&
            item.summary !== undefined,
        )
      ) {
        loadedHistory = potentialHistory.map(
          (item): SummaryHistoryItem => ({
            id: item.id,
            url: item.url,
            title: item.title,
            summary: item.summary,
            overview: item.overview || "",
            detailedChunks: item.detailedChunks || [],
            timestamp: item.timestamp,
            status: item.status,
            displayIcon: item.displayIcon,
          }),
        );
        if (key !== "history") {
          migrationOccurred = true;
          migratedFromKey = key;
        }
        break;
      }
    } catch (error) {
      console.error(`Error accessing or processing key "${key}":`, error);
    }
  }
  if (migrationOccurred && loadedHistory && migratedFromKey) {
    try {
      await LocalStorage.setItem("history", JSON.stringify(loadedHistory));
      await LocalStorage.removeItem(migratedFromKey);
      console.log(
        `Successfully migrated history from "${migratedFromKey}" to "history".`,
      );
      if (
        migratedFromKey !== "preferences" &&
        migratedFromKey !== "podcast-detail-extractor-preferences"
      ) {
        await showToast({
          style: Toast.Style.Success,
          title: "History Migrated",
        });
      }
    } catch (error) {
      console.error(
        `Error saving migrated history or removing old key "${migratedFromKey}":`,
        error,
      );
      await showToast({
        style: Toast.Style.Failure,
        title: "History Migration Issue",
        message: "Could not save migrated data.",
      });
    }
  }
  return loadedHistory || [];
}

// --- Internal Processing Function ---
async function _processVideoSummary(
  videoId: string,
  url: string,
  itemId: string,
  initialTitle: string,
  initialDescription: string,
  setHistory: React.Dispatch<React.SetStateAction<SummaryHistoryItem[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  showToastFn: typeof showToast,
): Promise<void> {
  let currentToast: Toast | null = null;

  try {
    setHistory((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status: "fetching_transcript" } : item,
      ),
    );
    currentToast = await showToastFn({
      style: Toast.Style.Animated,
      title: "Fetching Transcript...",
      message: initialTitle,
    });

    let transcriptItems: TranscriptItem[];
    try {
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (transcriptError) {
      console.error("youtube-transcript error:", transcriptError);
      const errorMsg =
        transcriptError instanceof Error
          ? transcriptError.message
          : "Unknown error";
      let userMsg = `Failed to fetch transcript: ${errorMsg}`;
      if (
        errorMsg.includes("Could not find transcript") ||
        errorMsg.includes("disabled subtitles") ||
        errorMsg.includes("No transcripts")
      ) {
        userMsg =
          "Transcript not available for this video (may be disabled or unsupported).";
      } else if (errorMsg.includes("status code 404")) {
        userMsg = "Video not found or unavailable (404 Error).";
      }
      setHistory((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: "error",
                summary: `# ${initialTitle}\n\n**Source:** [Watch on YouTube](${url})\n\n---\n\nError: ${userMsg}`,
              }
            : item,
        ),
      );
      return;
    }
    if (!transcriptItems?.length) {
      const userMsg = "Transcript is empty or unavailable.";
      setHistory((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: "error",
                summary: `# ${initialTitle}\n\n**Source:** [Watch on YouTube](${url})\n\n---\n\nError: ${userMsg}`,
              }
            : item,
        ),
      );
      return;
    }

    if (currentToast) await currentToast.hide();
    currentToast = await showToastFn({
      style: Toast.Style.Animated,
      title: "Analyzing Transcript Sections...",
      message: `${transcriptItems.length} segments found`,
    });
    setHistory((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status: "chunking" } : item,
      ),
    );
    const chunks = chunkTranscript(transcriptItems);

    if (chunks.length === 0) {
      const userMsg = "Failed to process transcript into chunks.";
      setHistory((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: "error",
                summary: `# ${initialTitle}\n\n**Source:** [Watch on YouTube](${url})\n\n---\n\nError: ${userMsg}`,
              }
            : item,
        ),
      );
      return;
    }

    let overview = "";
    let finalSummaryMarkdown = "";
    let finalDetailedChunks: {
      startTime: number;
      endTime: number;
      summary: string;
    }[] = [];

    if (chunks.length === 1) {
      if (currentToast) await currentToast.hide();
      currentToast = await showToastFn({
        style: Toast.Style.Animated,
        title: `Summarizing Video...`,
        message: `Processing 1 section`,
      });
      setHistory((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: "overview" } : item,
        ),
      );

      const singleChunk = chunks[0];
      const prompt =
        OVERVIEW_PROMPT +
        "\n\nVideo Description:\n" +
        (initialDescription || "N/A") +
        "\n\nFull Transcript:\n" +
        singleChunk.text;

      try {
        overview = await AI.ask(prompt);
        const actionableRegex =
          /##\s*Actionable Insights(?: & Key Takeaways)?\s*\n([\s\S]*?)(?=\n##\s|$)/;
        const quotesRegex = /##\s*Notable Quotes\s*\n([\s\S]*?)(?=\n##\s|$)/;
        const actionableMatch = overview.match(actionableRegex);
        const quotesMatch = overview.match(quotesRegex);
        const firstSectionIndex = Math.min(
          actionableMatch?.index ?? Infinity,
          quotesMatch?.index ?? Infinity,
        );
        const mainOverviewContent = (
          firstSectionIndex === Infinity
            ? overview
            : overview.substring(0, firstSectionIndex)
        ).trim();
        const actionableContent = actionableMatch
          ? `## Actionable Insights & Key Takeaways\n${actionableMatch[1].trim()}\n`
          : "";
        const quotesContent = quotesMatch
          ? `## Notable Quotes\n${quotesMatch[1].trim()}\n`
          : "";

        finalSummaryMarkdown = [
          `# ${initialTitle}`,
          `**Source:** [Watch on YouTube](${url})`,
          "\n---\n",
          mainOverviewContent,
          actionableContent ? "\n---\n" + actionableContent : "",
          quotesContent ? "\n---\n" + quotesContent : "",
        ]
          .filter(Boolean)
          .join("\n")
          .trim();

        setHistory((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  summary: finalSummaryMarkdown,
                  overview: overview,
                  detailedChunks: [],
                  status: "done",
                }
              : item,
          ),
        );
        if (currentToast) await currentToast.hide();
        await showToastFn({
          style: Toast.Style.Success,
          title: "Summary Complete",
          message: initialTitle,
        });
        currentToast = null;
      } catch (aiError) {
        console.error("AI Error on Single Chunk Overview:", aiError);
        const errorMsg =
          aiError instanceof Error ? aiError.message : "Unknown AI error";
        finalSummaryMarkdown = `# ${initialTitle}\n\n**Source:** [Watch on YouTube](${url})\n\n---\n\n## Summary Generation Failed\n*Error generating summary: ${errorMsg}*`;
        setHistory((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  summary: finalSummaryMarkdown,
                  overview: `*Summary Generation Failed: ${errorMsg}*`,
                  detailedChunks: [],
                  status: "error",
                }
              : item,
          ),
        );
        if (currentToast) await currentToast.hide();
        currentToast = null;
        await showToastFn({
          style: Toast.Style.Failure,
          title: "Summary Generation Failed",
          message: errorMsg,
        });
      }
    } else {
      setHistory((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: "summarizing" } : item,
        ),
      );
      if (currentToast) await currentToast.hide();
      currentToast = await showToastFn({
        style: Toast.Style.Animated,
        title: `Analyzing Transcript...`,
        message: `Processing ${chunks.length} sections`,
      });

      const detailPromises = chunks.map((chunk, i) =>
        AI.ask(
          DETAIL_PROMPT +
            `\n\nTranscript Part ${i + 1}/${chunks.length} (${formatTime(chunk.startTime)} - ${formatTime(chunk.endTime)}):\n` +
            chunk.text,
        ).catch((err) => {
          console.error(`AI Error on Chunk ${i + 1}:`, err);
          const errorMsg =
            err instanceof Error ? err.message : "Unknown AI error";
          return `*Error processing this chunk: ${errorMsg}*\n\n---\n*Original Text Snippet (approx. start):*\n${chunk.text.substring(0, 100)}...`;
        }),
      );
      const detailedSummaries = await Promise.all(detailPromises);

      if (detailedSummaries.every((s) => s.startsWith("*Error processing"))) {
        const userMsg = "AI processing failed for all transcript sections.";
        setHistory((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: "error",
                  summary: `# ${initialTitle}\n\n**Source:** [Watch on YouTube](${url})\n\n---\n\nError: ${userMsg}`,
                }
              : item,
          ),
        );
        return;
      }

      finalDetailedChunks = chunks.map((chunk, index) => ({
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        summary: detailedSummaries[index] || "*Processing error*",
      }));

      setHistory((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: "overview",
                detailedChunks: finalDetailedChunks,
              }
            : item,
        ),
      );
      if (currentToast) await currentToast.hide();
      currentToast = await showToastFn({
        style: Toast.Style.Animated,
        title: "Creating Overview...",
        message: "Synthesizing section summaries",
      });

      const overviewPromptInput =
        OVERVIEW_PROMPT +
        "\n\nVideo Description:\n" +
        (initialDescription || "N/A") +
        "\n\nDetailed Content Analysis (Synthesize This):\n" +
        detailedSummaries
          .map(
            (s, i) =>
              `\n--- Part ${i + 1} (${formatTime(chunks[i].startTime)} - ${formatTime(chunks[i].endTime)}) ---\n${s}`,
          )
          .join("\n");

      try {
        overview = await AI.ask(overviewPromptInput);

        const actionableRegex =
          /##\s*Actionable Insights(?: & Key Takeaways)?\s*\n([\s\S]*?)(?=\n##\s|$)/;
        const quotesRegex = /##\s*Notable Quotes\s*\n([\s\S]*?)(?=\n##\s|$)/;
        const actionableMatch = overview.match(actionableRegex);
        const quotesMatch = overview.match(quotesRegex);
        const firstSectionIndex = Math.min(
          actionableMatch?.index ?? Infinity,
          quotesMatch?.index ?? Infinity,
        );
        const mainOverviewContent = (
          firstSectionIndex === Infinity
            ? overview
            : overview.substring(0, firstSectionIndex)
        ).trim();
        const actionableContent = actionableMatch
          ? `## Actionable Insights & Key Takeaways\n${actionableMatch[1].trim()}\n`
          : "";
        const quotesContent = quotesMatch
          ? `## Notable Quotes\n${quotesMatch[1].trim()}\n`
          : "";

        finalSummaryMarkdown = [
          `# ${initialTitle}`,
          `**Source:** [Watch on YouTube](${url})`,
          "\n---\n",
          mainOverviewContent,
          actionableContent ? "\n---\n" + actionableContent : "",
          quotesContent ? "\n---\n" + quotesContent : "",
          "\n---\n",
          "## Summary by Timestamp",
          ...finalDetailedChunks.map(
            (chunk) =>
              `\n### ${formatTime(chunk.startTime)} - ${formatTime(chunk.endTime)}\n${chunk.summary}`,
          ),
        ]
          .filter(Boolean)
          .join("\n")
          .trim();

        setHistory((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  summary: finalSummaryMarkdown,
                  overview: overview,
                  status: "done",
                }
              : item,
          ),
        );
        if (currentToast) await currentToast.hide();
        await showToastFn({
          style: Toast.Style.Success,
          title: "Summary Complete",
          message: initialTitle,
        });
        currentToast = null;
      } catch (overviewError) {
        console.error("AI Error on Overview:", overviewError);
        const errorMsg =
          overviewError instanceof Error
            ? overviewError.message
            : "Unknown AI error";
        finalSummaryMarkdown = [
          `# ${initialTitle}`,
          `**Source:** [Watch on YouTube](${url})`,
          "\n---\n",
          "## Overview Generation Failed",
          `*Error generating overview: ${errorMsg}*`,
          "\n---\n",
          "## Summary by Timestamp",
          ...finalDetailedChunks.map(
            (chunk) =>
              `\n### ${formatTime(chunk.startTime)} - ${formatTime(chunk.endTime)}\n${chunk.summary}`,
          ),
        ]
          .join("\n")
          .trim();

        setHistory((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  summary: finalSummaryMarkdown,
                  overview: `*Overview Generation Failed: ${errorMsg}*`,
                  status: "error",
                }
              : item,
          ),
        );
        if (currentToast) await currentToast.hide();
        currentToast = null;
        await showToastFn({
          style: Toast.Style.Failure,
          title: "Overview Generation Failed",
          message: "Section summaries saved. " + errorMsg,
        });
      }
    }
  } catch (error) {
    console.error(`Unexpected error processing item ${itemId}:`, error);
    setHistory((prev) =>
      prev.map((item) => {
        if (item.id === itemId && item.status !== "error") {
          const errorMsg =
            error instanceof Error
              ? error.message
              : "Unknown error during processing";
          const currentSummary = item.summary || "";
          const newSummary =
            currentSummary.includes("Fetching") ||
            currentSummary.includes("Preparing") ||
            currentSummary.includes("Regenerating")
              ? `# ${initialTitle}\n\n**Source:** [Watch on YouTube](${url})\n\n---\n\nFailed during processing: ${errorMsg}`
              : currentSummary +
                `\n\n---\n*Processing failed unexpectedly: ${errorMsg}*`;
          return { ...item, status: "error", summary: newSummary };
        }
        return item;
      }),
    );
    if (
      !(
        error instanceof Error &&
        (error.message.includes("Transcript not available") ||
          error.message.includes("AI processing failed") ||
          error.message.includes("Failed to process transcript"))
      )
    ) {
      await showToastFn({
        style: Toast.Style.Failure,
        title: "Processing Failed Unexpectedly",
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  } finally {
    // Update global loading state based on *all* items
    setIsLoading(() => {
      let stillProcessing = false;
      setHistory((currentHistory) => {
        stillProcessing = currentHistory.some(
          (h) => h.status && h.status !== "done" && h.status !== "error",
        );
        return currentHistory;
      });
      return stillProcessing;
    });
    if (currentToast) {
      try {
        await currentToast.hide();
      } catch {
        /* ignore */
      }
      currentToast = null;
    }
  }
}

// --- Main Command Component ---
export default function Command(): ReactElement {
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial history load and active processing
  const [searchText, setSearchText] = useState("");
  const [history, setHistory] = useState<SummaryHistoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Load history on initial mount
  useEffect(() => {
    loadAndMigrateHistory()
      .then((loadedHistory) => {
        setHistory(loadedHistory);
        // Check if any items were left in a processing state and potentially reset them?
        // For now, just load them as they are.
      })
      .catch(console.error)
      .finally(() => setIsLoading(false)); // Stop initial loading indicator
  }, []);

  // Debounced history saving
  const debouncedSaveHistory = useCallback(
    debounce((currentHistory: SummaryHistoryItem[]) => {
      console.log("Debounced save triggered");
      if (currentHistory.length > 0) {
        LocalStorage.setItem("history", JSON.stringify(currentHistory)).catch(
          (err) => console.error("Failed to save history:", err),
        );
      } else {
        LocalStorage.removeItem("history").catch((err) =>
          console.error("Failed to remove history:", err),
        );
      }
    }, HISTORY_SAVE_DEBOUNCE_MS),
    [],
  );

  // Save history whenever it changes, but not during initial load
  useEffect(() => {
    // Determine if initial loading is finished (isLoading is false AND history has been set at least once)
    // This check is a bit complex, might need refinement. The goal is to avoid saving an empty array right at the start.
    // A simpler check might be sufficient if isLoading truly reflects initial load completion.
    const initialLoadComplete = !isLoading; // Assuming setIsLoading(false) in useEffect cleanup means load is done

    if (initialLoadComplete) {
      debouncedSaveHistory(history);
    }
  }, [history, debouncedSaveHistory, isLoading]);

  function validateUrl(url: string): boolean {
    if (!url) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter a YouTube URL",
      });
      return false;
    }
    if (!YOUTUBE_URL_REGEX.test(url.trim())) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Please enter a valid YouTube watch/share URL",
      });
      return false;
    }
    if (!environment.canAccess(AI)) {
      showToast({
        style: Toast.Style.Failure,
        title: "AI Not Available",
        message: "This command requires Raycast Pro or the AI Add-on.",
      });
      return false;
    }
    return true;
  }

  // Refined handleUrlSubmit
  async function handleUrlSubmit(url: string) {
    const trimmedUrl = url.trim();
    if (!validateUrl(trimmedUrl)) return;

    const existingItem = history.find((item) => item.url === trimmedUrl);
    if (existingItem) {
      if (
        existingItem.status &&
        existingItem.status !== "done" &&
        existingItem.status !== "error"
      ) {
        showToast({
          style: Toast.Style.Failure,
          title: "Already Processing",
          message: "This URL is currently being summarized.",
        });
        setSelectedItemId(existingItem.id);
        return;
      }
      // If exists and is done/error, select it to show the existing summary/error
      setSelectedItemId(existingItem.id);
      return; // Prevent re-submission of existing items
    }

    // Check if *any* item is currently processing
    const isProcessingActive = history.some(
      (item) =>
        item.status && item.status !== "done" && item.status !== "error",
    );
    if (isProcessingActive) {
      showToast({
        style: Toast.Style.Failure,
        title: "Processing Active",
        message:
          "Please wait for the current summary to finish before starting another.",
      });
      return;
    }

    let newItemId: string | null = null;
    setIsLoading(true); // Indicate processing started
    let initialToast: Toast | null = null;

    try {
      // --- 1. Initial Setup & Placeholder ---
      initialToast = await showToast({
        style: Toast.Style.Animated,
        title: "Preparing...",
        message: "Validating URL...",
      });
      newItemId = Date.now().toString();

      const videoIdPreliminary = await extractVideoId(trimmedUrl);
      if (!videoIdPreliminary)
        throw new Error("Could not extract Video ID from URL.");

      const placeholderTitle = "Processing..."; // Use a clear placeholder
      const determinedIconName: keyof typeof Icon = "Video";
      const videoDescription = ""; // Initialize description

      const placeholderItem: SummaryHistoryItem = {
        id: newItemId!,
        url: trimmedUrl,
        title: placeholderTitle, // USE PLACEHOLDER
        summary: `# ${placeholderTitle}\n\nFetching video details...`, // USE PLACEHOLDER
        overview: "Fetching...",
        detailedChunks: [],
        timestamp: Date.now(),
        status: "fetching_info",
        displayIcon: determinedIconName,
      };

      // --- 2. Add Placeholder & Select ---
      setHistory((prev) => [placeholderItem, ...prev]);
      setSelectedItemId(newItemId);
      if (initialToast) {
        try {
          await initialToast.hide();
        } catch {
          /* ignore */
        }
        initialToast = null;
      }

      // --- 3. Fetch Metadata (AFTER initial render) ---
      let finalDisplayTitle = placeholderTitle; // Start with placeholder
      let finalDescription = videoDescription;
      let metaToast: Toast | null = null;

      try {
        metaToast = await showToast({
          style: Toast.Style.Animated,
          title: "Fetching Metadata...",
          message: "Getting video title...",
        });

        const { title: fetchedTitle, description: fetchedDescription } =
          await getVideoTitleAndDescription(videoIdPreliminary);

        if (fetchedTitle && fetchedTitle !== "Untitled Video") {
          finalDisplayTitle = fetchedTitle;
        } else {
          finalDisplayTitle = trimmedUrl;
          console.warn(
            "Fetched title was default or missing, using URL as title.",
          );
        }
        finalDescription = fetchedDescription || "";

        const determinedIcon = determineIconFromText(
          finalDisplayTitle,
          finalDescription,
        );
        // finalIconName = (Object.keys(Icon).find(key => Icon[key as keyof typeof Icon] === determinedIcon) as keyof typeof Icon) || 'Video' as keyof typeof Icon;

        // --- 4. Update Item with Fetched Data ---
        setHistory((prev) =>
          prev.map((item) =>
            item.id === newItemId
              ? {
                  ...item,
                  title: finalDisplayTitle,
                  displayIcon:
                    (Object.keys(Icon).find(
                      (key) =>
                        Icon[key as keyof typeof Icon] === determinedIcon,
                    ) as keyof typeof Icon) || "Video", // Compute key here
                  summary: `# ${finalDisplayTitle}\n\nPreparing summary... Please wait.`,
                }
              : item,
          ),
        );
        if (metaToast) {
          try {
            await metaToast.hide();
          } catch {
            /* ignore */
          }
          metaToast = null;
        }
      } catch (fetchError) {
        console.error("Error during preliminary title/desc fetch:", fetchError);
        if (metaToast) {
          try {
            await metaToast.hide();
          } catch {
            /* ignore */
          }
          metaToast = null;
        }
        finalDisplayTitle = trimmedUrl;
        setHistory((prev) =>
          prev.map((item) =>
            item.id === newItemId
              ? {
                  ...item,
                  title: finalDisplayTitle, // Fallback title (URL)
                  summary: `# ${finalDisplayTitle}\n\n(Could not fetch title) Preparing summary...`,
                }
              : item,
          ),
        );
        await showToast({
          style: Toast.Style.Failure,
          title: "Metadata Fetch Failed",
          message: "Could not get video title, proceeding...",
        });
      }

      // --- 5. Call Main Processing Function ---
      await _processVideoSummary(
        videoIdPreliminary,
        trimmedUrl,
        newItemId,
        finalDisplayTitle,
        finalDescription,
        setHistory,
        setIsLoading,
        showToast,
      );
    } catch (setupError: unknown) {
      // Catch errors during initial setup (ID extraction)
      console.error("Error during initial URL submission setup:", setupError);
      if (initialToast) {
        try {
          await initialToast.hide();
        } catch {
          /* ignore */
        }
      }
      await showToast({
        style: Toast.Style.Failure,
        title: "Setup Failed",
        message:
          setupError instanceof Error
            ? setupError.message
            : "Unknown error before processing",
      });
      if (newItemId)
        setHistory((prev) => prev.filter((item) => item.id !== newItemId));
      setSelectedItemId(null);
      setIsLoading(false); // Ensure loading stops on setup failure
    }
  }

  const selectedItem = history.find((item) => item.id === selectedItemId);

  const filteredHistory = history.filter((item) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      item.title.toLowerCase().includes(searchLower) ||
      item.url.toLowerCase().includes(searchLower)
    );
  });

  function getIconForItem(item: SummaryHistoryItem): Icon {
    switch (item.status) {
      case "pending":
      case "fetching_info":
        return Icon.Download;
      case "fetching_transcript":
        return Icon.SpeechBubble;
      case "chunking":
        return Icon.Filter;
      case "summarizing":
      case "overview":
        return Icon.Wand;
      case "error":
        return Icon.Warning;
      case "done":
      default: {
        const iconKey = item.displayIcon || "Video";
        return Icon[iconKey as keyof typeof Icon] || Icon.Video;
      }
    }
  }

  // Check if any item is actively processing
  const isAnyItemProcessing = history.some(
    (item) => item.status && item.status !== "done" && item.status !== "error",
  );
  // Update global loading state (used for List loading and preventing overlapping actions)
  useEffect(() => {
    setIsLoading(isAnyItemProcessing);
  }, [isAnyItemProcessing]);

  // --- Detail View ---
  if (selectedItem) {
    const overviewContent = selectedItem.overview || "";
    const timestampedDetailsContent =
      selectedItem.detailedChunks?.length > 0
        ? selectedItem.detailedChunks
            .map(
              (chunk) =>
                `## ${formatTime(chunk.startTime)} - ${formatTime(chunk.endTime)}\n${chunk.summary}`,
            )
            .join("\n\n")
        : "";

    const actionableRegex =
      /##\s*Actionable Insights(?: & Key Takeaways)?\s*\n([\s\S]*?)(?=\n##\s|$)/;
    const quotesRegex = /##\s*Notable Quotes\s*\n([\s\S]*?)(?=\n##\s|$)/;
    const actionableMatch = overviewContent.match(actionableRegex);
    const quotesMatch = overviewContent.match(quotesRegex);
    const actionableCopyContent = actionableMatch
      ? actionableMatch[1].trim()
      : "";
    const quotesCopyContent = quotesMatch ? quotesMatch[1].trim() : "";

    const isProcessing =
      selectedItem.status &&
      selectedItem.status !== "done" &&
      selectedItem.status !== "error";

    const handleRegenerate = async () => {
      // Prevent regeneration if this item or *any other* item is processing
      if (!selectedItem || isProcessing || isAnyItemProcessing) {
        const message = isProcessing
          ? "This item is currently processing."
          : "Another item is processing. Please wait.";
        showToast({
          style: Toast.Style.Failure,
          title: "Cannot Regenerate",
          message,
        });
        return;
      }
      const {
        id: itemIdToRegenerate,
        url: itemUrl,
        title: currentTitle,
      } = selectedItem;

      setIsLoading(true); // Indicate global processing start
      let toast: Toast | null = null;
      try {
        toast = await showToast({
          style: Toast.Style.Animated,
          title: "Regenerating...",
          message: "Fetching video info...",
        });

        const videoId = await extractVideoId(itemUrl);
        if (!videoId)
          throw new Error("Could not extract Video ID for regeneration.");

        setHistory((prev) =>
          prev.map((item) =>
            item.id === itemIdToRegenerate
              ? {
                  ...item,
                  status: "pending",
                  summary: `# ${currentTitle}\n\nRegenerating summary... Please wait.`,
                  overview: "Regenerating...",
                  detailedChunks: [],
                }
              : item,
          ),
        );

        let description = "";
        let newTitle = currentTitle;
        let newIconKey: keyof typeof Icon = selectedItem.displayIcon || "Video";
        try {
          // Re-fetch metadata on regenerate
          const videoInfo = await getVideoTitleAndDescription(videoId);
          description = videoInfo.description;
          if (videoInfo.title && videoInfo.title !== "Untitled Video")
            newTitle = videoInfo.title;
          const newIcon = determineIconFromText(newTitle, description);
          newIconKey =
            (Object.keys(Icon).find(
              (key) => Icon[key as keyof typeof Icon] === newIcon,
            ) as keyof typeof Icon) || ("Video" as keyof typeof Icon);
          setHistory((prev) =>
            prev.map((item) =>
              item.id === itemIdToRegenerate
                ? { ...item, title: newTitle, displayIcon: newIconKey }
                : item,
            ),
          );
        } catch (e) {
          console.error("Failed fetch description/title for regenerate:", e);
        }

        if (toast) {
          try {
            await toast.hide();
          } catch {
            /*ignore*/
          }
          toast = null;
        }
        // Call main processor (manages setIsLoading based on completion)
        await _processVideoSummary(
          videoId,
          itemUrl,
          itemIdToRegenerate,
          newTitle,
          description,
          setHistory,
          setIsLoading,
          showToast,
        );
      } catch (error) {
        console.error("Error during regeneration setup:", error);
        if (toast) {
          try {
            await toast.hide();
          } catch {
            /*ignore*/
          }
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Regenerate Failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        setHistory((prev) =>
          prev.map((item) =>
            item.id === itemIdToRegenerate && item.status === "pending"
              ? {
                  ...item,
                  status: "error",
                  summary: item.summary + "\n\nRegeneration setup failed.",
                }
              : item,
          ),
        );
        setIsLoading(false); // Explicitly stop loading on setup error
      }
    };

    const handleGoBack = () => {
      setSelectedItemId(null);
    };

    return (
      <Detail
        navigationTitle={selectedItem.title} // Shows placeholder initially, then fetched title
        markdown={
          selectedItem.summary ||
          (isProcessing ? "Processing..." : "Summary not available.")
        }
        isLoading={isProcessing} // Detail view's own spinner for THIS item
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Navigation & Source">
              <Action
                title="Back to List"
                icon={Icon.ArrowLeft}
                onAction={handleGoBack}
                shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
              />
              <Action.OpenInBrowser
                title="Open Video in Browser"
                url={selectedItem.url}
                icon={Icon.Link}
                shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
              />
            </ActionPanel.Section>

            {/* Copy Actions */}
            {(selectedItem.status === "done" ||
              (selectedItem.status === "error" &&
                selectedItem.summary &&
                !selectedItem.summary.includes("Fetching") &&
                !selectedItem.summary.includes("Processing"))) && (
              <ActionPanel.Section title="Copy Content">
                <Action.CopyToClipboard
                  title="Copy Full Summary"
                  content={selectedItem.summary}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  icon={Icon.CopyClipboard}
                />
                {overviewContent && !overviewContent.startsWith("*") && (
                  <Action.CopyToClipboard
                    title="Copy Overview Content"
                    content={overviewContent}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                    icon={Icon.List}
                  />
                )}
                {actionableCopyContent && (
                  <Action.CopyToClipboard
                    title="Copy Actionable Insights"
                    content={actionableCopyContent}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    icon={Icon.BulletPoints}
                  />
                )}
                {quotesCopyContent && (
                  <Action.CopyToClipboard
                    title="Copy Notable Quotes"
                    content={quotesCopyContent}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
                    icon={Icon.QuoteBlock}
                  />
                )}
                {timestampedDetailsContent && (
                  <Action.CopyToClipboard
                    title="Copy Timestamped Details"
                    content={timestampedDetailsContent}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                    icon={Icon.Clock}
                  />
                )}
              </ActionPanel.Section>
            )}

            {/* Manage Actions */}
            <ActionPanel.Section title="Manage">
              {/* Allow regenerate only if this item is done/error AND no other item is processing */}
              {!isProcessing && !isAnyItemProcessing && (
                <Action
                  title="Regenerate Summary"
                  icon={Icon.Repeat}
                  onAction={handleRegenerate}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              )}
              <Action
                title="Delete Summary"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => {
                  setHistory((prev) =>
                    prev.filter((h) => h.id !== selectedItem.id),
                  );
                  handleGoBack();
                  showToast({
                    style: Toast.Style.Success,
                    title: "Summary Deleted",
                  });
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  // --- List View ---
  // Use global isLoading for List's loading indicator (covers initial load AND any active processing)
  const isListLoading = isLoading;

  return (
    <List
      isLoading={isListLoading}
      searchBarPlaceholder="Paste YouTube URL or Search History"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle={true} // Enable throttling for potentially large history lists
    >
      {/* Generate Item */}
      {searchText &&
        YOUTUBE_URL_REGEX.test(searchText.trim()) &&
        !history.some((item) => item.url === searchText.trim()) &&
        !isAnyItemProcessing && (
          <List.Item
            key="generate-item"
            title="Generate New Summary"
            subtitle={searchText.trim()}
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                {" "}
                <Action
                  title="Generate Summary"
                  icon={Icon.Wand}
                  onAction={() => handleUrlSubmit(searchText)}
                />{" "}
              </ActionPanel>
            }
          />
        )}

      {/* History Section */}
      {filteredHistory.length > 0 && (
        <List.Section
          title="Summary History"
          subtitle={`${filteredHistory.length} item(s)`}
        >
          {filteredHistory.map((item) => {
            const isProcessingItem =
              item.status && item.status !== "done" && item.status !== "error";
            return (
              <List.Item
                key={item.id}
                title={item.title} // Shows actual title (or placeholder if processing)
                accessories={[
                  {
                    date: new Date(item.timestamp),
                    tooltip: `Saved: ${new Date(item.timestamp).toLocaleString()}`,
                  },
                ]}
                icon={getIconForItem(item)} // Icon reflects status
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title="View Summary"
                        icon={Icon.Eye}
                        onAction={() => setSelectedItemId(item.id)}
                      />
                      <Action.OpenInBrowser
                        title="Open Video in Browser"
                        url={item.url}
                        icon={Icon.Link}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                      />
                    </ActionPanel.Section>
                    {/* Copy Actions */}
                    {(item.status === "done" ||
                      (item.status === "error" &&
                        item.summary &&
                        !item.summary.includes("Fetching") &&
                        !item.summary.includes("Processing"))) && (
                      <ActionPanel.Section title="Copy Content">
                        <Action.CopyToClipboard
                          title="Copy Full Summary"
                          content={item.summary}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                          icon={Icon.CopyClipboard}
                        />
                        {item.overview && !item.overview.startsWith("*") && (
                          <Action.CopyToClipboard
                            title="Copy Overview Content"
                            content={item.overview}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                            icon={Icon.List}
                          />
                        )}
                        {item.detailedChunks &&
                          item.detailedChunks.length > 0 && (
                            <Action.CopyToClipboard
                              title="Copy Timestamped Details"
                              content={item.detailedChunks
                                .map(
                                  (chunk) =>
                                    `## ${formatTime(chunk.startTime)} - ${formatTime(chunk.endTime)}\n${chunk.summary}`,
                                )
                                .join("\n\n")}
                              shortcut={{
                                modifiers: ["cmd", "shift"],
                                key: "t",
                              }}
                              icon={Icon.Clock}
                            />
                          )}
                      </ActionPanel.Section>
                    )}
                    {/* Manage Actions */}
                    <ActionPanel.Section title="Manage">
                      {/* Allow regenerate only if this item is done/error AND no other item is processing */}
                      {!isProcessingItem && !isAnyItemProcessing && (
                        <Action
                          title="Regenerate Summary"
                          icon={Icon.Repeat}
                          onAction={async () => {
                            // Trigger regenerate from list view
                            const {
                              id: itemIdToRegenerate,
                              url: itemUrl,
                              title: currentTitle,
                            } = item;
                            setIsLoading(true); // Set global loading
                            let toast: Toast | null = null;
                            try {
                              toast = await showToast({
                                style: Toast.Style.Animated,
                                title: "Regenerating...",
                                message: "Fetching video info...",
                              });
                              const videoId = await extractVideoId(itemUrl);
                              if (!videoId)
                                throw new Error("Could not extract Video ID.");
                              setHistory((prev) =>
                                prev.map((h) =>
                                  h.id === itemIdToRegenerate
                                    ? {
                                        ...h,
                                        status: "pending",
                                        summary: `# ${currentTitle}\n\nRegenerating summary...`,
                                        overview: "Regenerating...",
                                        detailedChunks: [],
                                      }
                                    : h,
                                ),
                              );
                              let description = "";
                              let newTitle = currentTitle;
                              let newIconKey: keyof typeof Icon =
                                item.displayIcon || "Video";
                              try {
                                const videoInfo =
                                  await getVideoTitleAndDescription(videoId);
                                description = videoInfo.description;
                                if (
                                  videoInfo.title &&
                                  videoInfo.title !== "Untitled Video"
                                )
                                  newTitle = videoInfo.title;
                                const newIcon = determineIconFromText(
                                  newTitle,
                                  description,
                                );
                                newIconKey =
                                  (Object.keys(Icon).find(
                                    (key) =>
                                      Icon[key as keyof typeof Icon] ===
                                      newIcon,
                                  ) as keyof typeof Icon) ||
                                  ("Video" as keyof typeof Icon);
                                setHistory((prev) =>
                                  prev.map((h) =>
                                    h.id === itemIdToRegenerate
                                      ? {
                                          ...h,
                                          title: newTitle,
                                          displayIcon: newIconKey,
                                        }
                                      : h,
                                  ),
                                );
                              } catch (e) {
                                console.error(
                                  "Failed fetch metadata for regenerate:",
                                  e,
                                );
                              }
                              if (toast) {
                                try {
                                  await toast.hide();
                                } catch {
                                  /*ignore*/
                                }
                              }
                              await _processVideoSummary(
                                videoId,
                                itemUrl,
                                itemIdToRegenerate,
                                newTitle,
                                description,
                                setHistory,
                                setIsLoading,
                                showToast,
                              );
                            } catch (error) {
                              if (toast) {
                                try {
                                  await toast.hide();
                                } catch {
                                  /*ignore*/
                                }
                              }
                              await showToast({
                                style: Toast.Style.Failure,
                                title: "Regenerate Failed",
                                message:
                                  error instanceof Error
                                    ? error.message
                                    : "Unknown error",
                              });
                              setHistory((prev) =>
                                prev.map((h) =>
                                  h.id === itemIdToRegenerate &&
                                  h.status === "pending"
                                    ? {
                                        ...h,
                                        status: "error",
                                        summary:
                                          h.summary +
                                          "\n\nRegeneration setup failed.",
                                      }
                                    : h,
                                ),
                              );
                              setIsLoading(false); // Ensure loading stops on setup error
                            }
                          }}
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                        />
                      )}
                      {/* Delete Action */}
                      <Action
                        title="Delete Summary"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        onAction={() => {
                          setHistory((prev) =>
                            prev.filter((h) => h.id !== item.id),
                          );
                          showToast({
                            style: Toast.Style.Success,
                            title: "Summary Deleted",
                          });
                          if (selectedItemId === item.id)
                            setSelectedItemId(null); // Deselect if deleted item was selected
                        }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {/* EmptyView */}
      {/* Show EmptyView only if not loading, history is empty, and search is not a valid URL */}
      {!isListLoading &&
        history.length === 0 &&
        !(searchText && YOUTUBE_URL_REGEX.test(searchText.trim())) && (
          <List.EmptyView
            title={
              searchText ? "No Matching Summaries Found" : "No Summaries Yet"
            }
            description={
              searchText
                ? "Try different search terms, or paste a valid YouTube URL."
                : "Paste a YouTube video URL to generate a summary."
            }
            icon={searchText ? Icon.MagnifyingGlass : Icon.Video}
          />
        )}
    </List>
  );
}
