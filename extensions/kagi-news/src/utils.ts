import { Article, Source } from "./interfaces";

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

interface StoryResponse {
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
  return response.json();
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

// Extract clean domain name from URL (removes www prefix)
export function getDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace("www.", "");
  } catch {
    return url;
  }
}

// Remove HTML tags from string
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

// Transforms [domain#N] labels to link the real article sources
export function linkify(text: string | undefined, sources: Source[]): string {
  if (!text || !sources || sources.length === 0) return text || "";

  const linkedText = text;

  const sourceMap: { [key: string]: string } = {};
  const domainCounts: { [key: string]: number } = {};

  sources.forEach((source) => {
    const domain = getDomain(source.url);
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    const label = `${domain}#${domainCounts[domain]}`;
    sourceMap[label] = source.url;
  });

  return linkedText.replace(/\[([^\]]+#\d+)\]/g, (match, label) => {
    const url = sourceMap[label];
    if (url) {
      return `[[${label}]](${url}) `;
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
      (source, index, self) => index === self.findIndex((s) => s.url === source.url)
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
      userExperienceImpact:
        typeof story.user_experience_impact === "string" ? story.user_experience_impact : undefined,
    };
  });
}
