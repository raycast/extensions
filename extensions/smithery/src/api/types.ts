export type Pagination = {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: Pagination;
  hasMore: boolean;
};

export type ServerConnection = {
  type?: string;
  configSchema?: {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
};

export type SmitheryServer = {
  id?: string;
  qualifiedName: string;
  namespace?: string;
  slug?: string;
  displayName: string;
  description?: string;
  iconUrl?: string;
  verified: boolean;
  useCount?: number;
  remote?: boolean;
  isDeployed?: boolean;
  createdAt?: string;
  homepage?: string;
  owner?: string;
  score?: number;
};

export type SmitheryServerDetail = SmitheryServer & {
  deploymentUrl?: string;
  connections: ServerConnection[];
  security?: {
    scanPassed?: boolean;
  };
  tools: Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
  }>;
  resources: Array<Record<string, unknown>>;
  prompts: Array<Record<string, unknown>>;
  eventTopics: Array<Record<string, unknown>>;
};

export type SmitherySkill = {
  id?: string;
  namespace: string;
  slug: string;
  displayName: string;
  description?: string;
  categories: string[];
  qualityScore?: number;
  totalActivations?: number;
  externalStars?: number;
  reviewCount?: number;
  upvotes?: number;
  downvotes?: number;
  verified: boolean;
  listed?: boolean;
  createdAt?: string;
  gitUrl?: string;
  servers: string[];
};

export type SmitherySkillDetail = SmitherySkill & {
  prompt?: string;
  externalForks?: number;
  uniqueUsers?: number;
  owner?: string;
};

export type SearchInput = {
  q: string;
  page: number;
  pageSize: number;
  signal?: AbortSignal;
};
