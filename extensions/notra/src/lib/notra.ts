import { getPreferenceValues } from "@raycast/api";
import type {
  ApiPost,
  BrandIdentityGenerationJob,
  GenerationEvent,
  GenerationJob,
  GetBrandIdentityResponse,
  GetPostResponse,
  GitHubIntegration,
  Organization,
  Post,
  PostDetails,
} from "../types";
import { clearNotraCache, getPostCacheKey, setCachedValue } from "../utils";

const NOTRA_API_URL = "https://api.usenotra.com";

interface UpdatePostRequest {
  markdown: string;
  slug?: string | null;
  status: Post["status"];
  title: string;
}

interface DeletePostResponse {
  id: string;
  organization: Organization;
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
  organization: Organization;
}

interface PostGenerationStatusResponse {
  events: GenerationEvent[];
  job: GenerationJob;
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
  organization: Organization;
}

interface GenerateBrandIdentityRequest {
  name?: string;
  websiteUrl: string;
}

interface GenerateBrandIdentityResponse {
  job: BrandIdentityGenerationJob;
  organization: Organization;
}

interface BrandIdentityGenerationStatusResponse {
  job: BrandIdentityGenerationJob;
  organization: Organization;
}

interface CreateGitHubIntegrationRequest {
  branch?: string;
  owner: string;
  repo: string;
  token?: string;
}

interface CreateGitHubIntegrationResponse {
  github: GitHubIntegration;
  organization: Organization;
}

interface NotraRequestInit extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
}

export { NOTRA_API_URL };

export function getNotraRequestInit(init?: NotraRequestInit): RequestInit {
  const { apiKey } = getPreferenceValues<Preferences>();

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
