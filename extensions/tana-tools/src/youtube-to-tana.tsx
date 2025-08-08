import {
  Clipboard,
  BrowserExtension,
  Toast,
  showToast,
  getPreferenceValues,
} from "@raycast/api";
import { formatForTana } from "./utils/tana-formatter";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * YouTube to Tana Converter
 *
 * Uses the Raycast Browser Extension API to extract YouTube video metadata and transcripts.
 * Automatically opens Tana after copying the formatted content to the clipboard.
 *
 * REQUIREMENTS:
 * 1. Open a YouTube video in your browser (Arc, Chrome, or Safari)
 * 2. Make sure the YouTube tab is active
 * 3. For transcripts: Click "Show transcript" below the video if available
 *
 * BROWSER COMPATIBILITY:
 * - Arc/Chrome: Full support, all features work seamlessly
 * - Safari: Requires additional setup for full functionality:
 *   • Safari Settings → Advanced → ✓ "Show features for web developers"
 *   • Safari Settings → Developer → ✓ "Allow JavaScript from Apple Events"
 *   • Reload the YouTube page after enabling these settings
 *
 * FEATURES:
 * - Extracts video title, channel name, duration, description
 * - Captures transcript if available (auto-generated or manual captions)
 * - Formats everything for Tana with proper structure and tags
 * - Automatically opens Tana application after copying to clipboard
 */

/**
 * Video information extracted from YouTube videos
 * @interface VideoInfo
 * @property {string} title - The video's title
 * @property {string} channelName - The name of the YouTube channel
 * @property {string} channelUrl - The URL of the YouTube channel
 * @property {string} url - The canonical YouTube video URL
 * @property {string} videoId - The unique YouTube video ID
 * @property {string} description - The video's description text
 * @property {string} [duration] - The video duration (optional, format: "HH:MM:SS" or "MM:SS")
 * @property {string} [transcript] - The video transcript text (optional, only if available)
 */
interface VideoInfo {
  title: string;
  channelName: string;
  channelUrl: string;
  url: string;
  videoId: string;
  description: string;
  duration?: string;
  transcript?: string;
}

/**
 * Decode HTML entities in text content
 *
 * Converts common HTML entities (like &amp;, &lt;, &quot;) back to their
 * text equivalents for proper display in Tana.
 *
 * @param text - Text containing HTML entities
 * @returns Decoded text with entities converted to characters
 */
function decodeHTMLEntities(text: string): string {
  let decoded = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Handle numeric entities (decimal and hexadecimal)
  decoded = decoded
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

  return decoded;
}

/**
 * Timeout wrapper for Browser Extension API calls to prevent hanging
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  operation: string = "operation",
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `${operation} timed out after ${timeoutMs}ms. This may be a Safari compatibility issue. Please ensure Safari Developer settings are enabled.`,
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Detect if we're running in Safari based on error patterns
 */
function isSafariAccessError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("Access to this page is restricted") ||
      error.message.includes("code: -32603"))
  );
}

/**
 * Handle Safari-specific errors with helpful guidance
 */
function handleSafariError(operation: string): Error {
  return new Error(`Safari Access Restricted for ${operation}. 

SAFARI SETUP REQUIRED:
1. Safari Settings → Advanced → ✓ "Show features for web developers"
2. Safari Settings → Developer → ✓ "Allow JavaScript from Apple Events"
3. Reload the YouTube page and try again
4. If still failing, try switching to Arc or Chrome

This is a Safari security restriction that doesn't affect Arc or Chrome.`);
}

/**
 * Get YouTube tab using Browser Extension API
 */
