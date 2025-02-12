import { Detail, showToast, Toast, getPreferenceValues, LocalStorage, ActionPanel, Action, Icon } from "@raycast/api";
import OpenAI from "openai";
import { execSync } from "child_process";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { useState, useEffect } from "react";
import { getLLMModel, getSelectedText } from "./utils/common";
import { PRIMARY_LANG_KEY, SHOW_EXPLORE_MORE_KEY, USE_CACHE_KEY } from "./settings";
import { getCacheValue, setCacheValue, CacheableData, clearCache } from "./utils/cache";

interface Preferences {
  openaiApiKey: string;
}

// Use the type from CacheableData
type PageSummary = NonNullable<CacheableData["summary"]>;

// Constants for content limits
const MAX_CONTENT_LENGTH = 6000; // Reduced maximum characters for content
const MAX_TITLE_LENGTH = 300; // Maximum characters for title

// Browser configuration for AppleScript commands
const browsers = [
  {
    name: "Arc",
    script: `tell application "Arc"
      if (count of windows) > 0 then
        get URL of active tab of front window
      end if
    end tell`,
  },
  {
    name: "Google Chrome",
    script: `tell application "Google Chrome"
      if (count of windows) > 0 then
        get URL of active tab of front window
      end if
    end tell`,
  },
  {
    name: "Safari",
    script: `tell application "Safari"
      if (count of windows) > 0 then
        get URL of current tab of front window
      end if
    end tell`,
  },
  {
    name: "Microsoft Edge",
    script: `tell application "Microsoft Edge"
      if (count of windows) > 0 then
        get URL of active tab of front window
      end if
    end tell`,
  },
  {
    name: "Opera",
    script: `tell application "Opera"
      if (count of windows) > 0 then
        get URL of active tab of front window
      end if
    end tell`,
  },
  {
    name: "Brave Browser",
    script: `tell application "Brave Browser"
      if (count of windows) > 0 then
        get URL of active tab of front window
      end if
    end tell`,
  },
  {
    name: "Firefox",
    script: `tell application "Firefox"
      if (count of windows) > 0 then
        get URL of active tab of front window
      end if
    end tell`,
  },
];

// Section titles translations
const sectionTitles: { [key: string]: { [key: string]: string } } = {
  fr: {
    summary: "Résumé",
    keyHighlights: "Points Clés",
    exploreMore: "Pour aller plus loin",
    source: "Source",
  },
  en: {
    summary: "Summary",
    keyHighlights: "Key Highlights",
    exploreMore: "Explore More",
    source: "Source",
  },
  es: {
    summary: "Resumen",
    keyHighlights: "Puntos Clave",
    exploreMore: "Para explorar más",
    source: "Fuente",
  },
  de: {
    summary: "Zusammenfassung",
    keyHighlights: "Wichtige Punkte",
    exploreMore: "Zum Weiterlesen",
    source: "Quelle",
  },
  it: {
    summary: "Riepilogo",
    keyHighlights: "Punti Chiave",
    exploreMore: "Per approfondire",
    source: "Fonte",
  },
  pt: {
    summary: "Resumo",
    keyHighlights: "Pontos-Chave",
    exploreMore: "Para explorar mais",
    source: "Fonte",
  },
  nl: {
    summary: "Samenvatting",
    keyHighlights: "Belangrijkste Punten",
    exploreMore: "Om verder te verkennen",
    source: "Bron",
  },
  ru: {
    summary: "Краткое содержание",
    keyHighlights: "Ключевые моменты",
    exploreMore: "Для дальнейшего изучения",
    source: "Источник",
  },
  zh: {
    summary: "摘要",
    keyHighlights: "要点",
    exploreMore: "深入探索",
    source: "来源",
  },
  ja: {
    summary: "要約",
    keyHighlights: "重要なポイント",
    exploreMore: "さらに探る",
    source: "ソース",
  },
  ko: {
    summary: "요약",
    keyHighlights: "주요 포인트",
    exploreMore: "더 알아보기",
    source: "출처",
  },
};

