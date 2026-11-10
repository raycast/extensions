export type VenueType = "conference" | "journal";

export interface Venue {
  readonly id: string;
  readonly name: string;
  readonly acronym: string;
  readonly type: VenueType;
  readonly aliases: readonly string[];
  readonly dblp?: string;
}

export interface RankingSource {
  readonly id: string;
  readonly name: string;
  readonly edition: string;
  readonly kind: "grade" | "inclusion";
  readonly labels: readonly string[];
  readonly appliesTo: readonly VenueType[];
  readonly coverage: "complete" | "partial";
  readonly publisherUrl: string;
  readonly dataUrl: string;
  readonly retrievedAt: string;
  readonly revision?: string;
  readonly note: string;
}

export interface Assessment {
  readonly venueId: string;
  readonly sourceId: string;
  readonly value: string;
  readonly url: string;
  readonly area?: string;
  readonly note?: string;
}

export interface VenueDataset {
  readonly schemaVersion: 1;
  readonly version: string;
  readonly venues: readonly Venue[];
  readonly sources: readonly RankingSource[];
  readonly assessments: readonly Assessment[];
}

export type AssessmentStatus =
  "assessed" | "not-listed" | "unknown" | "not-applicable";

export interface AssessmentResult {
  readonly source: RankingSource;
  readonly status: AssessmentStatus;
  readonly assessments: readonly Assessment[];
}

export interface SearchOptions {
  readonly limit?: number;
  readonly type?: VenueType;
  readonly sourceId?: string;
  readonly value?: string;
}

export interface SearchResult {
  readonly venue: Venue;
  readonly match: "exact" | "prefix" | "fuzzy" | "browse";
  readonly score: number;
}

export interface VenueCatalog {
  readonly dataset: VenueDataset;
  search(query: string, options?: SearchOptions): SearchResult[];
  getVenue(id: string): Venue | undefined;
  getAssessments(id: string): AssessmentResult[];
}
