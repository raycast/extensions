export interface ItemDefinition {
  id?: string;
  definition?: string;
  translation?: string;
  comment?: string;
  examples?: string[];
}

export interface LearningItem {
  id: string;
  text: string;
  comment?: string;
  imageUrl?: string;
  speechUrl?: string;
  definitions?: ItemDefinition[];
  groupIds?: string[];
}

export interface UnsavedLearningItem {
  text: string;
  comment?: string;
  imageUrl?: string;
  definitions?: ItemDefinition[];
  groupIds?: string[];
}

export interface LearningItemList {
  learningItems: LearningItem[];
  hasNext: boolean;
}

export enum LearningItemsOrderBy {
  LAST_MODIFIED = "lastModified",
  NEXT_REVISION = "nextRevision",
}

export enum SortOrder {
  ASC = "ASC",
  DESC = "DESC",
}

export enum SearchFlag {
  ALL = "ALL",
  NO_DEFINITIONS = "NO_DEFINITIONS",
}

export enum MatchType {
  EXACT_TEXT_IGNORING_CASE = "EXACT_TEXT_IGNORING_CASE",
  CONTAINS_IGNORING_CASE_ANYWHERE = "CONTAINS_IGNORING_CASE_ANYWHERE",
}

export interface SearchParams {
  languageCode: string;
  textQuery?: string;
  matchType?: MatchType;
  groupIds?: string[];
  searchFlags?: SearchFlag[];
  order?: {
    orderBy: LearningItemsOrderBy;
    direction: SortOrder;
  };
  pageParams?: {
    page?: number;
    pageSize?: number;
  };
}
