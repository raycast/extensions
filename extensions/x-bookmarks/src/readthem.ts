#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";
import { homedir } from "os";
import { BrowserExtension, environment, showToast, Toast } from "@raycast/api";

/**
 * Returns the path to the default Firefox bookmarks storage (`places.sqlite`) on macOS only.
 */
export function getDefaultMacFirefoxBookmarksPath(): string {
  const home = homedir();
  const possibleBaseDirs = [
    path.join(home, "Library", "Application Support", "Firefox"),
    path.join(home, "Library", "Application Support", "zen"),
  ];

  let foundProfilesIni = null;
  let foundBaseDir = null;

  for (const baseDir of possibleBaseDirs) {
    const profilesIniPath = path.join(baseDir, "profiles.ini");
    if (fs.existsSync(profilesIniPath)) {
      foundProfilesIni = profilesIniPath;
      foundBaseDir = baseDir;
      break;
    }
  }

  if (!foundProfilesIni || !foundBaseDir) {
    throw new Error(`Could not find Firefox profiles.ini in any of: ${possibleBaseDirs.join(", ")}`);
  }

  const iniContent = fs.readFileSync(foundProfilesIni, "utf8");
  const lines = iniContent.split(/\r?\n/);

  let inProfileSection = false;
  let inInstallSection = false;
  let currentProfile: Record<string, string> = {};
  let defaultProfilePath: string | null = null;
  let defaultProfileIsRelative = true;
  const installSections: Array<{ section: string; defaultPath: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("[")) {
      if (trimmed.startsWith("[Install")) {
        inInstallSection = true;
        inProfileSection = false;
        installSections.push({ section: trimmed.slice(1, -1), defaultPath: "" });
      } else if (trimmed.startsWith("[Profile")) {
        inProfileSection = true;
        inInstallSection = false;
        currentProfile = {};
      } else {
        inInstallSection = false;
        inProfileSection = false;
      }
      continue;
    }

    if (inInstallSection && trimmed.startsWith("Default=")) {
      const defaultPath = trimmed.split("=")[1].trim();
      if (installSections.length > 0) {
        installSections[installSections.length - 1].defaultPath = defaultPath;
      }
      continue;
    }

    if (inProfileSection && trimmed.length > 0 && !trimmed.startsWith("[")) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        currentProfile[key] = value;

        if (key === "IsRelative") {
          defaultProfileIsRelative = value === "1";
        }
      }
    }
  }

  if (installSections.length > 0) {
    defaultProfilePath = installSections[0].defaultPath;
  }

  if (!defaultProfilePath) {
    throw new Error(`Could not locate a default Firefox profile in: ${foundProfilesIni}`);
  }

  const profileDir = defaultProfileIsRelative ? path.join(foundBaseDir, defaultProfilePath) : defaultProfilePath;

  const finalPath = path.join(profileDir, "places.sqlite");

  // Verify the places.sqlite file exists
  if (!fs.existsSync(finalPath)) {
    throw new Error(
      `Firefox places.sqlite not found at: ${finalPath}. Available profiles: ${fs
        .readdirSync(path.join(foundBaseDir, "Profiles"))
        .filter((name) => !name.startsWith("."))
        .join(", ")}`,
    );
  }

  console.log("Debug - Profile resolution:", {
    possibleBaseDirs,
    foundBaseDir,
    defaultProfilePath,
    defaultProfileIsRelative,
    profileDir,
    finalPath,
    fileExists: fs.existsSync(finalPath),
    allInstallSections: installSections,
  });

  return finalPath;
}

interface Tweet {
  authorName: string;
  handle: string;
  tweetText: string;
  time: string;
  retweets: string;
  likes: string;
  replies: string;
  link: string;
}

