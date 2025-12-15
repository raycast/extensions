import * as cheerio from "cheerio";
import fetch from "node-fetch";

export interface Metadata {
  title: string;
  author: string | null;
  publishedDate: string | null;
}

export async function fetchMetadata(url: string): Promise<Metadata> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch URL: ${response.status} ${response.statusText}`,
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. Try JSON-LD first (most reliable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let jsonLdData: any = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "{}");
        if (
          data["@type"] === "Article" ||
          data["@type"] === "BlogPosting" ||
          data["@type"] === "NewsArticle"
        ) {
          jsonLdData = data;
          return false; // break
        }
      } catch (e) {
        // ignore parse errors
      }
    });

    // 2. Extract Title
    let title = "Untitled";
    if (jsonLdData && jsonLdData.headline) {
      title = jsonLdData.headline;
    } else {
      // Heuristic: Some blogs use h2 for the post title if h1 is site title
      // We prefer og:title, but if it matches the site title (often <title>), we might want to look deeper.
      // For now, let's keep the standard order but add h2 as a fallback.
      const ogTitle = $('meta[property="og:title"]').attr("content");

      // Improved H1 extraction:
      // 1. Select all h1s
      // 2. Filter out common site-title classes
      // 3. Prioritize h1 inside main/article
      let h1 = "";
      const h1s = $("h1");
      if (h1s.length > 0) {
        // Filter out likely site titles
        const contentH1s = h1s.filter((_, el) => {
          const className = $(el).attr("class") || "";
          const id = $(el).attr("id") || "";
          const lowerClass = className.toLowerCase();
          const lowerId = id.toLowerCase();
          return (
            !lowerClass.includes("menu-title") &&
            !lowerClass.includes("site-title") &&
            !lowerClass.includes("logo") &&
            !lowerId.includes("site-title")
          );
        });

        if (contentH1s.length > 0) {
          // Prefer h1 inside main or article
          const mainH1 = contentH1s.filter((_, el) => {
            return $(el).closest("main, article, .post, .content").length > 0;
          });

          if (mainH1.length > 0) {
            h1 = $(mainH1[0]).text().trim();
          } else {
            h1 = $(contentH1s[0]).text().trim();
          }
        } else {
          // Fallback to first h1 if all were filtered (unlikely but safe)
          h1 = h1s.first().text().trim();
        }
      }

      const h2 = $("h2").first().text().trim();
      const pageTitle = $("title").text().trim();

      // If og:title exists and is different from page title (which might be just "Author Name"), use it.
      // Otherwise, prefer h1 or h2 if they look like titles.
      if (ogTitle && ogTitle !== pageTitle) {
        title = ogTitle;
      } else if (h1 && h1 !== pageTitle && h1 !== ogTitle) {
        title = h1;
      } else if (h2) {
        // Specific fix for nabeelqu.co where title is in h2
        title = h2;
      } else if (h1) {
        title = h1;
      } else if (pageTitle) {
        title = pageTitle;
      } else {
        title = "Untitled";
      }
    }

    // 3. Extract Author
    let author: string | null = null;
    if (jsonLdData && jsonLdData.author) {
      if (Array.isArray(jsonLdData.author)) {
        author = jsonLdData.author[0]?.name || null;
      } else if (typeof jsonLdData.author === "object") {
        author = jsonLdData.author.name || null;
      } else if (typeof jsonLdData.author === "string") {
        author = jsonLdData.author;
      }
    }

    if (!author) {
      author =
        $('meta[name="author"]').attr("content") ||
        $('meta[property="article:author"]').attr("content") ||
        $('meta[property="og:author"]').attr("content") ||
        $('meta[name="twitter:creator"]').attr("content") ||
        $('a[rel="author"]').first().text().trim() ||
        $(".author").first().text().trim() ||
        $(".byline").first().text().trim() ||
        // Heuristic: Look for "By [Name]" text nodes
        null;
    }

    // 4. Extract Date
    let publishedDate: string | null = null;
    if (jsonLdData && (jsonLdData.datePublished || jsonLdData.dateCreated)) {
      publishedDate = jsonLdData.datePublished || jsonLdData.dateCreated;
    }

    if (!publishedDate) {
      publishedDate =
        $('meta[property="article:published_time"]').attr("content") ||
        $('meta[name="date"]').attr("content") ||
        $('meta[property="og:published_time"]').attr("content") ||
        $("time[datetime]").attr("datetime") ||
        $("time").attr("datetime") ||
        null;
    }

    // Heuristic: Look for "Published: [Date]" text
    if (!publishedDate) {
      const bodyText = $("body").text();
      const publishedMatch = bodyText.match(
        /Published:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/,
      );
      if (publishedMatch) {
        publishedDate = publishedMatch[1] + " UTC";
      }
    }

    // Normalize Date
    if (publishedDate) {
      try {
        publishedDate = new Date(publishedDate).toISOString().split("T")[0];
      } catch (e) {
        // If date parsing fails, keep original or set to null?
        // Let's try to be safe and set to null if it's clearly invalid,
        // but simple strings might be valid for the user to fix.
        // For now, if it fails ISO conversion, we leave it null or try simple regex.
        publishedDate = null;
      }
    }

    return {
      title: title.trim(),
      author: author ? author.trim() : null,
      publishedDate,
    };
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return {
      title: "Untitled",
      author: null,
      publishedDate: null,
    };
  }
}
