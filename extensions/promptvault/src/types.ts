/**
 * Raycast extension preferences
 */
export type Preferences = {
  apiUrl: string;
  apiKey: string;
};

/**
 * Category from API
 */
export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
};

/**
 * Tag from API
 */
export type Tag = {
  name: string;
  slug: string;
};

/**
 * Tag with full details (from /tags endpoint)
 */
export type TagWithDetails = {
  id: string;
  name: string;
  slug: string;
  usageCount: number;
};

/**
 * Prompt version
 */
export type PromptVersion = {
  id: string;
  number: number;
  content: string;
  commitMessage: string | null;
  createdAt: string;
};

/**
 * Prompt from list endpoint (minimal)
 */
export type PromptListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: "private" | "academy" | "public";
  isArchived: boolean;
  category: Category | null;
  tags: Tag[];
  latestVersion: number | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Full prompt from detail endpoint
 */
export type PromptDetail = PromptListItem & {
  author: string;
  version: PromptVersion | null;
  versions: Array<{
    id: string;
    number: number;
    commitMessage: string | null;
    createdAt: string;
  }>;
};

/**
 * API response wrapper
 */
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

/**
 * Fill prompt response
 */
export type FillResponse = {
  promptId: string;
  versionNumber: number;
  originalContent: string;
  filledContent: string;
  variables: {
    required: string[];
    filled: Record<string, string>;
    missing: string[];
  };
};

/**
 * Create prompt input
 */
export type CreatePromptInput = {
  name: string;
  content: string;
  description?: string;
  sourceUrl?: string;
  categoryId: string;
  visibility?: "private" | "academy" | "public";
  tags?: string[];
};