async function injectBookmarkScraperScript(): Promise<Tweet[]> {
  if (!environment.canAccess(BrowserExtension)) {
    throw new Error("Browser Extension is not installed. Please install it to use this feature.");
  }

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Checking X bookmarks page...",
    });

    const tabs = await BrowserExtension.getTabs();
    const bookmarksTab = tabs.find((tab) => tab.url.includes("x.com/i/bookmarks"));

    if (!bookmarksTab) {
      throw new Error("Please navigate to X bookmarks page first (x.com/i/bookmarks)");
    }

    if (!bookmarksTab.active) {
      throw new Error("Please make sure the X bookmarks tab is active");
    }

    // Get the page content
    const pageContent = await BrowserExtension.getContent({
      format: "html",
      tabId: bookmarksTab.id,
    });

    if (!pageContent) {
      throw new Error("Could not get page content");
    }

    // Extract tweet information using regex since we can't use DOM API
    const tweets: Tweet[] = [];
    const tweetMatches = pageContent.match(/<article[^>]*data-testid="tweet"[^>]*>[\s\S]*?<\/article>/g) || [];

    console.log("Content structure:", {
      contentLength: pageContent.length,
      hasArticles: pageContent.includes("article"),
      hasTestId: pageContent.includes('data-testid="tweet"'),
      numberOfMatches: tweetMatches.length,
    });

    for (const tweetHtml of tweetMatches) {
      // Updated regex patterns with better HTML handling
      const authorNameMatch = tweetHtml.match(/data-testid="User-Name"[^>]*>.*?<span[^>]*>(.*?)<\/span>/s);
      const handleMatch = tweetHtml.match(/data-testid="User-Name".*?href="\/([^"/]+)"/s);
      const tweetTextMatch = tweetHtml.match(/data-testid="tweetText"[^>]*>([\s\S]*?)<\/div>/);
      const timeMatch = tweetHtml.match(/<time[^>]*datetime="([^"]+)"/);

      // Updated engagement metrics patterns to match X's HTML structure
      const retweetsMatch = tweetHtml.match(/aria-label="(\d+) Retweets/);
      const likesMatch = tweetHtml.match(/aria-label="(\d+) Likes/);
      const repliesMatch = tweetHtml.match(/aria-label="(\d+) Replies/);
      const linkMatch = tweetHtml.match(/href="(\/[^"]*?\/status\/\d+)"/);

      // Helper function to clean HTML with better text handling
      const cleanHtml = (html?: string) => {
        if (!html) return "";
        return html
          .replace(/<[^>]*>/g, "") // Remove HTML tags
          .replace(/\s+/g, " ") // Normalize whitespace
          .replace(/&quot;/g, '"') // Replace HTML entities
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&nbsp;/g, " ")
          .replace(/\n+/g, "\n") // Normalize newlines
          .trim();
      };

      if (authorNameMatch?.[1] && handleMatch?.[1] && linkMatch?.[1]) {
        const tweet: Tweet = {
          authorName: cleanHtml(authorNameMatch[1]),
          handle: handleMatch[1].split("/")[0],
          tweetText: cleanHtml(tweetTextMatch?.[1] || ""),
          time: timeMatch?.[1] || new Date().toISOString(),
          retweets: retweetsMatch?.[1] || "0",
          likes: likesMatch?.[1] || "0",
          replies: repliesMatch?.[1] || "0",
          link: `https://x.com${linkMatch[1]}`,
        };

        // Only add tweets that have actual content
        if (tweet.authorName && tweet.tweetText) {
          tweets.push(tweet);
        }
      }
    }

    if (tweets.length === 0) {
      console.log("No valid tweets found in content");
    } else {
      console.log(`Successfully parsed ${tweets.length} tweets`);
    }

    await showToast({
      style: Toast.Style.Success,
      title: `Successfully found ${tweets.length} bookmarks`,
    });

    return tweets;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to scrape bookmarks",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
    throw error;
  }
}

// For testing
if (require.main === module) {
  injectBookmarkScraperScript()
    .then((bookmarks) => {
      console.log("Found bookmarks:", bookmarks);
    })
    .catch((err) => {
      console.error("Error:", err);
      process.exit(1);
    });
}

export type { Tweet };
export { injectBookmarkScraperScript };