// Function to get the default browser
function getDefaultBrowser(): string | null {
  try {
    // Simplified and more reliable browser detection
    const command = `defaults read com.apple.LaunchServices/com.apple.launchservices.secure | awk -F'"' '/http;/{getline; getline; print $2}'`;
    const bundleId = execSync(command).toString().trim();
    console.log("Detected bundle ID:", bundleId);

    const bundleIdToName: { [key: string]: string } = {
      "company.thebrowser.Browser": "Arc",
      "com.google.Chrome": "Google Chrome",
      "com.apple.Safari": "Safari",
      "com.microsoft.edgemac": "Microsoft Edge",
      "com.operasoftware.Opera": "Opera",
      "com.brave.Browser": "Brave Browser",
      "org.mozilla.firefox": "Firefox",
    };

    const browser = bundleIdToName[bundleId];
    console.log("Mapped browser name:", browser);
    return browser;
  } catch (error) {
    console.error("Could not detect default browser:", error);
    return null;
  }
}

// Function to get the current URL from various browsers
async function getCurrentURL(): Promise<string | null> {
  const defaultBrowser = getDefaultBrowser();
  console.log(`Default browser: ${defaultBrowser}`);

  // Reorder browsers array to try default browser first
  if (defaultBrowser) {
    const defaultBrowserConfig = browsers.find((b) => b.name === defaultBrowser);
    if (defaultBrowserConfig) {
      browsers.splice(browsers.indexOf(defaultBrowserConfig), 1);
      browsers.unshift(defaultBrowserConfig);
    }
  }

  // Try each browser until we get a URL
  for (const browser of browsers) {
    try {
      console.log(`Trying to get URL from ${browser.name}...`);
      const url = execSync(`osascript -e '${browser.script}'`).toString().trim();
      if (url && url !== "") {
        console.log(`Successfully got URL from ${browser.name}`);
        return url;
      }
    } catch (error) {
      console.log(`${browser.name} not available or no active window`);
      continue;
    }
  }

  return null;
}

// Function to clean and truncate text
function cleanAndTruncateText(text: string, maxLength: number): string {
  return text
    .replace(/[\s\n\t]+/g, " ") // Combine multiple whitespace characters
    .trim()
    .slice(0, maxLength);
}

// Optimized function to extract main content from HTML
function extractMainContent($: cheerio.CheerioAPI): string {
  // Remove unwanted elements more aggressively
  $(
    "script, style, nav, footer, header, aside, iframe, noscript, .nav, .footer, .header, .sidebar, .ad, .advertisement, .social, .comments",
  ).remove();

  // Try to find the main content container
  const selectors = ["main", "article", '[role="main"]', "#content", ".content", ".article", ".post", ".entry"];

  let content = "";

  // Try each selector until we find content
  for (const selector of selectors) {
    const element = $(selector);
    if (element.length > 0) {
      content = element.text();
      if (content.length > 100) {
        break;
      }
    }
  }

  // Fallback to body if no main content found
  if (!content || content.length < 100) {
    content = $("body").text();
  }

  return cleanAndTruncateText(content, MAX_CONTENT_LENGTH);
}

// Function to fetch and extract content from a webpage
async function getPageContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Get title
    const title = cleanAndTruncateText($("title").text(), MAX_TITLE_LENGTH);

    // Get main content with better selectors
    const mainContent = extractMainContent($);

    // Clean up memory
    $.root().empty();

    // Log for debugging
    console.log("Extracted URL:", url);
    console.log("Extracted Title:", title);
    console.log("Content Length:", mainContent.length);

    return `Title: ${title}\n\nContent: ${mainContent}`;
  } catch (error) {
    console.error("Error fetching page content:", error);
    return null;
  }
}

// Function to get content either from selection or webpage
async function getContent(): Promise<{ content: string; source: string }> {
  try {
    // First try to get selected text
    const selectedText = await getSelectedText();
    if (selectedText && selectedText.trim()) {
      return {
        content: selectedText.trim(),
        source: "selection",
      };
    }
  } catch (error) {
    console.log("No text selected, trying webpage...");
  }

  // If no selected text, try to get webpage content
  const url = await getCurrentURL();
  if (!url) {
    throw new Error("No active browser tab found and no text selected");
  }

  const pageContent = await getPageContent(url);
  if (!pageContent) {
    throw new Error("Could not fetch page content");
  }

  return {
    content: pageContent,
    source: url,
  };
}

