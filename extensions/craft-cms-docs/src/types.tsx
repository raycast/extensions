export interface PluginEditionFeature {
  name: string;
  description: string;
}

export interface PluginEdition {
  id: number;
  name: string;
  handle: string;
  price: number | null;
  basePrice: number | null;
  renewalPrice: number | null;
  features: PluginEditionFeature[] | null;
}

export interface Plugin {
  id: number;
  handle: string;
  name: string;
  shortDescription: string | null;
  developerName: string;
  developerSlug: string;
  packageName: string;
  version: string;
  activeInstalls: number;
  abandoned: boolean;
  cloudTested: boolean;
  supportsGql: boolean;
  iconUrl: string | null;
  url: string;
  keywords: string[];
  categoryIds: number[];
  editions: PluginEdition[];
  lastUpdate: string;
  supportLink: string | null;
  totalReviews: number;
  ratingAvg: number | null;
}

export interface Category {
  id: number;
  title: string;
  description: string | null;
  slug: string;
  iconUrl: string;
}

export interface CoreData {
  categories: Category[];
}

export interface PluginStoreResponse {
  plugins: Plugin[];
  totalResults: string | number;
  currentPage: number;
  perPage: number;
  total: number;
  prevPage: string | null;
  nextPage: string | null;
}

export interface DocsLink {
  title: string;
  url: string;
}

export interface RelatedTerm {
  title: string;
  slug: string;
  url: string;
}

export interface GlossaryTerm {
  id: number;
  title: string;
  url: string;
  uri: string;
  slug: string;
  type: string;
  apiUrl: string;
  summaryPlain?: string;
  summaryHtml?: string;
  docsLinks?: DocsLink[];
}

export interface DocsSearchResult {
  id: string;
  title: string;
  url: string;
  slug?: string;
  summaryPlain?: string;
  summaryHtml?: string;
  section?: string;
  category?: string;
  type?: string;
  docsLinks?: DocsLink[];
  relatedTerms?: RelatedTerm[];
  craftVersion?: "1.x" | "2.x" | "3.x" | "4.x" | "5.x";
}