async function getYouTubeTab(): Promise<{
  url: string;
  tabId: number;
  title?: string;
} | null> {
  try {
    console.log("🔍 Getting YouTube tab via Browser Extension API...");

    const tabs = await withTimeout(
      BrowserExtension.getTabs(),
      8000,
      "Getting browser tabs",
    );
    console.log(`🔍 Found ${tabs?.length || 0} tabs`);

    if (!tabs || tabs.length === 0) {
      throw new Error(
        "Could not access browser tabs. Please ensure Raycast has permission to access your browser.",
      );
    }

    // Find YouTube tab by checking the focused tab first
    let youtubeTab: BrowserExtension.Tab | null = null;

    try {
      // Get title from focused tab to identify it
      const focusedTabTitle = await withTimeout(
        BrowserExtension.getContent({
          format: "text",
          cssSelector: "title",
        }),
        3000,
        "Getting focused tab title",
      );

      console.log(`🔍 Focused tab title: "${focusedTabTitle}"`);

      // First, check if we have a YouTube tab that matches the focused tab title
      if (focusedTabTitle) {
        // Find YouTube tabs by URL first, then match by title
        const youtubeTabs = tabs.filter((tab) =>
          tab.url?.includes("youtube.com/watch"),
        );

        if (youtubeTabs.length > 0) {
          // Try exact title match among YouTube tabs
          youtubeTab =
            youtubeTabs.find((tab) => tab.title === focusedTabTitle) || null;

          if (!youtubeTab) {
            // Try partial match among YouTube tabs
            youtubeTab =
              youtubeTabs.find(
                (tab) =>
                  tab.title &&
                  (tab.title.includes(focusedTabTitle.substring(0, 10)) ||
                    focusedTabTitle.includes(tab.title.substring(0, 10))),
              ) || null;
          }
        }
      }
    } catch {
      console.log(
        "Could not get focused tab title, falling back to searching tabs",
      );
    }

    // If focused tab approach didn't work, find any YouTube tab
    if (!youtubeTab) {
      youtubeTab =
        tabs.find((tab) => tab.url?.includes("youtube.com/watch")) || null;
    }

    if (!youtubeTab) {
      throw new Error(
        "No YouTube video tab found. Please open a YouTube video and make sure it's focused.",
      );
    }

    return {
      url: youtubeTab.url,
      tabId: youtubeTab.id,
      title: youtubeTab.title,
    };
  } catch (error) {
    console.log(`❌ Browser Extension API failed: ${error}`);

    // Handle Safari-specific access restrictions
    if (isSafariAccessError(error)) {
      throw handleSafariError("browser tab access");
    }

    throw error;
  }
}

/**
 * Extract video metadata using Browser Extension API
 */
