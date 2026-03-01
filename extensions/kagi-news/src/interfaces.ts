export interface Category {
  name: string;
  file: string;
}

export interface Source {
  name: string;
  url: string;
}

interface ClusterArticle {
  title: string;
  link: string;
}

export interface Cluster {
  cluster_number: number;
  title: string;
  short_summary: string;
  articles: ClusterArticle[];
  unique_domains?: number;
  number_of_titles?: number;
  business_angle_points?: string[];
  business_angle_text?: string;
  category: string;
  culinary_significance?: string;
  design_principles?: string;
  destination_highlights?: string;
  did_you_know?: string;
  diy_tips?: string;
  economic_implications?: string;
  emoji?: string;
  future_outlook?: string;
  gameplay_mechanics?: string[];
  geopolitical_context?: string;
  historical_background?: string;
  humanitarian_impact?: string;
  industry_impact?: string[];
  international_reactions?: string[];
  key_players?: string[];
  league_standings?: string;
  location?: string;
  performance_statistics?: string[];
  perspectives?: Array<{ text: string; sources: Source[] }>;
  primary_image?: { url: string; caption: string; credit: string };
  quote?: string;
  quote_attribution?: string;
  quote_author?: string;
  quote_source_url?: string;
  scientific_significance?: string[];
  secondary_image?: { url: string; caption: string; credit: string };
  suggested_qna?: Array<{ question: string; answer: string }>;
  talking_points?: string[];
  technical_details?: string[];
  technical_specifications?: string;
  timeline?: Array<{ date: string; content: string }>;
  travel_advisory?: string[];
  user_action_items?: string[];
  user_experience_impact?: string;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  sources: Source[];
  uniqueDomains?: number;
  numberOfTitles?: number;
  businessAnglePoints?: string[];
  businessAngleText?: string;
  category: string;
  culinarSignificance?: string;
  designPrinciples?: string;
  destinationHighlights?: string;
  didYouKnow?: string;
  diyTips?: string;
  economicImplications?: string;
  emoji?: string;
  futureOutlook?: string;
  gameplayMechanics?: string[];
  geopoliticalContext?: string;
  highlights?: string[];
  historicalBackground?: string;
  humanitarianImpact?: string;
  industryImpact?: string[];
  internationalReactions?: string[];
  keyPlayers?: string[];
  leagueStandings?: string;
  location?: string;
  performanceStatistics?: string[];
  perspectives?: Array<{ text: string; sources: Source[] }>;
  primary_image?: { url: string; caption: string; credit: string };
  quote?: string;
  quoteAttribution?: string;
  quoteAuthor?: string;
  quoteSourceUrl?: string;
  scientificSignificance?: string[];
  secondary_image?: { url: string; caption: string; credit: string };
  suggestedQna?: Array<{ question: string; answer: string }>;
  technicalDetails?: string[];
  technicalSpecifications?: string;
  timeline?: Array<{ date: string; content: string }>;
  travelAdvisory?: string[];
  userActionItems?: string[];
  userExperienceImpact?: string;
}

export interface CategoryResponse {
  category: string;
  timestamp: number;
  clusters: Cluster[];
}

export interface HistoricalEvent {
  year: string;
  content: string;
  type: string;
  sort_year: number;
}

export interface OnThisDayResponse {
  timestamp: number;
  events: HistoricalEvent[];
}

export interface KiteResponse {
  categories: Category[];
  timestamp?: number;
}
