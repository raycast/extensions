import { getPreferenceValues } from "@raycast/api";
import {
  Article,
  ArticleState,
  Board,
  Changelog,
  ChangelogState,
  Comment,
  CreateArticleRequest,
  CreateChangelogRequest,
  CreateCommentRequest,
  CreatePostRequest,
  ErrorResult,
  PaginatedResult,
  Post,
  User,
} from "./types";

const { organization_subdomain, api_key } = getPreferenceValues<Preferences>();
const API_URL = "https://do.featurebase.app/v2";
const API_HEADERS = {
  "X-API-Key": api_key,
  "Content-Type": "application/json",
};
const FEATUREBASE_LIMIT = 20;

export const buildFeaturebaseUrl = (route: string) => `https://${organization_subdomain}.featurebase.app/${route}`;

const makeRequest = async <T>(endpoint: string, options?: { method: string; body?: Record<string, string> }) => {
  const response = await fetch(`${API_URL}/${endpoint}`, {
    method: options?.method || "GET",
    headers: API_HEADERS,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok) {
    const err = result as ErrorResult;
    throw new Error("error" in err ? err.error : err.message);
  }
  return result as T;
};

export const featurebase = {
  boards: {
    list: () => makeRequest<{ results: Board[] }>("boards"),
  },
  comment: {
    create: (props: CreateCommentRequest) =>
      makeRequest<{ comment: Comment }>("comment", { method: "POST", body: props }),
    delete: (props: { id: string }) => makeRequest<{ success: true }>("comment", { method: "DELETE", body: props }),
    list: (props: { submissionId: string; page: number }) =>
      makeRequest<PaginatedResult<Comment>>(
        `comment?submissionId=${props.submissionId}&page=${props.page}&limit=${FEATUREBASE_LIMIT}`,
      ),
  },
  changelog: {
    create: (props: CreateChangelogRequest) =>
      makeRequest<{ changelog: Changelog }>("changelog", { method: "POST", body: props }),
    delete: (props: { id: string }) => makeRequest<{ success: true }>("changelog", { method: "DELETE", body: props }),
    list: (props: { page: number; state: ChangelogState }) =>
      makeRequest<PaginatedResult<Changelog>>(
        `changelog?state=${props.state}&page=${props.page}&limit=${FEATUREBASE_LIMIT}`,
      ),
  },
  helpCenter: {
    articles: {
      create: (props: CreateArticleRequest) =>
        makeRequest<Article>(`help_center/articles`, { method: "POST", body: props }),
      delete: (props: { id: string }) =>
        makeRequest<{ success: true }>(`help_center/articles/${props.id}`, { method: "DELETE" }),
      list: (props: { page: number; state: ArticleState }) =>
        makeRequest<PaginatedResult<Article>>(
          `help_center/articles?state=${props.state}&page=${props.page}&limit=${FEATUREBASE_LIMIT}`,
        ),
    },
  },
  organization: {
    identifyUser: {
      query: (props: { page: number; q?: string }) =>
        makeRequest<PaginatedResult<User>>(
          `organization/identifyUser/query?page=${props.page}&limit=${FEATUREBASE_LIMIT}${props.q ? `&q=${props.q}` : ""}`,
        ),
    },
  },
  posts: {
    create: (props: CreatePostRequest) => makeRequest<{ submission: Post }>("posts", { method: "POST", body: props }),
    delete: (props: { id: string }) => makeRequest<{ success: true }>("posts", { method: "DELETE", body: props }),
    list: (props: { page: number }) =>
      makeRequest<PaginatedResult<Post>>(`posts?page=${props.page}&limit=${FEATUREBASE_LIMIT}`),
  },
};
