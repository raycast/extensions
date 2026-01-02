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
      uniqueDomains: cluster.unique_domains,
      numberOfTitles: cluster.number_of_titles,
      businessAnglePoints: cluster.business_angle_points || [],
      businessAngleText: cluster.business_angle_text,
      category: cluster.category,
      culinarSignificance: cluster.culinary_significance,
      designPrinciples: cluster.design_principles,
      destinationHighlights: cluster.destination_highlights,
      didYouKnow: cluster.did_you_know,
      diyTips: cluster.diy_tips,
      economicImplications: cluster.economic_implications,
      emoji: cluster.emoji,
      futureOutlook: cluster.future_outlook,
      gameplayMechanics: cluster.gameplay_mechanics || [],
      geopoliticalContext: cluster.geopolitical_context,
      highlights: cluster.talking_points || [],
      historicalBackground: cluster.historical_background,
      humanitarianImpact: cluster.humanitarian_impact,
      industryImpact: cluster.industry_impact || [],
      internationalReactions: cluster.international_reactions || [],
      keyPlayers: cluster.key_players || [],
      leagueStandings: cluster.league_standings,
      location: cluster.location,
      performanceStatistics: cluster.performance_statistics || [],
      perspectives: cluster.perspectives,
      primary_image: cluster.primary_image,
      quote: cluster.quote,
      quoteAttribution: cluster.quote_attribution,
      quoteAuthor: cluster.quote_author,
      quoteSourceUrl: cluster.quote_source_url,
      scientificSignificance: cluster.scientific_significance || [],
      secondary_image: cluster.secondary_image,
      suggestedQna: cluster.suggested_qna || [],
      technicalDetails: cluster.technical_details || [],
      technicalSpecifications: cluster.technical_specifications,
      timeline: cluster.timeline,
      travelAdvisory: cluster.travel_advisory || [],
      userActionItems: cluster.user_action_items || [],
      userExperienceImpact: cluster.user_experience_impact,
    };
  });
}
