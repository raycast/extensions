import { Cache, getPreferenceValues } from "@raycast/api";
import type {
  BrandIdentity,
  BrandIdentityGenerationJob,
  GenerationEvent,
  GenerationJob,
  GitHubIntegration,
  LinearIntegration,
  Organization,
  Pagination,
  Post,
  PostDetails,
} from "../types";

const NOTRA_API_URL = "https://api.usenotra.com";
const cache = new Cache({ namespace: "notra" });

type ApiPost = Omit<Post, "status"> & {
  status: string;
};

type ApiOrganization = Organization;

export interface ListPostsResponse {
  organization: ApiOrganization;
  pagination: Pagination;
  posts: ApiPost[];
}

export interface GetPostResponse {
  organization: ApiOrganization;
  post: ApiPost | null;
}

interface UpdatePostRequest {
  markdown: string;
  slug?: string | null;
  status: Post["status"];
  title: string;
}

interface DeletePostResponse {
  id: string;
  organization: ApiOrganization;
}

interface GeneratePostRequest {
  brandIdentityId: string;
  contentType: string;
  dataPoints?: {
    includePullRequests?: boolean;
    includeCommits?: boolean;
    includeReleases?: boolean;
    includeLinearData?: boolean;
  };
  integrations?: {
    github?: string[];
    linear?: string[];
  };
  lookbackWindow?: string;
}

interface GeneratePostResponse {
  job: GenerationJob;
  organization: ApiOrganization;
}

interface PostGenerationStatusResponse {
  events: GenerationEvent[];
  job: GenerationJob;
}

export interface ListBrandIdentitiesResponse {
  brandIdentities: BrandIdentity[];
  organization: ApiOrganization;
}

export interface GetBrandIdentityResponse {
  brandIdentity: BrandIdentity | null;
  organization: ApiOrganization;
}

interface UpdateBrandIdentityRequest {
  audience?: string | null;
  companyDescription?: string | null;
  companyName?: string | null;
  customInstructions?: string | null;
  customTone?: string | null;
  isDefault?: boolean;
  language?: string | null;
  name?: string;
  toneProfile?: string | null;
  websiteUrl?: string;
}

interface DeleteBrandIdentityResponse {
  id: string;
  organization: ApiOrganization;
}

interface GenerateBrandIdentityRequest {
  name?: string;
  websiteUrl: string;
}

interface GenerateBrandIdentityResponse {
  job: BrandIdentityGenerationJob;
  organization: ApiOrganization;
}

interface BrandIdentityGenerationStatusResponse {
  job: BrandIdentityGenerationJob;
  organization: ApiOrganization;
}

export interface ListIntegrationsResponse {
  github: GitHubIntegration[];
  linear: LinearIntegration[];
  organization: ApiOrganization;
  slack: unknown[];
}

interface CreateGitHubIntegrationRequest {
  branch?: string;
  owner: string;
  repo: string;
  token?: string;
}

interface CreateGitHubIntegrationResponse {
  github: GitHubIntegration;
  organization: ApiOrganization;
}

interface NotraRequestInit extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
}

export { NOTRA_API_URL };

export function getNotraRequestInit(init?: NotraRequestInit): RequestInit {
  const { apiKey } = getPreferenceValues<{ apiKey: string }>();

  return {
    ...init,
    headers: {
      ...init?.headers,
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  };
}

export function mapPost(post: ApiPost): Post {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    markdown: post.markdown,
    recommendations: post.recommendations,
    contentType: post.contentType,
    sourceMetadata: post.sourceMetadata,
    status: post.status === "published" ? "published" : "draft",
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

export function mapPostDetails(response: GetPostResponse): PostDetails {
  return {
    organization: response.organization,
    post: response.post ? mapPost(response.post) : null,
  };
}

export function getPostCacheKey(postId: string): string {
  return `post:${postId}`;
}

export function getPostsCacheKey(contentType: string): string {
  return `posts:v2:${contentType}`;
}

export function getCachedValue<T>(key: string): T | undefined {
  const value = cache.get(key);
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    cache.remove(key);
    return undefined;
  }
}

export function setCachedValue<T>(key: string, value: T): void {
  cache.set(key, JSON.stringify(value));
}

function removeCachedValue(key: string): boolean {
  return cache.remove(key);
}

function clearNotraCache(): void {
  cache.clear();
}

async function notraRequest<T>(path: string, init?: NotraRequestInit): Promise<T> {
  const response = await fetch(`${NOTRA_API_URL}${path}`, getNotraRequestInit(init));

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    const body = await response.json().catch(() => null);
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
      message = body.error;
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function updatePost(postId: string, input: UpdatePostRequest): Promise<PostDetails> {
  const response = await notraRequest<GetPostResponse>(`/v1/posts/${postId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const details = mapPostDetails(response);
  clearNotraCache();
  setCachedValue(getPostCacheKey(postId), details);
  return details;
}

export async function deletePost(postId: string): Promise<DeletePostResponse> {
  const response = await notraRequest<DeletePostResponse>(`/v1/posts/${postId}`, {
    method: "DELETE",
  });

  clearNotraCache();
  removeCachedValue(getPostCacheKey(postId));
  return response;
}

export function generatePost(input: GeneratePostRequest): Promise<GeneratePostResponse> {
  return notraRequest<GeneratePostResponse>("/v1/posts/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function getPostGenerationStatus(jobId: string): Promise<PostGenerationStatusResponse> {
  return notraRequest<PostGenerationStatusResponse>(`/v1/posts/generate/${jobId}`);
}

export async function updateBrandIdentity(
  id: string,
  input: UpdateBrandIdentityRequest,
): Promise<GetBrandIdentityResponse> {
  const response = await notraRequest<GetBrandIdentityResponse>(`/v1/brand-identities/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  clearNotraCache();
  return response;
}

export async function deleteBrandIdentity(id: string): Promise<DeleteBrandIdentityResponse> {
  const response = await notraRequest<DeleteBrandIdentityResponse>(`/v1/brand-identities/${id}`, {
    method: "DELETE",
  });
  clearNotraCache();
  return response;
}

export function generateBrandIdentity(input: GenerateBrandIdentityRequest): Promise<GenerateBrandIdentityResponse> {
  return notraRequest<GenerateBrandIdentityResponse>("/v1/brand-identities/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function getBrandIdentityGenerationStatus(jobId: string): Promise<BrandIdentityGenerationStatusResponse> {
  return notraRequest<BrandIdentityGenerationStatusResponse>(`/v1/brand-identities/generate/${jobId}`);
}

export async function createGitHubIntegration(
  input: CreateGitHubIntegrationRequest,
): Promise<CreateGitHubIntegrationResponse> {
  const response = await notraRequest<CreateGitHubIntegrationResponse>("/v1/integrations/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  clearNotraCache();
  return response;
}