// Function to summarize content using OpenAI
async function summarizeContent(
  content: string,
  openai: OpenAI,
  language: string,
  isSelectedText: boolean,
  showExploreMore: boolean,
): Promise<string> {
  const languageNames = {
    fr: "French",
    en: "English",
    es: "Spanish",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    nl: "Dutch",
    ru: "Russian",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
  };

  const fullLanguageName = languageNames[language as keyof typeof languageNames] || language;

  const systemPrompt = isSelectedText
    ? `You are a text summarization assistant. You MUST write EVERYTHING in ${fullLanguageName} ONLY. This includes the topic, summary, highlights, and explore more sections. Do not use any other language. Even if the input is in another language, your output must be in ${fullLanguageName} only.`
    : `You are a webpage summarization assistant. You MUST write EVERYTHING in ${fullLanguageName} ONLY. This includes the topic, summary, highlights, and explore more sections. Do not use any other language. Even if the input is in another language, your output must be in ${fullLanguageName} only.`;

  const completion = await openai.chat.completions.create({
    model: getLLMModel(),
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Please analyze this ${isSelectedText ? "text" : "webpage content"} and provide a complete summary in ${fullLanguageName} ONLY. Remember: ALL your output MUST be in ${fullLanguageName}, regardless of the input language.

Required sections (ALL IN ${fullLanguageName.toUpperCase()}):
1. A concise summary in 2-3 sentences maximum
2. The main topic or category (one word or short phrase)
3. Key highlights (2-3 bullet points maximum), use emojis to make it more interesting
${showExploreMore ? `4. Suggest 1-2 related resources or topics to explore further. ${!isSelectedText ? "CRITICAL: You must ONLY suggest resources with URLs that you are 100% certain exist and are accessible. Prefer well-known, authoritative websites (e.g. Wikipedia, official documentation, major news sites, established platforms). NEVER generate or guess URLs. If you cannot find a reliable, existing URL from the content or your knowledge, provide fewer suggestions or none at all. Quality is more important than quantity." : ""}` : ""}

Format the response EXACTLY like this (keep the empty lines between sections, EVERYTHING IN ${fullLanguageName.toUpperCase()}):
TOPIC: <topic>

SUMMARY: <your 2-3 sentence summary>

HIGHLIGHTS:
• <first highlight>
• <second highlight>
• <third highlight if relevant>
${
  showExploreMore
    ? `
EXPLORE MORE:
• <title> - <brief description> - <source> <verified_url>
• <optional_second_title> - <brief description> - <source> <verified_url>`
    : ""
}

Content: "${content}"`,
      },
    ],
    temperature: 0.5, // Reduced for more consistent output
    max_tokens: 500, // Reduced while maintaining quality
  });

  return completion.choices[0].message.content || "No summary generated";
}

// Function to parse the OpenAI response into a structured format
function parseOpenAIResponse(response: string, url: string): PageSummary {
  const lines = response.split("\n");
  const summary: PageSummary = {
    title: "",
    topic: "",
    summary: "",
    highlights: [],
    resources: [],
    url: url,
  };

  let currentSection = "";
  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) continue;

    if (trimmedLine.startsWith("TOPIC:")) {
      summary.topic = trimmedLine.replace("TOPIC:", "").trim();
    } else if (trimmedLine.startsWith("SUMMARY:")) {
      summary.summary = trimmedLine.replace("SUMMARY:", "").trim();
    } else if (trimmedLine === "HIGHLIGHTS:") {
      currentSection = "highlights";
    } else if (trimmedLine === "EXPLORE MORE:") {
      currentSection = "resources";
    } else if (trimmedLine.startsWith("•") || trimmedLine.startsWith("-") || trimmedLine.startsWith("*")) {
      const content = trimmedLine.replace(/^[•\-*]\s*/, "").trim();
      if (content) {
        if (currentSection === "highlights") {
          summary.highlights.push(trimmedLine);
        } else if (currentSection === "resources") {
          // Extract URL from the resource line
          const urlMatch = content.match(/https?:\/\/[^\s]+$/);
          if (urlMatch) {
            const url = urlMatch[0];
            const description = content.slice(0, -url.length).trim();
            // Format as markdown link
            summary.resources.push(`• [${description}](${url})`);
          }
        }
      }
    }
  }

  return summary;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PageSummary | null>(null);
  const [primaryLang, setPrimaryLang] = useState<string>("");
  const [showExploreMore, setShowExploreMore] = useState<boolean>(true);
  const [useCache, setUseCache] = useState<boolean>(true);
  const preferences = getPreferenceValues<Preferences>();
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    // Load preferences from LocalStorage
    const loadPreferences = async () => {
      const [savedPrimaryLang, savedShowExploreMore, savedUseCache] = await Promise.all([
        LocalStorage.getItem<string>(PRIMARY_LANG_KEY),
        LocalStorage.getItem<string>(SHOW_EXPLORE_MORE_KEY),
        LocalStorage.getItem<string>(USE_CACHE_KEY),
      ]);

      if (savedPrimaryLang) setPrimaryLang(savedPrimaryLang);
      if (savedShowExploreMore !== null) setShowExploreMore(savedShowExploreMore === "true");
      if (savedUseCache !== null) setUseCache(savedUseCache === "true");
      setPreferencesLoaded(true);
    };

    loadPreferences();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchSummary() {
      if (!preferencesLoaded || !primaryLang) return;

      try {
        const openai = new OpenAI({
          apiKey: preferences.openaiApiKey,
        });

        // Get content (either selected text or webpage)
        if (!isMounted) return;
        await showToast({ style: Toast.Style.Animated, title: "Getting content..." });
        const { content, source } = await getContent();
        const isSelectedText = source === "selection";

        // Check cache first if enabled
        if (useCache) {
          console.log("Cache is enabled, checking for cached content...");
          const cacheKey = {
            source: isSelectedText ? "selection" : "webpage",
            type: "summary" as const,
            language: primaryLang,
            content: content,
          };
          console.log("Cache key:", cacheKey);

          const cachedSummary = await getCacheValue<"summary">(cacheKey);
          console.log("Cache result:", cachedSummary ? "Found in cache" : "Not found in cache");

          if (cachedSummary) {
            if (isMounted) {
              console.log("Using cached summary");
              setSummary(cachedSummary);
              await showToast({ style: Toast.Style.Success, title: "Summary loaded from cache!" });
              setIsLoading(false);
              return;
            }
          }
        } else {
          console.log("Cache is disabled");
        }

        // Generate summary
        if (!isMounted) return;
        await showToast({ style: Toast.Style.Animated, title: "Generating summary..." });

        const summaryText = await summarizeContent(content, openai, primaryLang, isSelectedText, showExploreMore);
        const parsedSummary = parseOpenAIResponse(summaryText, source);

        if (isMounted) {
          setSummary(parsedSummary);

          // Cache the result if enabled
          if (useCache) {
            console.log("Caching new summary...");
            const cacheKey = {
              source: isSelectedText ? "selection" : "webpage",
              type: "summary" as const,
              language: primaryLang,
              content: content,
            };
            await setCacheValue<"summary">(cacheKey, parsedSummary);
            console.log("Summary cached successfully");
          }

          await showToast({ style: Toast.Style.Success, title: "Summary generated!" });
        }
      } catch (e) {
        if (isMounted) {
          console.error("Error:", e);
          setError(e instanceof Error ? e.message : "An error occurred");
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: e instanceof Error ? e.message : "An error occurred",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchSummary();

    return () => {
      isMounted = false;
    };
  }, [preferencesLoaded, primaryLang]);

  // Prepare markdown content with proper formatting and translated titles
  const markdown = summary
    ? `# ${summary.topic}

## ${sectionTitles[primaryLang]?.summary || "Summary"}
${summary.summary}

## ${sectionTitles[primaryLang]?.keyHighlights || "Key Highlights"}
${summary.highlights.join("\n\n")}

${
  showExploreMore && summary.resources.length > 0
    ? `## ${sectionTitles[primaryLang]?.exploreMore || "Explore More"}
${summary.resources.join("\n\n")}`
    : ""
}

---
${sectionTitles[primaryLang]?.source || "Source"}: ${summary.url}`
    : "";

  if (error) {
    return <Detail markdown={`# Error\n\n${error}`} />;
  }

  if (!preferencesLoaded || !primaryLang) {
    return <Detail isLoading={true} markdown="" />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Summary Only"
              content={summary?.summary || ""}
              shortcut={{ modifiers: [], key: "enter" }}
            />
            <Action.CopyToClipboard
              title="Copy Full Content"
              content={markdown}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Clear Summaries Cache"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
              onAction={async () => {
                try {
                  await clearCache();
                  await showToast({ style: Toast.Style.Success, title: "Cache cleared successfully" });
                  // Refresh the current summary
                  setIsLoading(true);
                  setSummary(null);
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to clear cache",
                    message: error instanceof Error ? error.message : "An error occurred",
                  });
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
