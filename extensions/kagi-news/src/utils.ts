import { Article, Cluster, Source } from "./interfaces";

export const CATEGORIES_URL = "https://kite.kagi.com/kite.json";
export const NEWS_BASE_URL = "https://news.kagi.com";

export function getDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace("www.", "");
  } catch {
    return url;
  }
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

export function clustersToArticles(clusters: Cluster[]): Article[] {
  return clusters.map((cluster) => {
    const sources: Source[] =
      cluster.articles?.map((article) => ({
        name: article.title.length > 50 ? article.title.substring(0, 50) + "..." : article.title,
        url: article.link,
      })) || [];

    const uniqueSources = sources.filter(
      (source, index, self) => index === self.findIndex((s) => s.url === source.url),
    );

    return {
      id: `cluster-${cluster.cluster_number}`,
      title: cluster.title,
      summary: cluster.short_summary,
      sources: uniqueSources,
      emoji: cluster.emoji,
      category: cluster.category,
      primary_image: cluster.primary_image,
      highlights: cluster.talking_points || [],
      secondary_image: cluster.secondary_image,
      perspectives: cluster.perspectives,
      historical_background: cluster.historical_background,
      technical_details: cluster.technical_details,
      industry_impact: cluster.industry_impact,
      timeline: cluster.timeline,
      international_reactions: cluster.international_reactions,
      didYouKnow: cluster.did_you_know,
    };
  });
}
