// TypeScript interfaces and type definitions for the app

export interface Category {
  name: string;
  id: string;
  // Stable slug (e.g. "world", "technology") that persists across batches, unlike `id`
  // which is a per-batch UUID. Favorites must be keyed on this, not on `id`.
  categoryId: string;
}

export interface Source {
  name: string;
  url: string;
}

// Same shape as Category; kept as a separate name for readability where it's used for a batch's categories
export type CategoryItem = Category;

export interface BatchItem {
  id: string;
  createdAt: string;
  totalCategories: number;
  totalClusters: number;
  totalArticles: number;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  sources?: Source[];
  uniqueDomains?: number;
  numberOfTitles?: number;
  businessAnglePoints?: string[];
  businessAngleText?: string;
  category: string;
  culinarySignificance?: string;
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
  perspectives?: Array<{ text: string; sources?: Source[] }>;
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

export interface HistoricalEvent {
  year: string;
  content: string;
  type: string;
  sort_year: number;
}
