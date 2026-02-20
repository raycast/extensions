/**
 * JSON:API resource identifier
 */
export interface ResourceIdentifier {
  id: string;
  type: string;
}

/**
 * JSON:API relationship
 */
export interface Relationship {
  data: ResourceIdentifier | ResourceIdentifier[] | null;
}

/**
 * JSON:API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  included?: unknown[];
  meta?: {
    total?: number;
    page?: number;
    perPage?: number;
  };
}

/**
 * JSON:API error object
 */
export interface ApiError {
  status: string;
  title: string;
  detail?: string;
  source?: {
    pointer?: string;
    parameter?: string;
  };
}

/**
 * JSON:API error response
 */
export interface ApiErrorResponse {
  errors: ApiError[];
}

/**
 * FAVORO link resource
 */
export interface FavoroLink {
  id: string;
  type: "link";
  attributes: {
    label: string;
    url: string;
    description: string | null;
    favicon: string | null;
    created_at: string;
    updated_at: string;
  };
  relationships?: {
    section?: Relationship;
    area?: Relationship;
  };
}

/**
 * FAVORO area resource
 */
export interface FavoroArea {
  id: string;
  type: "area";
  attributes: {
    name: string;
    description: string | null;
    color: string | null;
    icon: string | null;
    created_at: string;
    updated_at: string;
  };
  relationships?: {
    sections?: Relationship;
    user?: Relationship;
  };
}

/**
 * FAVORO section resource
 */
export interface FavoroSection {
  id: string;
  type: "section";
  attributes: {
    title: string;
    description: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
  };
  relationships?: {
    area?: Relationship;
    links?: Relationship;
  };
}

/**
 * FAVORO user resource
 */
export interface FavoroUser {
  id: string;
  type: "user";
  attributes: {
    name: string;
    email: string;
    avatar: string | null;
    created_at: string;
  };
}

/**
 * Search result link with expanded area/section info
 */
export interface SearchResultLink extends FavoroLink {
  area?: {
    id: string;
    name: string;
  };
  section?: {
    id: string;
    name: string;
  };
}

/**
 * Grouped search results by area and section
 */
export interface GroupedSearchResults {
  [areaId: string]: {
    area: { id: string; name: string };
    sections: {
      [sectionId: string]: {
        section: { id: string; name: string };
        links: SearchResultLink[];
      };
    };
  };
}

/**
 * Search API response includes related areas and sections
 */
export interface SearchResponse {
  data: FavoroLink[];
  included?: (FavoroArea | FavoroSection)[];
}
