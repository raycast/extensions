import { Article, BatchItem, CategoryItem, Source } from "./interfaces";

const API_BASE_URL = "https://kite.kagi.com";

// ============================================================================
// API Response Types
// ============================================================================

interface BatchLatestResponse {
  id: string;
  totalClusters: number;
  totalArticles: number;
  totalReadCount: number;
  language: string;
  totalCategories: number;
  createdAt: string;
}

interface StoryArticle {
  date?: string;
  image_caption?: string;
  title: string;
  domain?: string;
  image?: string;
  link: string;
}

export interface StoryResponse {
  id?: string;
  cluster_number?: number;
  title: string;
  short_summary: string;
  articles: StoryArticle[];
  unique_domains?: number;
  number_of_titles?: number;
  category?: string;
  emoji?: string;
  talking_points?: string[];
  quote?: string;
  quote_author?: string;
  quote_attribution?: string;
  quote_source_url?: string;
  primary_image?: { url: string; caption: string; credit: string };
  secondary_image?: { url: string; caption: string; credit: string };
  perspectives?: Array<{ text: string; sources?: Array<{ name: string; url: string }> }>;
  business_angle_points?: string[];
  business_angle_text?: string;
  scientific_significance?: string[];
  travel_advisory?: string[];
  performance_statistics?: string[];
  league_standings?: string;
  design_principles?: string;
  user_experience_impact?: string | string[];
  gameplay_mechanics?: string[];
  industry_impact?: string[];
  technical_details?: string[];
  technical_specifications?: string;
  timeline?: Array<{ date: string; content: string }>;
  international_reactions?: string[];
  suggested_qna?: Array<{ question: string; answer: string }>;
  user_action_items?: string[];
  did_you_know?: string;
  culinary_significance?: string;
  destination_highlights?: string;
  diy_tips?: string;
  economic_implications?: string;
  future_outlook?: string;
  geopolitical_context?: string;
  historical_background?: string;
  humanitarian_impact?: string;
  key_players?: string[];
  location?: string;
  sourceLanguage?: string;
}

// ============================================================================
// API Functions
// ============================================================================

// Fetch the latest news batch for a given language
export async function getLatestBatch(lang: string = "default"): Promise<BatchLatestResponse> {
  const url = `${API_BASE_URL}/api/batches/latest?lang=${encodeURIComponent(lang)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch latest batch: ${response.status}`);
  }
  return response.json() as Promise<BatchLatestResponse>;
}

// Fetch the categories available in a batch (used by the AI tools, which can't use the useCategories hook)
export async function getBatchCategories(
  batchId: string,
  lang: string,
): Promise<{ categories: CategoryItem[]; hasOnThisDay?: boolean }> {
  const url = `${API_BASE_URL}/api/batches/${encodeURIComponent(batchId)}/categories?lang=${encodeURIComponent(lang)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.status}`);
  }
  const json = (await response.json()) as {
    categories: { id: string; categoryId: string; categoryName: string }[];
    hasOnThisDay?: boolean;
  };
  return {
    categories: json.categories.map((cat) => ({ id: cat.id, categoryId: cat.categoryId, name: cat.categoryName })),
    hasOnThisDay: json.hasOnThisDay,
  };
}

// Fetch the batch(es) published on a given date (YYYY-MM-DD), for browsing a past day like the Time Travel command
export async function getBatchesByDate(dateString: string, lang: string): Promise<BatchItem[]> {
  const url = `${API_BASE_URL}/api/batches?from=${encodeURIComponent(dateString)}T00:00:00Z&to=${encodeURIComponent(
    dateString,
  )}T23:59:59Z&lang=${encodeURIComponent(lang)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch batches for ${dateString}: ${response.status}`);
  }
  const data = (await response.json()) as { batches: BatchItem[] };
  return data.batches || [];
}

// Fetch stories for a specific category within a batch (used by the AI tools)
export async function getCategoryStories(
  batchId: string,
  categoryId: string,
  lang: string,
  limit: number,
): Promise<StoryResponse[]> {
  const url = `${API_BASE_URL}/api/batches/${encodeURIComponent(batchId)}/categories/${encodeURIComponent(
    categoryId,
  )}/stories?lang=${encodeURIComponent(lang)}&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch stories: ${response.status}`);
  }
  const data = (await response.json()) as { stories?: StoryResponse[] };
  return data.stories || [];
}

export interface SearchResult {
  story: StoryResponse;
  categoryName: string;
  batchDate: string;
}

// Full-text search across all stories, newest first, with an optional upper date bound (same endpoint that
// powers the search on news.kagi.com). Unlike category browsing, this already spans every date, not just today.
// The API rejects a lower bound (`from`), so callers must filter that side themselves on `batchDate`.
export async function searchStories(
  query: string,
  lang: string,
  limit: number,
  to?: string,
): Promise<{ results: SearchResult[]; totalCount: number; hasMore: boolean }> {
  let url = `${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=${limit}&lang=${encodeURIComponent(lang)}`;
  if (to) url += `&to=${encodeURIComponent(to)}`;
  const response = await fetch(url);
  const data = (await response.json().catch(() => ({}))) as {
    results?: SearchResult[];
    totalCount?: number;
    hasMore?: boolean;
    message?: string;
  };
  // The API can answer with an error message instead of results, sometimes even with a 200 status
  if (!response.ok || !data.results) {
    throw new Error(data.message ?? `Search failed: ${response.status}`);
  }
  return { results: data.results, totalCount: data.totalCount ?? data.results.length, hasMore: data.hasMore ?? false };
}

