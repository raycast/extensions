type AllResultType = "all";
type ResultType = "general" | "documentation" | "video" | "sample_code" | string;

type SearchResult = {
  title: string;
  url: string;
  description: string;
  date: string;
  event_name: string;
  session_id: string;
  tile_image: string;
  relevance: number;
  order: number;
  type: ResultType;
  platform: string[];
  is_beta: 0 | 1;
  language: string;
  lang_children: string[];
  breadcrumbs: string[];
  duration?: string;
};

type FeaturedResult = Pick<SearchResult, "title" | "description" | "url"> & {
  icon: string;
  score: number;
  type: "featured";
};
type ResultLike = SearchResult | FeaturedResult;

type SuggestedQuery = {
  query: string;
  score: number;
  correction: "applied" | "";
};

type PayloadResponse = {
  results: SearchResult[];
  featuredResult: FeaturedResult | "";
  suggested_query: SuggestedQuery | "";
  uuid: string;
};

type AppleSearchResponse = {
  results?: AppleSearchResult[];
};

type AppleSearchResult =
  | {
      documentation: {
        metadata: AppleDocumentationMetadata;
      };
    }
  | {
      devsite: {
        metadata: AppleDevsiteMetadata;
      };
    }
  | {
      developer: {
        metadata: AppleDeveloperMetadata;
      };
    };

type AppleDocumentationMetadata = {
  title?: string;
  description?: string;
  permalink?: string;
  hierarchy?: string;
  availability?: string;
  kind?: string;
};

type AppleDevsiteMetadata = {
  title?: string;
  description?: string;
  sourceURL?: string;
};

type AppleDeveloperMetadata = {
  titles?: string[];
  descriptions?: string[];
  permalinks?: string[];
  thumbnailLinks?: string[];
  projectNames?: string[];
  ids?: string[];
  itemTypes?: string[];
  availabilityDates?: string[];
  deliveryLanguageCodes?: string[];
  mediaDurations?: number[];
};

interface Visitable {
  onVisit: (result: ResultLike) => void;
}
