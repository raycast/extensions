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
  type?: string;
  docsLinks?: DocsLink[];
  relatedTerms?: RelatedTerm[];
  craftVersion?: "1.x" | "2.x" | "3.x" | "4.x" | "5.x";
}