async function extractVideoMetadata(
  tabId: number,
  url: string,
  tabTitle?: string,
): Promise<Partial<VideoInfo>> {
  try {
    console.log(`🔍 Extracting metadata from tab ${tabId}...`);

    // Extract video ID from URL
    const urlObj = new URL(url);
    let videoId = urlObj.searchParams.get("v");
    if (!videoId && urlObj.hostname.includes("youtu.be")) {
      videoId = urlObj.pathname.slice(1);
    }
    if (!videoId && urlObj.pathname.startsWith("/shorts/")) {
      videoId = urlObj.pathname.slice(8); // Remove '/shorts/' prefix
    }
    if (!videoId) {
      throw new Error("Could not extract video ID from URL");
    }

    // Get HTML content for regex-based extraction
    const htmlContent = await withTimeout(
      BrowserExtension.getContent({
        tabId: tabId,
        format: "html",
      }),
      10000,
      "Getting page HTML content",
    );

    // Extract title using multiple methods
    let title = "YouTube Video";

    // Method 1: Use tab title (most reliable, works in Safari)
    if (tabTitle && tabTitle.trim().length > 0) {
      title = tabTitle
        .replace(" - YouTube", "")
        .replace(" – YouTube", "")
        .replace(/^\(\d+\)\s*/, "") // Remove notification count like "(63) " at start
        .replace(/\s*\(\d+\)$/, "") // Remove notification count like " (63)" at end
        .trim();
      console.log(`✅ Using tab title: "${title}"`);
    }

    // Method 2: Fallback to HTML title tag if tab title not available
    if (title === "YouTube Video" || title === tabTitle) {
      const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        title = titleMatch[1]
          .replace(" - YouTube", "")
          .replace(" – YouTube", "")
          .trim();
        console.log(`✅ Found title from HTML: "${title}"`);
      }
    }

    // Method 3: Try meta property as fallback
    if (title === "YouTube Video") {
      const ogTitleMatch = htmlContent.match(
        /<meta property="og:title" content="([^"]+)"/,
      );
      if (ogTitleMatch) {
        title = ogTitleMatch[1];
        console.log(`✅ Found title from meta: "${title}"`);
      }
    }

    // Method 4: Final fallback to CSS title extraction (only if still default)
    if (title === "YouTube Video") {
      console.log(`🔍 Trying CSS title extraction as final fallback...`);
      try {
        const h1Title = await withTimeout(
          BrowserExtension.getContent({
            cssSelector:
              "h1.ytd-watch-metadata yt-formatted-string, #title h1, h1.title",
            format: "text",
            tabId: tabId,
          }),
          3000,
          "Getting title via CSS selector (fallback)",
        );
        if (
          h1Title &&
          h1Title.trim().length > 0 &&
          h1Title.trim().length < 200
        ) {
          title = h1Title.trim();
          console.log(`✅ Found title via CSS fallback: "${title}"`);
        }
      } catch (error) {
        console.log(`❌ CSS title fallback failed: ${error}`);
      }
    }

    // Extract channel info using multiple methods
    let channelName = "Unknown Channel";
    let channelUrl = "https://www.youtube.com";

    // Method 1: Try to get channel name from CSS selectors (more specific to video owner)
    const channelSelectors = [
      // Most specific - target the video owner section
      "ytd-video-owner-renderer ytd-channel-name a",
      "ytd-video-owner-renderer ytd-channel-name yt-formatted-string",
      "ytd-video-owner-renderer .ytd-channel-name a",
      // Alternative specific selectors
      "#owner ytd-channel-name a",
      "#owner .ytd-channel-name a",
      // Broader but still in owner context
      "ytd-channel-name a",
      ".ytd-channel-name a",
      // Fallback
      "#channel-name a, #channel-name yt-formatted-string",
    ];

    for (const selector of channelSelectors) {
      try {
        console.log(`🔍 Trying channel selector: ${selector}`);
        const channelElement = await withTimeout(
          BrowserExtension.getContent({
            cssSelector: selector,
            format: "text",
            tabId: tabId,
          }),
          5000,
          `Getting channel name via selector: ${selector}`,
        );

        if (
          channelElement &&
          channelElement.trim().length > 0 &&
          channelElement.trim().length < 100
        ) {
          channelName = channelElement.trim();
          console.log(
            `✅ Found channel name via CSS: "${channelName}" using selector: ${selector}`,
          );
          break;
        } else if (channelElement) {
          console.log(
            `🔍 Found but rejected channel text (too long/short): "${channelElement.substring(0, 50)}..." using selector: ${selector}`,
          );
        }
      } catch (error) {
        console.log(`❌ Channel selector ${selector} failed: ${error}`);
      }
    }

    // Method 2: Try to get channel URL from CSS selectors (more specific)
    const channelUrlSelectors = [
      "ytd-video-owner-renderer ytd-channel-name a",
      "ytd-video-owner-renderer .ytd-channel-name a",
      "#owner ytd-channel-name a",
      "ytd-channel-name a",
      ".ytd-channel-name a",
    ];

    for (const urlSelector of channelUrlSelectors) {
      try {
        console.log(`🔍 Trying channel URL selector: ${urlSelector}`);
        const channelLinkHTML = await withTimeout(
          BrowserExtension.getContent({
            cssSelector: urlSelector,
            format: "html",
            tabId: tabId,
          }),
          5000,
          `Getting channel URL via selector: ${urlSelector}`,
        );

        if (channelLinkHTML) {
          const hrefMatch = channelLinkHTML.match(/href="([^"]+)"/);
          if (hrefMatch) {
            let extractedUrl = hrefMatch[1];
            if (extractedUrl.startsWith("/")) {
              extractedUrl = `https://www.youtube.com${extractedUrl}`;
            }
            // Validate that this looks like a proper channel URL
            if (
              extractedUrl.includes("/@") ||
              extractedUrl.includes("/channel/") ||
              extractedUrl.includes("/c/")
            ) {
              channelUrl = extractedUrl;
              console.log(
                `✅ Found channel URL via CSS: "${channelUrl}" using selector: ${urlSelector}`,
              );
              break;
            } else {
              console.log(
                `🔍 Found URL but doesn't look like channel: "${extractedUrl}" using selector: ${urlSelector}`,
              );
            }
          }
        }
      } catch (error) {
        console.log(`❌ Channel URL selector ${urlSelector} failed: ${error}`);
      }
    }

    // Method 3: Fallback to regex-based extraction from HTML
    if (channelName === "Unknown Channel") {
      const channelMatch = htmlContent.match(/"ownerChannelName":"([^"]+)"/);
      if (channelMatch) {
        channelName = decodeHTMLEntities(channelMatch[1]);
        console.log(`✅ Found channel name via regex: ${channelName}`);
      }
    }

    if (channelUrl === "https://www.youtube.com") {
      const channelIdMatch = htmlContent.match(/"channelId":"([^"]+)"/);
      if (channelIdMatch) {
        channelUrl = `https://www.youtube.com/channel/${channelIdMatch[1]}`;
        console.log(`✅ Found channel URL via regex: ${channelUrl}`);
      }
    }

    // Extract duration
    let duration: string | undefined;

    // Method 1: Try CSS selectors for duration
    const durationSelectors = [
      // Player duration display
      ".ytp-time-duration",
      ".ytp-bound-time-right",
      // Video info duration
      "span.ytd-thumbnail-overlay-time-status-renderer",
      ".ytd-thumbnail-overlay-time-status-renderer #text",
      // Alternative selectors
      '[class*="time-status"] #text',
      ".badge-shape-wiz__text",
      "ytd-thumbnail-overlay-time-status-renderer .badge-shape-wiz__text",
    ];

    for (const selector of durationSelectors) {
      try {
        console.log(`🔍 Trying duration selector: ${selector}`);
        const durationText = await withTimeout(
          BrowserExtension.getContent({
            cssSelector: selector,
            format: "text",
            tabId: tabId,
          }),
          3000,
          `Getting duration via CSS selector: ${selector}`,
        );

        if (durationText && durationText.trim().match(/^\d+:\d+/)) {
          duration = durationText.trim();
          console.log(
            `✅ Found duration via CSS: "${duration}" using selector: ${selector}`,
          );
          break;
        }
      } catch (error) {
        console.log(`❌ Duration selector ${selector} failed: ${error}`);
      }
    }

    // Method 2: Try to extract from meta tags or JSON-LD
    if (!duration) {
      console.log("🔍 Trying duration regex patterns in HTML...");

      // Try multiple duration patterns
      const durationPatterns = [
        /"duration":"PT(\d+H)?(\d+M)?(\d+S)"/,
        /"lengthSeconds":"(\d+)"/,
        /"approxDurationMs":"(\d+)"/,
        /PT(\d+H)?(\d+M)?(\d+S)/,
      ];

      for (const pattern of durationPatterns) {
        const match = htmlContent.match(pattern);
        if (match) {
          console.log(`🔍 Found duration match:`, match);

          if (pattern.source.includes("lengthSeconds")) {
            // Convert seconds to MM:SS or H:MM:SS format
            const totalSeconds = parseInt(match[1]);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            if (hours > 0) {
              duration = `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
            } else {
              duration = `${minutes}:${seconds.toString().padStart(2, "0")}`;
            }
          } else if (pattern.source.includes("approxDurationMs")) {
            // Convert milliseconds to MM:SS or H:MM:SS format
            const totalSeconds = Math.floor(parseInt(match[1]) / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            if (hours > 0) {
              duration = `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
            } else {
              duration = `${minutes}:${seconds.toString().padStart(2, "0")}`;
            }
          } else {
            // PT format
            const hours = match[1] ? parseInt(match[1].replace("H", "")) : 0;
            const minutes = match[2] ? parseInt(match[2].replace("M", "")) : 0;
            const seconds = match[3] ? parseInt(match[3].replace("S", "")) : 0;

            if (hours > 0) {
              duration = `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
            } else {
              duration = `${minutes}:${seconds.toString().padStart(2, "0")}`;
            }
          }

          console.log(`✅ Found duration via regex: "${duration}"`);
          break;
        }
      }

      if (!duration) {
        console.log("❌ No duration found in HTML content");
      }
    }

    // Extract description
    let description = "Description not available";

    // Method 1: Try CSS selector for description (with Safari-specific selectors)
    const descriptionSelectors = [
      // Chrome/Arc selectors
      "ytd-expandable-video-description-body-renderer",
      ".ytd-expandable-video-description-body-renderer",
      "#description",
      // Safari-specific selectors
      '[class*="expandable-video-description-body"]',
      "ytd-expandable-video-description-body-renderer .content",
      "#description-inline-expander",
      "#meta-contents #description",
      // Broader fallbacks
      '[id*="description"]',
      ".description",
      "ytd-video-secondary-info-renderer #description",
    ];

    for (const selector of descriptionSelectors) {
      try {
        console.log(`🔍 Trying description selector: ${selector}`);
        const cssDescription = await withTimeout(
          BrowserExtension.getContent({
            cssSelector: selector,
            format: "text",
            tabId: tabId,
          }),
          3000,
          `Getting description via CSS selector: ${selector}`,
        );

        if (cssDescription && cssDescription.trim().length > 10) {
          description = cssDescription.trim();
          console.log(
            `✅ Found description via CSS (${description.length} chars) using selector: ${selector}`,
          );
          break;
        }
      } catch (error) {
        console.log(`❌ Description selector ${selector} failed: ${error}`);
      }
    }

    // Method 2: Fallback to regex
    if (description === "Description not available") {
      const descMatch = htmlContent.match(/"description":"([^"]+)"/);
      if (descMatch) {
        description = decodeHTMLEntities(descMatch[1]);
        console.log(
          `✅ Found description via regex (${description.length} chars)`,
        );
      }
    }

    return {
      title: decodeHTMLEntities(title),
      channelName,
      channelUrl,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      description,
      duration,
    };
  } catch (error) {
    console.log(`❌ Metadata extraction failed: ${error}`);

    // Handle Safari-specific access restrictions
    if (isSafariAccessError(error)) {
      throw handleSafariError("page content access");
    }

    throw error;
  }
}

/**
 * Extract transcript using Browser Extension API
 */
async function extractTranscript(tabId: number): Promise<string | null> {
  try {
    console.log(`🔍 Extracting transcript from tab ${tabId}...`);

    // First, check if transcript panel is visible or needs to be opened
    let needsTranscriptButton = false;
    try {
      // Check if transcript panel exists but is not expanded
      const transcriptButton = await withTimeout(
        BrowserExtension.getContent({
          cssSelector:
            'button[aria-label*="transcript" i], button[aria-label*="Show transcript" i], #show-hide-transcript',
          format: "text",
          tabId: tabId,
        }),
        3000,
        "Checking for transcript button",
      );

      console.log(`🔍 Transcript button text found: "${transcriptButton}"`);

      if (transcriptButton && transcriptButton.trim().length > 0) {
        console.log(
          "🔍 Transcript button found, checking if transcript panel needs to be opened",
        );
        needsTranscriptButton = true;
      }
    } catch (error) {
      console.log(`🔍 Could not check transcript button: ${error}`);
    }

    // Try to get clean transcript text without timestamps
    try {
      console.log("🔍 Attempting to extract clean transcript text");
      const cleanTranscript = await extractCleanTranscript(tabId);
      if (cleanTranscript) {
        console.log(
          `✅ Found clean transcript text (${cleanTranscript.length} chars)`,
        );
        return cleanTranscript;
      }
    } catch (error) {
      console.log(`🔍 Clean transcript extraction failed: ${error}`);
    }

    // Fallback to text-only extraction
    // Try different selectors for transcript content - prioritize container selectors that get all segments
    const transcriptSelectors = [
      // Container selectors that should capture all transcript segments
      "ytd-transcript-segment-list-renderer",
      "ytd-transcript-search-panel-renderer",
      "ytd-transcript-renderer #content",
      "#segments-container",
      // Alternative container approaches
      'div[id="segments-container"]',
      "ytd-transcript-segment-list-renderer #segments-container",
      // Fallback individual selectors (may only get first segment)
      "yt-formatted-string.segment-text.style-scope.ytd-transcript-segment-renderer",
      "ytd-transcript-segment-renderer yt-formatted-string.segment-text",
      ".segment-text",
      "yt-formatted-string.segment-text",
    ];

    for (const selector of transcriptSelectors) {
      try {
        console.log(`🔍 Trying selector: ${selector}`);
        const transcriptText = await withTimeout(
          BrowserExtension.getContent({
            cssSelector: selector,
            format: "text",
            tabId: tabId,
          }),
          8000,
          `Getting transcript via selector: ${selector}`,
        );

        if (transcriptText && transcriptText.trim().length > 50) {
          console.log(
            `✅ Found transcript with ${selector} (${transcriptText.length} chars)`,
          );
          // Clean the transcript text to remove timestamps
          const cleanedText = cleanTranscriptText(transcriptText);
          return cleanedText || transcriptText.trim();
        } else if (transcriptText && transcriptText.trim().length > 0) {
          console.log(
            `🔍 Found short content with ${selector}: "${transcriptText.substring(0, 100)}..."`,
          );
        }
      } catch (error) {
        console.log(`❌ Selector ${selector} failed: ${error}`);
      }
    }

    // If no individual segments found, try alternative container selectors
    const containerSelectors = [
      "ytd-transcript-renderer",
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]',
      '[target-id="engagement-panel-searchable-transcript"] ytd-transcript-renderer',
      'ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"]',
    ];

    for (const containerSelector of containerSelectors) {
      try {
        console.log(`🔍 Trying container selector: ${containerSelector}`);
        const fullTranscript = await withTimeout(
          BrowserExtension.getContent({
            cssSelector: containerSelector,
            format: "text",
            tabId: tabId,
          }),
          8000,
          `Getting transcript via container: ${containerSelector}`,
        );

        if (fullTranscript && fullTranscript.trim().length > 100) {
          console.log(
            `✅ Found transcript via container (${fullTranscript.length} chars)`,
          );
          return fullTranscript.trim();
        } else if (fullTranscript && fullTranscript.trim().length > 0) {
          console.log(
            `🔍 Found short content with container ${containerSelector}: "${fullTranscript.substring(0, 100)}..."`,
          );
        }
      } catch (error) {
        console.log(
          `❌ Container selector ${containerSelector} failed: ${error}`,
        );
      }
    }

    console.log("❌ No transcript found with any selector");

    // If we found a transcript button that needs to be clicked and no transcript content, throw a specific error
    if (needsTranscriptButton) {
      console.log(
        "🔍 No transcript content found, but transcript button exists - user should click it",
      );
      throw new Error("TRANSCRIPT_BUTTON_NEEDED");
    }

    return null;
  } catch (error) {
    console.log(`❌ Transcript extraction failed: ${error}`);

    // Re-throw specific errors
    if (
      error instanceof Error &&
      error.message === "TRANSCRIPT_BUTTON_NEEDED"
    ) {
      throw error;
    }

    // Handle Safari-specific access restrictions for transcript
    if (isSafariAccessError(error)) {
      console.log(
        "🔍 Safari access restriction detected for transcript - continuing without transcript",
      );
      return null; // Don't throw for transcript, just continue without it
    }

    return null;
  }
}

/**
 * Main command entry point
 */
export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Processing YouTube Video",
  });

  try {
    // Get YouTube tab
    const youtubeTab = await getYouTubeTab();
    if (!youtubeTab) {
      throw new Error("No YouTube tab found");
    }

    // Check for transcript first
    let transcript: string | null = null;
    let transcriptButtonNeeded = false;

    try {
      transcript = await extractTranscript(youtubeTab.tabId);
    } catch (transcriptError) {
      if (
        transcriptError instanceof Error &&
        transcriptError.message === "TRANSCRIPT_BUTTON_NEEDED"
      ) {
        transcriptButtonNeeded = true;
        console.log("🔍 Transcript button needs to be clicked first");
      } else {
        console.log(`❌ Transcript extraction error: ${transcriptError}`);
      }
    }

    // If transcript button needs to be clicked, update toast and stop
    if (transcriptButtonNeeded) {
      console.log("🔍 Showing transcript button toast to user");
      toast.style = Toast.Style.Failure;
      toast.title = 'Click "Show transcript" below video first';
      toast.message =
        "Then run this command again to process the video with transcript.";
      return;
    }

    // Extract video metadata
    const metadata = await extractVideoMetadata(
      youtubeTab.tabId,
      youtubeTab.url,
      youtubeTab.title,
    );

    // Combine all info
    const videoInfo: VideoInfo = {
      title: metadata.title || "YouTube Video",
      channelName: metadata.channelName || "Unknown Channel",
      channelUrl: metadata.channelUrl || "https://www.youtube.com",
      url: metadata.url || youtubeTab.url,
      videoId: metadata.videoId || "",
      description: metadata.description || "Description not available",
      transcript: transcript || undefined,
      duration: metadata.duration,
    };

    console.log(
      `🔍 Final video info - Title: "${videoInfo.title}", Duration: "${videoInfo.duration}"`,
    );

    // Format video info for Tana
    const titleWithDuration = videoInfo.duration
      ? `${videoInfo.title} (${videoInfo.duration})`
      : videoInfo.title;

    // Prepare transcript content if available
    let transcriptContent = "";
    if (videoInfo.transcript) {
      transcriptContent = `Transcript:: ${videoInfo.transcript}`;
    }

    const tanaFormat = formatForTana({
      title: titleWithDuration,
      url: videoInfo.url,
      channelUrl: videoInfo.channelUrl,
      description:
        videoInfo.description &&
        videoInfo.description !== "Description not available"
          ? videoInfo.description
          : undefined,
      author: videoInfo.channelName,
      duration: videoInfo.duration,
      content: transcriptContent,
      videoTag: preferences.videoTag,
      articleTag: preferences.articleTag,
      transcriptTag: preferences.transcriptTag,
      urlField: preferences.urlField,
      authorField: preferences.authorField,
      transcriptField: preferences.transcriptField,
      contentField: preferences.contentField,
      includeAuthor: preferences.includeAuthor,
      includeDescription: preferences.includeDescription,
    });

    await Clipboard.copy(tanaFormat);

    // Open Tana and update toast to success
    try {
      await execAsync("open tana://");
      // Update toast to success
      toast.style = Toast.Style.Success;
      if (transcript) {
        toast.title = "Success!";
        toast.message =
          "YouTube video info and transcript copied to clipboard. Opening Tana...";
      } else {
        toast.title = "Success!";
        toast.message =
          "YouTube video info copied to clipboard (no transcript available). Opening Tana...";
      }
    } catch (error) {
      console.error("Error opening Tana:", error);
      // Update toast to success but note Tana couldn't be opened
      toast.style = Toast.Style.Success;
      if (transcript) {
        toast.title = "Success!";
        toast.message =
          "YouTube video info and transcript copied to clipboard (but couldn't open Tana)";
      } else {
        toast.title = "Success!";
        toast.message =
          "YouTube video info copied to clipboard (no transcript available, couldn't open Tana)";
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Update toast to show specific Safari error messages or general error
    if (errorMessage.includes("Safari Access Restricted")) {
      toast.style = Toast.Style.Failure;
      toast.title = "Safari Access Restricted";
      toast.message =
        "Please check Safari settings and reload the page. Works fine in Arc/Chrome.";
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to process YouTube video";
      toast.message = errorMessage;
    }
  }
}

/**
 * Extract clean transcript text without timestamps from YouTube
 */
async function extractCleanTranscript(tabId: number): Promise<string | null> {
  try {
    // Try to get only the text content from transcript segments, excluding timestamps
    const textOnlySelectors = [
      // Target only the text elements within transcript segments
      "ytd-transcript-segment-renderer .segment-text",
      "ytd-transcript-segment-renderer yt-formatted-string.segment-text",
      ".segment-text:not(.segment-timestamp)",
      "yt-formatted-string.segment-text.style-scope.ytd-transcript-segment-renderer",
    ];

    for (const selector of textOnlySelectors) {
      try {
        console.log(`🔍 Trying text-only selector: ${selector}`);
        const textContent = await withTimeout(
          BrowserExtension.getContent({
            cssSelector: selector,
            format: "text",
            tabId: tabId,
          }),
          5000,
          `Getting clean transcript text via: ${selector}`,
        );

        if (textContent && textContent.trim().length > 50) {
          // Clean up the text by removing timestamp patterns and joining properly
          const cleanedText = cleanTranscriptText(textContent);
          if (cleanedText && cleanedText.length > 50) {
            console.log(
              `✅ Found clean transcript text with ${selector} (${cleanedText.length} chars)`,
            );
            return cleanedText;
          }
        }
      } catch (error) {
        console.log(`❌ Text-only selector ${selector} failed: ${error}`);
      }
    }

    return null;
  } catch (error) {
    console.log(`❌ Clean transcript extraction failed: ${error}`);
    return null;
  }
}

/**
 * Clean transcript text by removing timestamps and formatting properly
 */
function cleanTranscriptText(rawText: string): string {
  if (!rawText) return "";

  const cleanedText = rawText
    // Remove timestamp patterns like "0:00", "1:23", "12:34:56" with surrounding spaces
    .replace(/\s*\b\d{1,2}:\d{2}(?::\d{2})?\b\s*/g, " ")
    // Remove decimal timestamps like "0.5", "12.34"
    .replace(/\s*\b\d+\.\d+\b\s*/g, " ")
    // Remove standalone numbers that might be timestamps (with word boundaries)
    .replace(/\s+\b\d+\b\s+/g, " ")
    // Remove any remaining isolated numbers at start of lines
    .replace(/^\s*\d+\s+/gm, "")
    // Remove multiple consecutive spaces
    .replace(/\s{2,}/g, " ")
    // Remove extra whitespace and normalize
    .trim();

  return cleanedText;
}
