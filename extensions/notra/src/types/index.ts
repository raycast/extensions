export type ContentTypeValue = "changelog" | "linkedin_post" | "twitter_post" | "blog_post";

export type ContentTypeFilter = ContentTypeValue | "all";

export type PostStatus = "draft" | "published";

export type ToneProfile = "Conversational" | "Professional" | "Casual" | "Formal";

export type GenerationJobStatus = "queued" | "running" | "completed" | "failed";

export interface Post {
  content: string;
  contentType: string;
  createdAt: string;
  id: string;
  markdown: string;
  recommendations: string | null;
  slug: string | null;
  sourceMetadata?: unknown;
  status: PostStatus;
  title: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  logo: string | null;
  name: string;
  slug: string;
}

export interface PostDetails {
  organization: Organization;
  post: Post | null;
}

export interface Pagination {
  currentPage: number;
  limit: number;
  nextPage: number | null;
  previousPage: number | null;
  totalItems: number;
  totalPages: number;
}

export interface BrandIdentity {
  audience: string | null;
  companyDescription: string | null;
  companyName: string | null;
  createdAt: string;
  customInstructions: string | null;
  customTone: string | null;
  id: string;
  isDefault: boolean;
  language: string | null;
  name: string;
  toneProfile: ToneProfile | null;
  updatedAt: string;
  websiteUrl: string;
}

export interface GitHubIntegration {
  defaultBranch: string | null;
  displayName: string;
  id: string;
  owner: string | null;
  repo: string | null;
}

export interface LinearIntegration {
  displayName: string;
  id: string;
  linearOrganizationId: string;
  linearOrganizationName: string | null;
  linearTeamId: string | null;
  linearTeamName: string | null;
}

export interface GenerationJob {
  completedAt: string | null;
  contentType: string;
  createdAt: string;
  error: string | null;
  id: string;
  lookbackWindow: string;
  organizationId: string;
  postId: string | null;
  status: GenerationJobStatus;
  updatedAt: string;
}

export interface GenerationEvent {
  createdAt: string;
  id: string;
  jobId: string;
  message: string;
  metadata?: unknown;
  type: string;
}

export interface BrandIdentityGenerationJob {
  brandIdentityId: string | null;
  completedAt: string | null;
  createdAt: string;
  error: string | null;
  id: string;
  status: GenerationJobStatus;
  updatedAt: string;
}

export type ApiPost = Omit<Post, "status"> & {
  status: string;
};

export interface ListPostsResponse {
  organization: Organization;
  pagination: Pagination;
  posts: ApiPost[];
}

export interface GetPostResponse {
  organization: Organization;
  post: ApiPost | null;
}

export interface ListBrandIdentitiesResponse {
  brandIdentities: BrandIdentity[];
  organization: Organization;
}

export interface GetBrandIdentityResponse {
  brandIdentity: BrandIdentity | null;
  organization: Organization;
}

export interface ListIntegrationsResponse {
  github: GitHubIntegration[];
  linear: LinearIntegration[];
  organization: Organization;
  slack: unknown[];
}