// ============================================================================
// String & URL Utilities
// ============================================================================

// Format Date to YYYY-MM-DD for API requests
export function formatDateForAPI(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Remove HTML tags from string
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

// ============================================================================
// Reference System
// ============================================================================

// Helper: Convert number to superscript
function numberToSuperscript(num: number): string {
  const superscriptMap: { [key: string]: string } = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
  };

  return String(num)
    .split("")
    .map((digit) => superscriptMap[digit])
    .join("");
}

// Build reference map: [hostname#count] → { url, refNumber }
// Maintains API order (no sorting)
export function buildReferenceMap(sources: Source[]): Map<string, { url: string; refNumber: number }> {
  const refMap = new Map<string, { url: string; refNumber: number }>();
  const domainCounts = new Map<string, number>();

  sources.forEach((source, index) => {
    try {
      let hostname = new URL(source.url).hostname;
      // Remove www. prefix for consistent key matching with markdown references
      hostname = hostname.replace(/^www\./, "");

      const count = (domainCounts.get(hostname) || 0) + 1;
      domainCounts.set(hostname, count);

      const key = `${hostname}#${count}`;
      refMap.set(key, {
        url: source.url,
        refNumber: index + 1,
      });
    } catch {
      // Skip invalid URLs
    }
  });

  return refMap;
}

// Linkify markdown: [hostname#count] → [superscript](url)
export function linkifyMarkdown(
  text: string | undefined,
  refMap: Map<string, { url: string; refNumber: number }>,
): string {
  if (!text || refMap.size === 0) return text || "";

  return text.replace(/\[([^\]#]+)#(\d+)\]/g, (match, hostname, count) => {
    const key = `${hostname}#${count}`;
    let ref = refMap.get(key);

    // If exact match not found, try flexible matching (I encountered issues with some references, so this makes it work..)
    if (!ref) {
      for (const [mapKey, mapValue] of refMap.entries()) {
        const mapDomain = mapKey.split("#")[0];
        if (mapDomain.includes(hostname) || hostname.includes(mapDomain.split(".").slice(-2).join("."))) {
          ref = mapValue;
          break;
        }
      }
    }

    if (ref) {
      const superscript = numberToSuperscript(ref.refNumber);
      return `[${superscript}](${ref.url}) `; // Add spacing between reference numbers
    }

    return match;
  });
}

// ============================================================================
// Data Transformation
// ============================================================================

// Convert API story responses to Article model with deduped sources
export function storiesToArticles(stories: StoryResponse[]): Article[] {
  return stories.map((story) => {
    const sources: Source[] =
      story.articles?.map((article) => ({
        name: article.title.length > 100 ? article.title.substring(0, 100) + "..." : article.title,
        url: article.link,
      })) || [];

    const uniqueSources = sources.filter(
      (source, index, self) => index === self.findIndex((s) => s.url === source.url),
    );

    return {
      id: story.id || `story-${story.cluster_number || 0}`,
      title: story.title,
      summary: story.short_summary,
      sources: uniqueSources,
      uniqueDomains: story.unique_domains,
      numberOfTitles: story.number_of_titles,
      businessAnglePoints: story.business_angle_points || [],
      businessAngleText: story.business_angle_text,
      category: story.category || "",
      culinarySignificance: story.culinary_significance,
      designPrinciples: story.design_principles,
      destinationHighlights: story.destination_highlights,
      didYouKnow: story.did_you_know,
      diyTips: story.diy_tips,
      economicImplications: story.economic_implications,
      emoji: story.emoji,
      futureOutlook: story.future_outlook,
      gameplayMechanics: story.gameplay_mechanics || [],
      geopoliticalContext: story.geopolitical_context,
      highlights: story.talking_points || [],
      historicalBackground: story.historical_background,
      humanitarianImpact: story.humanitarian_impact,
      industryImpact: story.industry_impact || [],
      internationalReactions: story.international_reactions || [],
      keyPlayers: story.key_players || [],
      leagueStandings: story.league_standings,
      location: story.location,
      performanceStatistics: story.performance_statistics || [],
      perspectives: story.perspectives,
      primary_image: story.primary_image,
      quote: story.quote,
      quoteAttribution: story.quote_attribution,
      quoteAuthor: story.quote_author,
      quoteSourceUrl: story.quote_source_url,
      scientificSignificance: story.scientific_significance || [],
      secondary_image: story.secondary_image,
      suggestedQna: story.suggested_qna || [],
      technicalDetails: story.technical_details || [],
      technicalSpecifications: story.technical_specifications,
      timeline: story.timeline,
      travelAdvisory: story.travel_advisory || [],
      userActionItems: story.user_action_items || [],
      userExperienceImpact: typeof story.user_experience_impact === "string" ? story.user_experience_impact : undefined,
    };
  });
}

// ============================================================================
// AI Tools
// ============================================================================

export interface AIStorySummary {
  title: string;
  category: string;
  summary: string;
  sources: Source[];
}

// Strip [hostname#count] reference markers; AI tools list sources separately instead of linkifying them inline
function stripReferenceMarkers(text: string): string {
  return text.replace(/\[([^\]#]+)#(\d+)\]\s*/g, "").trim();
}

// Compact story representation for AI tools, keeping their context usage small
export function toAIStorySummary(article: Article, maxSummaryLength: number = 500): AIStorySummary {
  const summary = stripReferenceMarkers(article.summary);
  return {
    title: article.title,
    category: article.category,
    summary: summary.length > maxSummaryLength ? `${summary.slice(0, maxSummaryLength)}…` : summary,
    sources: (article.sources || []).slice(0, 3),
  };
}
