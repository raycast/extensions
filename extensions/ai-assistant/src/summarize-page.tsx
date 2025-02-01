import { Detail, showToast, Toast, getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";
import { execSync } from "child_process";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { useState, useEffect } from "react";
import { getLLMModel, getSelectedText } from "./utils/common";

interface Preferences {
  openaiApiKey: string;
  primaryLang: string;
  showExploreMore: boolean;
}

interface PageSummary {
  title: string;
  topic: string;
  summary: string;
  highlights: string[];
  resources: string[];
  url: string;
}

// Constants for content limits
const MAX_CONTENT_LENGTH = 8000; // Reduced maximum characters for content
const MAX_TITLE_LENGTH = 500; // Maximum characters for title

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
};

// Function to get the default browser
function getDefaultBrowser(): string | null {
  try {
    const command = `defaults read com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers | grep 'LSHandlerRoleAll.*http' -B 1 | grep LSHandlerURLScheme -A 1 | grep LSHandlerRole -A 1 | grep LSHandlerURLScheme -A 2 | grep bundleid | cut -d '"' -f 2`;
    const bundleId = execSync(command).toString().trim();

    const bundleIdToName: { [key: string]: string } = {
      "company.thebrowser.Browser": "Arc",
      "com.google.Chrome": "Google Chrome",
      "com.apple.Safari": "Safari",
      "com.microsoft.edgemac": "Microsoft Edge",
      "com.operasoftware.Opera": "Opera",
      "com.brave.Browser": "Brave Browser",
      "org.mozilla.firefox": "Firefox",
    };

    return bundleIdToName[bundleId] || null;
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
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/\n+/g, " ") // Replace newlines with spaces
    .replace(/\t+/g, " ") // Replace tabs with spaces
    .trim()
    .slice(0, maxLength); // Truncate to max length
}

// Function to extract main content from HTML
function extractMainContent($: cheerio.CheerioAPI): string {
  // Remove unwanted elements
  $("script, style, nav, footer, header, aside, iframe, noscript").remove();

  // Try to find the main content container
  const selectors = ["main", "article", '[role="main"]', "#content", ".content", ".article", ".post", ".entry"];

  let content = "";

  // Try each selector until we find content
  for (const selector of selectors) {
    const element = $(selector);
    if (element.length > 0) {
      content = element.text();
      if (content.length > 100) {
        // Only use if content is substantial
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
  const systemPrompt = isSelectedText
    ? `You are a text summarization assistant. Provide the requested information in ${language} in the exact format specified, without any additional text or explanations.`
    : `You are a webpage summarization assistant. Provide the requested information in ${language} in the exact format specified, without any additional text or explanations.`;

  const userPrompt = `Please analyze this ${isSelectedText ? "text" : "webpage content"} and provide in ${language}:
1. A concise summary in 2-3 sentences maximum
2. The main topic or category (one word or short phrase)
3. Key highlights (2-3 bullet points maximum), use emojis to make it more interesting
${showExploreMore ? `4. Suggest 2-3 related resources or topics to explore further. ${!isSelectedText ? "For each suggestion, include a URL if relevant." : ""}` : ""}

Format the response EXACTLY like this (keep the empty lines between sections):
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
• <first suggestion with brief explanation> ${!isSelectedText ? "<url if available>" : ""}
• <second suggestion with brief explanation> ${!isSelectedText ? "<url if available>" : ""}
• <optional third suggestion> ${!isSelectedText ? "<url if available>" : ""}`
    : ""
}

Content: "${content}"`;

  const completion = await openai.chat.completions.create({
    model: getLLMModel(),
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 600,
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
    } else if (trimmedLine.startsWith("•")) {
      if (currentSection === "highlights") {
        summary.highlights.push(trimmedLine);
      } else if (currentSection === "resources") {
        summary.resources.push(trimmedLine);
      }
    }
  }

  return summary;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PageSummary | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    let isMounted = true;

    async function fetchSummary() {
      try {
        const openai = new OpenAI({
          apiKey: preferences.openaiApiKey,
        });

        // Get content (either selected text or webpage)
        if (!isMounted) return;
        await showToast({ style: Toast.Style.Animated, title: "Getting content..." });
        const { content, source } = await getContent();

        // Generate summary
        if (!isMounted) return;
        await showToast({ style: Toast.Style.Animated, title: "Generating summary..." });
        const isSelectedText = source === "selection";
        const summaryText = await summarizeContent(
          content,
          openai,
          preferences.primaryLang,
          isSelectedText,
          preferences.showExploreMore,
        );
        const parsedSummary = parseOpenAIResponse(summaryText, source);

        if (isMounted) {
          setSummary(parsedSummary);
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
  }, []);

  // Prepare markdown content with proper formatting and translated titles
  const markdown = summary
    ? `# ${summary.topic}

## ${sectionTitles[preferences.primaryLang]?.summary || "Summary"}
${summary.summary}

## ${sectionTitles[preferences.primaryLang]?.keyHighlights || "Key Highlights"}

${summary.highlights.join("\n\n")}

${
  preferences.showExploreMore
    ? `## ${sectionTitles[preferences.primaryLang]?.exploreMore || "Explore More"}

${summary.resources.join("\n\n")}`
    : ""
}

---
${sectionTitles[preferences.primaryLang]?.source || "Source"}: ${summary.url}`
    : "";

  if (error) {
    return <Detail markdown={`# Error\n\n${error}`} />;
  }

  return <Detail isLoading={isLoading} markdown={markdown} />;
}
