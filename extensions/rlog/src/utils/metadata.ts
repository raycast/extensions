import * as cheerio from "cheerio";
import fetch from "node-fetch";

export interface Metadata {
  title: string;
  author: string | null;
  publishedDate: string | null;
}

function normalizeName(name: string | undefined): string | null {
  if (!name) return null;
  // Handle "Last, First" format
  if (name.includes(",")) {
    const parts = name.split(",").map((p) => p.trim());
    if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
  }
  // Handle multiple spaces/newlines
  return name.replace(/\s+/g, " ").trim();
}

function transformUrl(url: string): string {
  // Handle Arxiv PDF -> Abstract
  if (url.includes("arxiv.org/pdf/")) {
    return url.replace("/pdf/", "/abs/").replace(".pdf", "");
  }
  // Handle OpenReview PDF -> Forum
  if (url.includes("openreview.net/pdf?id=")) {
    return url.replace("/pdf?", "/forum?");
  }
  return url;
}

export async function fetchMetadata(url: string): Promise<Metadata> {
  try {
    const targetUrl = transformUrl(url);
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch URL: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get("content-type");

    // Handle PDF
    if (contentType && contentType.includes("application/pdf")) {
      // For non-Arxiv PDFs, we don't parse the full file to avoid heavy dependencies and latency.
      // We fallback to the filename as a title.
      return {
        title: url.split("/").pop()?.replace(".pdf", "") || "Untitled",
        author: null,
        publishedDate: null,
      };
    }

    if (contentType && !contentType.includes("text/html")) {
      console.log(`Skipping non-HTML content: ${contentType}`);
      return {
        title: url.split("/").pop() || "Untitled",
        author: null,
        publishedDate: null,
      };
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
          data["@type"] === "NewsArticle" ||
          data["@type"] === "ScholarlyArticle"
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
    } else if (jsonLdData && jsonLdData.name) {
      title = jsonLdData.name;
    } else {
      // Special handling for arXiv papers
      let arxivTitle = null;
      if (url.includes("arxiv.org")) {
        // arXiv has a specific structure: h1.title contains "Title:" followed by the actual title
        const h1Title = $("h1.title");
        if (h1Title.length > 0) {
          const fullText = h1Title.text();
          // Remove the "Title:" prefix if present
          arxivTitle = fullText.replace(/^Title:\s*/i, "").trim();
        }
      }

      // Heuristic: Some blogs use h2 for the post title if h1 is site title
      // We prefer og:title, but if it matches the site title (often <title>), we might want to look deeper.
      // For now, let's keep the standard order but add h2 as a fallback.
      const ogTitle = $('meta[property="og:title"]').attr("content");
      const citationTitle = $('meta[name="citation_title"]').attr("content");
      const dcTitle =
        $('meta[name="DC.title"]').attr("content") ||
        $('meta[name="dc.title"]').attr("content");

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
      if (arxivTitle) {
        title = arxivTitle;
      } else if (citationTitle) {
        title = citationTitle;
      } else if (dcTitle) {
        title = dcTitle;
      } else if (ogTitle && ogTitle !== pageTitle) {
        title = ogTitle;
      } else if (h1 && h1 !== pageTitle && h1 !== ogTitle) {
        title = h1;
      } else if (h2) {
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
    // Detect if this is an academic paper (has citation_author meta tags or is from arxiv/openreview)
    const citationAuthors = $('meta[name="citation_author"]')
      .map((_, el) => normalizeName($(el).attr("content")))
      .get()
      .filter(Boolean);

    const isAcademicPaper =
      citationAuthors.length > 0 ||
      url.includes("arxiv.org") ||
      url.includes("openreview.net") ||
      jsonLdData?.["@type"] === "ScholarlyArticle";

    let author: string | null = null;
    if (jsonLdData && jsonLdData.author) {
      if (Array.isArray(jsonLdData.author)) {
        const authors = jsonLdData.author
          .map((a: { name?: string } | string) =>
            normalizeName(typeof a === "string" ? a : a.name),
          )
          .filter(Boolean);
        if (isAcademicPaper) {
          author = authors.length > 1 ? `${authors[0]} et al.` : authors[0];
        } else {
          author =
            authors.length > 4
              ? `${authors.slice(0, 4).join(", ")}, et al.`
              : authors.join(", ");
        }
      } else if (typeof jsonLdData.author === "object") {
        author = normalizeName(jsonLdData.author.name);
      } else if (typeof jsonLdData.author === "string") {
        author = normalizeName(jsonLdData.author);
      }
    }

    if (!author) {
      const dcAuthors = $(
        'meta[name="DC.creator"], meta[name="dc.creator"], meta[name="DC.author"], meta[name="dc.author"]',
      )
        .map((_, el) => normalizeName($(el).attr("content")))
        .get()
        .filter(Boolean);

      if (citationAuthors.length > 0) {
        // Academic paper: first author + et al.
        author =
          citationAuthors.length > 1
            ? `${citationAuthors[0]} et al.`
            : citationAuthors[0];
      } else if (dcAuthors.length > 0) {
        // DC authors: treat as academic if multiple
        author = dcAuthors.length > 1 ? `${dcAuthors[0]} et al.` : dcAuthors[0];
      } else {
        // Blog/article fallback
        author =
          normalizeName($('meta[name="author"]').attr("content")) ||
          normalizeName($('meta[property="article:author"]').attr("content")) ||
          normalizeName($('meta[property="og:author"]').attr("content")) ||
          normalizeName($('meta[name="twitter:creator"]').attr("content")) ||
          normalizeName($('a[rel="author"]').first().text()) ||
          normalizeName($(".author").first().text()) ||
          normalizeName($(".byline").first().text()) ||
          null;
      }
    }

    // 4. Extract Date
    let publishedDate: string | null = null;
    if (jsonLdData && (jsonLdData.datePublished || jsonLdData.dateCreated)) {
      publishedDate = jsonLdData.datePublished || jsonLdData.dateCreated;
    }

    if (!publishedDate) {
      publishedDate =
        $('meta[name="citation_publication_date"]').attr("content") ||
        $('meta[name="citation_date"]').attr("content") ||
        $('meta[name="DC.date"]').attr("content") ||
        $('meta[name="dc.date"]').attr("content") ||
        $('meta[name="DCTERMS.issued"]').attr("content") ||
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
