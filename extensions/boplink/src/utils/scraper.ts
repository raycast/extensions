import puppeteer, { Browser, Page } from "puppeteer-core";
import { ConvertedLink, ScrapeResult } from "../types";
import { PLATFORM_MAP } from "../constants/platforms";
import { existsSync } from "fs";

/**
 * Handles web scraping of song.link to get converted streaming links
 * Uses puppeteer-core with system Chrome for better memory efficiency
 */
export class SongLinkScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Finds the Chrome/Chromium executable path on macOS
   * Checks common browser installation locations
   */
  private getChromePath(): string | null {
    // List of possible Chrome-based browser paths on macOS
    const possiblePaths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Arc.app/Contents/MacOS/Arc",
      // Homebrew installations
      "/usr/local/bin/chromium",
      "/opt/homebrew/bin/chromium",
    ];

    // Find the first available browser
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        console.log(`Found Chrome at: ${path}`);
        return path;
      }
    }

    return null;
  }

  /**
   * Initializes Puppeteer browser instance with memory optimizations
   * Uses minimal resources to stay within Raycast's memory limits
   */
  private async initBrowser(): Promise<void> {
    // Skip if browser already initialized
    if (this.browser) return;

    const chromePath = this.getChromePath();
    if (!chromePath) {
      throw new Error("Chrome-based browser not found. Please install Google Chrome, Brave, Edge, or Arc browser.");
    }

    try {
      // Launch browser with aggressive memory-saving options
      this.browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: true,
        args: [
          // Security and sandboxing
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",

          // Memory optimization flags
          "--disable-gpu",
          "--disable-software-rasterizer",
          "--disable-extensions",
          "--disable-default-apps",
          "--disable-background-networking",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
          "--disable-features=TranslateUI",
          "--disable-ipc-flooding-protection",
          "--disable-client-side-phishing-detection",

          // Performance flags
          "--no-first-run",
          "--no-default-browser-check",
          "--mute-audio",
          "--metrics-recording-only",

          // Memory limits
          "--js-flags=--max-old-space-size=256",
          "--max_old_space_size=256",

          // Process management
          "--single-process",
          "--no-zygote",

          // Disable unnecessary features
          "--disable-web-security",
          "--disable-features=IsolateOrigins,site-per-process",
          "--disable-site-isolation-trials",
        ],
        defaultViewport: { width: 1024, height: 768 },
        timeout: 30000,
      });
    } catch (error) {
      throw new Error(`Failed to launch browser: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Creates a new page with optimized settings
   * Blocks unnecessary resources to save memory and speed up loading
   */
  private async createOptimizedPage(): Promise<Page> {
    if (!this.browser) {
      await this.initBrowser();
    }

    // Close existing page if any (to free memory)
    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }

    // Create new page
    const page = await this.browser!.newPage();

    // Set basic user agent
    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36");

    // Enable request interception to block unnecessary resources
    await page.setRequestInterception(true);

    page.on("request", (request) => {
      const resourceType = request.resourceType();
      const url = request.url();

      // Allow only essential resources
      const allowedTypes = ["document", "script", "xhr", "fetch"];

      // Block tracking and analytics
      const blockedDomains = [
        "google-analytics",
        "googletagmanager",
        "doubleclick",
        "facebook",
        "twitter",
        "pinterest",
        "instagram",
        "tiktok",
        "amazon-adsystem",
        "googlesyndication",
        "adnxs",
        "adsystem",
        "clarity.ms",
        "hotjar",
        "fullstory",
        "segment",
        "mixpanel",
        "amplitude",
      ];

      // Check if should block
      const shouldBlock = !allowedTypes.includes(resourceType) || blockedDomains.some((domain) => url.includes(domain));

      if (shouldBlock) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Disable cache to save memory
    await page.setCacheEnabled(false);

    return page;
  }

  /**
   * Scrapes song.link for available streaming platform links
   * Extracts metadata (title, artist, type) and platform links
   */
  async scrape(url: string): Promise<ScrapeResult> {
    let page: Page | null = null;

    try {
      // Create optimized page
      page = await this.createOptimizedPage();
      this.page = page;

      // Navigate to song.link
      const songLinkUrl = `https://song.link/${encodeURIComponent(url)}`;
      console.log(`Navigating to: ${songLinkUrl}`);

      // Go to page with minimal waiting
      const response = await page.goto(songLinkUrl, {
        waitUntil: "domcontentloaded", // Don't wait for all resources
        timeout: 20000, // 20 second timeout
      });

      // Check if page loaded successfully
      if (!response || response.status() >= 400) {
        throw new Error("Service is not available at the moment");
      }

      // Wait for the page to render the links
      try {
        await page.waitForSelector(
          'a[href*="spotify.com"], a[href*="music.apple.com"], a[href*="youtube.com"], a[href*="soundcloud.com"], a[href*="deezer.com"]',
          { timeout: 10000 },
        );
      } catch {
        // If no common selectors found, wait a bit for JavaScript to execute
        await page.evaluate(() => {
          return new Promise((resolve) => {
            setTimeout(resolve, 5000);
          });
        });
      }

      // Extract metadata and links from the page
      const pageData = await page.evaluate(() => {
        const results: Array<{ platform: string; url: string }> = [];
        const metadata: {
          title?: string;
          type?: string;
        } = {};

        // ========== EXTRACT METADATA ==========

        // Try to find the song title
        const titleSelectors = [
          "h1",
          '[class*="SongTitle"]',
          '[class*="song-title"]',
          '[class*="Title"]',
          'meta[property="og:title"]',
          'meta[name="twitter:title"]',
        ];

        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            if (element.tagName === "META") {
              metadata.title = (element as HTMLMetaElement).content;
            } else {
              metadata.title = element.textContent?.trim();
            }
            if (metadata.title) break;
          }
        }

        // Determine content type
        const pageUrl = window.location.href;
        const pageText = document.body.textContent?.toLowerCase() || "";

        if (pageText.includes("album") || pageUrl.includes("/album/")) {
          metadata.type = "album";
        } else if (pageText.includes("playlist") || pageUrl.includes("/playlist/")) {
          metadata.type = "playlist";
        } else if (pageText.includes("podcast") || pageUrl.includes("podcast")) {
          metadata.type = "podcast";
        } else {
          metadata.type = "track";
        }

        // ========== EXTRACT PLATFORM LINKS ==========

        // Get all anchor elements on the page
        const anchors = document.querySelectorAll("a[href]");

        // Platform URL patterns to match
        const platformPatterns = [
          { pattern: /spotify\.com/, platform: "spotify" },
          { pattern: /music\.apple\.com/, platform: "apple-music" },
          { pattern: /geo\.music\.apple\.com/, platform: "apple-music" },
          { pattern: /music\.youtube\.com/, platform: "youtube-music" },
          { pattern: /youtube\.com\/watch/, platform: "youtube" },
          { pattern: /soundcloud\.com/, platform: "soundcloud" },
          { pattern: /deezer\.com/, platform: "deezer" },
          { pattern: /tidal\.com/, platform: "tidal" },
          { pattern: /music\.amazon/, platform: "amazon-music" },
          { pattern: /amazon\.\w+\/[^/]*\/dp\//, platform: "amazon" },
          { pattern: /pandora\.com/, platform: "pandora" },
          { pattern: /napster\.com/, platform: "napster" },
          { pattern: /itunes\.apple\.com/, platform: "itunes" },
          { pattern: /music\.yandex/, platform: "yandex-music" },
          { pattern: /audiomack\.com/, platform: "audiomack" },
          { pattern: /audius\.co/, platform: "audius" },
          { pattern: /spinrilla\.com/, platform: "spinrilla" },
          { pattern: /podcasts\.apple\.com/, platform: "apple-podcasts" },
          { pattern: /podcasts\.google\.com/, platform: "google-podcasts" },
          { pattern: /overcast\.fm/, platform: "overcast" },
          { pattern: /castbox\.fm/, platform: "castbox" },
          { pattern: /pocketcasts\.com/, platform: "pocket-casts" },
        ];

        // Check each anchor element
        anchors.forEach((anchor) => {
          const href = (anchor as HTMLAnchorElement).href;

          // Skip song.link internal URLs
          if (href.includes("song.link") || href.includes("odesli.co")) {
            return;
          }

          // Check if URL matches any platform pattern
          for (const { pattern, platform } of platformPatterns) {
            if (pattern.test(href)) {
              // Check if we already have this platform
              const exists = results.some((r) => r.platform === platform);
              if (!exists) {
                results.push({ platform, url: href });
              }
              break; // Found a match, no need to check other patterns
            }
          }
        });

        return { links: results, metadata };
      });

      console.log(`Found ${pageData.links.length} platform links`);
      console.log("Metadata:", pageData.metadata);

      // Convert raw results to ConvertedLink format
      const convertedLinks: ConvertedLink[] = [];

      for (const link of pageData.links) {
        const platform = PLATFORM_MAP.get(link.platform);
        if (platform) {
          convertedLinks.push({
            platform,
            url: link.url,
          });
        }
      }

      // Check if we found any links
      if (convertedLinks.length === 0) {
        return {
          links: [],
          error: "This content is not available on other platforms",
        };
      }

      // Sort links alphabetically by platform name
      convertedLinks.sort((a, b) => a.platform.name.localeCompare(b.platform.name));

      return {
        links: convertedLinks,
        metadata: pageData.metadata,
      };
    } catch (error) {
      console.error("Scraping error:", error);

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes("Chrome")) {
          return {
            links: [],
            error: error.message,
          };
        }

        if (error.message.includes("timeout")) {
          return {
            links: [],
            error: "Service took too long to respond. Please try again.",
          };
        }

        if (error.message.includes("not available")) {
          return {
            links: [],
            error: error.message,
          };
        }
      }

      // Generic error
      return {
        links: [],
        error: "Failed to convert link. Please try again.",
      };
    } finally {
      // Always close the page to free memory
      if (page) {
        await page.close().catch(() => {});
      }
      this.page = null;
    }
  }

  /**
   * Closes the browser instance to free up resources
   * Should be called when the extension is done
   */
  async close(): Promise<void> {
    try {
      // Close page first
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      // Then close browser
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.error("Error closing browser:", error);
    }
  }
}
