import { Cache } from "@raycast/api";
import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import { useEffect, useState } from "react";
import {
  ApiResponseError,
  SendTweetV2Params,
  TTweetv2Expansion,
  TTweetv2MediaField,
  TTweetv2TweetField,
  TTweetv2UserField,
  TweetV2,
  TwitterApi,
  TwitterV2IncludesHelper,
  UserV2,
} from "twitter-api-v2";
import { authorize, getOAuthTokens, resetOAuthTokens } from "./oauth";
import { orderByRequestedIds, Tweet, TweetNonPublicMetrics, TweetOrganicMetrics, User } from "./twitter";
import { getErrorMessage, sleep } from "../../utils";
import { normalizeSearchTerms, scoreSearchCandidate } from "./post_search";

const PAGE_SIZE = 20;
const HISTORY_PAGE_SIZE = 100;
const MAX_PERSONAL_HISTORY_PAGES = 32;
const DEFAULT_PERSONAL_SEARCH_LIMIT = 20;
const CONNECTION_PAGE_SIZE = 1000;
const MAX_CONNECTION_SEARCH_PAGES = 10;
const DEFAULT_CONNECTION_SEARCH_LIMIT = 20;
const READ_CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_RATE_LIMIT_BACKOFF_MS = 30 * 1000;
const ANALYTICS_WINDOW_DAYS = 30;
const MEDIA_CHUNK_SIZE = 4 * 1024 * 1024;
const readCache = new Cache({ namespace: "twitter-api-v2-reads" });

const defaultFields: TTweetv2TweetField[] = [
  "public_metrics",
  "author_id",
  "attachments",
  "created_at",
  "id",
  "entities",
  "conversation_id",
];

const defaultExpansions: TTweetv2Expansion[] = [
  "attachments.media_keys",
  "author_id",
  "in_reply_to_user_id",
  "entities.mentions.username",
  "referenced_tweets.id",
];

const defaultMediaFields: TTweetv2MediaField[] = ["url", "type", "media_key", "preview_image_url"];
const analyticsMediaFields: TTweetv2MediaField[] = [
  ...defaultMediaFields,
  "non_public_metrics",
  "organic_metrics",
  "public_metrics",
];
const defaultUserFields: TTweetv2UserField[] = [
  "created_at",
  "description",
  "location",
  "profile_banner_url",
  "profile_image_url",
  "protected",
  "public_metrics",
  "url",
  "verified",
];

interface CacheEntry<T> {
  cachedAt: number;
  value: T;
}

export interface PaginatedResult<T> {
  items: T[];
  nextToken?: string;
}

export type ReplySettings = "everyone" | "following" | "mentionedUsers";

export interface PostPoll {
  options: string[];
  durationMinutes: number;
}

export interface CreatePostInput {
  text?: string;
  mediaPaths?: string[];
  quotePostId?: string;
  poll?: PostPoll;
  replySettings?: ReplySettings;
  replyToPostId?: string;
}

export interface CreatedPost {
  id: string;
  text: string;
}

export interface BookmarkFolder {
  id: string;
  name: string;
}

export type PostEngagementKind = "likes" | "reposts" | "quotes";
type MediaCategory = "tweet_image" | "tweet_video" | "tweet_gif" | "dm_image" | "dm_video" | "dm_gif";
type UploadMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "video/mp4" | "video/quicktime";

interface MediaFileInfo {
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "video/mp4" | "video/quicktime" | "video/webm";
  kind: "image" | "gif" | "video";
  size: number;
}

interface BookmarkFolderPostPageResponse {
  data?: { id: string }[];
  meta?: { next_token?: string };
}

interface BookmarkFolderPageResponse {
  data?: BookmarkFolder[];
  meta?: { next_token?: string };
}

export interface PersonalPostSearchResult {
  items: Tweet[];
  pagesSearched: number;
  postsSearched: number;
  reachedEnd: boolean;
  /** X exposes at most the 3,200 most recent posts from a user timeline. */
  retrievalLimit: 3200;
}

export type ConnectionRelationship = "following" | "followers";

export interface FollowRelationshipResult {
  sourceUsername: string;
  targetUsername: string;
  sourceUserId?: string;
  targetUserId?: string;
  status: "following" | "not_following" | "unverified";
  reason: "match_found" | "complete_list" | "page_limit" | "lookup_failed" | "pagination_loop";
  pagesChecked: number;
  usersChecked: number;
  reachedEnd: boolean;
  maxPages: number;
  error?: string;
}

export interface ConnectionSearchResult {
  relationshipsSearched: ConnectionRelationship[];
  items: User[];
  pagesSearched: number;
  usersSearched: number;
  reachedEnd: boolean;
  /** Connection searches inspect at most ten pages of 1,000 users for each searched relationship. */
  retrievalLimitPerRelationship: 10000;
}

interface ConnectionSearchPage {
  items: User[];
  nextToken?: string;
}

interface ConnectionRelationshipSearchResult {
  items: User[];
  pagesSearched: number;
  usersSearched: number;
  reachedEnd: boolean;
}

interface PersonalPostSearchPage {
  candidates: Array<{
    post: Tweet;
    fields: string[];
  }>;
  nextToken?: string;
}

type XErrorPayload = ApiResponseError["data"];

export class TwitterAPIError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly payload: XErrorPayload,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "TwitterAPIError";
  }
}

export class TwitterAuthenticationError extends TwitterAPIError {
  constructor(message: string, payload: XErrorPayload, options?: ErrorOptions) {
    super(message, 401, payload, options);
    this.name = "TwitterAuthenticationError";
  }
}

export class TwitterForbiddenError extends TwitterAPIError {
  constructor(message: string, payload: XErrorPayload, options?: ErrorOptions) {
    super(message, 403, payload, options);
    this.name = "TwitterForbiddenError";
  }
}

export class TwitterRateLimitError extends TwitterAPIError {
  constructor(
    message: string,
    payload: XErrorPayload,
    readonly resetAt: Date | undefined,
    options?: ErrorOptions,
  ) {
    super(message, 429, payload, options);
    this.name = "TwitterRateLimitError";
  }
}

export class TwitterUserNotFoundError extends TwitterAPIError {
  constructor(
    readonly username: string,
    error?: TwitterAPIError,
  ) {
    super(
      `No X profile found for @${username}. Check the username and try again.`,
      404,
      error?.payload ?? {},
      error ? { cause: error } : undefined,
    );
    this.name = "TwitterUserNotFoundError";
  }
}

function twitterUserToUser(result: UserV2): User {
  return {
    id: result.id,
    name: result.name,
    username: result.username,
    created_at: result.created_at,
    description: result.description,
    location: result.location,
    profile_banner_url: result.profile_banner_url,
    profile_image_url: result.profile_image_url,
    protected: result.protected,
    public_metrics: result.public_metrics,
    url: result.url,
    verified: result.verified,
  };
}

function getXErrorDetails(payload: XErrorPayload): string[] {
  const details = [payload.title, payload.detail, payload.error];

  for (const error of payload.errors ?? []) {
    if ("message" in error) {
      details.push(error.message);
    }
    if ("title" in error) {
      details.push(error.title, error.detail);
      for (const nestedError of error.errors ?? []) {
        details.push(nestedError.message);
      }
    }
  }

  return [...new Set(details.filter((detail): detail is string => Boolean(detail?.trim())))];
}

function getRateLimitReset(error: ApiResponseError): Date | undefined {
  const header = error.headers["x-rate-limit-reset"];
  const headerValue = Array.isArray(header) ? header[0] : header;
  const resetSeconds = error.rateLimit?.reset ?? Number(headerValue);
  return Number.isFinite(resetSeconds) ? new Date(resetSeconds * 1000) : undefined;
}

function normalizeTwitterError(error: ApiResponseError): TwitterAPIError {
  const details = getXErrorDetails(error.data);
  const fallback = `X API request failed with status ${error.code}`;
  const detailMessage = details.length > 0 ? details.join(": ") : fallback;

  switch (error.code) {
    case 401:
      return new TwitterAuthenticationError(`X authentication failed: ${detailMessage}`, error.data, { cause: error });
    case 403:
      return new TwitterForbiddenError(`X denied this request: ${detailMessage}`, error.data, { cause: error });
    case 429: {
      const resetAt = getRateLimitReset(error);
      const retryMessage = resetAt ? ` Try again after ${resetAt.toLocaleTimeString()}.` : "";
      return new TwitterRateLimitError(`X rate limit reached: ${detailMessage}.${retryMessage}`, error.data, resetAt, {
        cause: error,
      });
    }
    default:
      return new TwitterAPIError(detailMessage, error.code, error.data, { cause: error });
  }
}

function getCached<T>(key: string): T | undefined {
  const cached = readCache.get(key);
  if (!cached) return undefined;

  try {
    const entry = JSON.parse(cached) as Partial<CacheEntry<T>>;
    if (typeof entry.cachedAt !== "number" || entry.value === undefined) {
      readCache.remove(key);
      return undefined;
    }
    if (Date.now() - entry.cachedAt >= READ_CACHE_TTL_MS) {
      readCache.remove(key);
      return undefined;
    }
    return entry.value;
  } catch {
    readCache.remove(key);
    return undefined;
  }
}

function setCached<T>(key: string, value: T): void {
  const entry: CacheEntry<T> = { cachedAt: Date.now(), value };
  readCache.set(key, JSON.stringify(entry));
}

function requireNumericId(value: string, label: string): string {
  const normalized = value.trim();
  if (!/^\d{1,19}$/.test(normalized)) throw new Error(`A valid numeric ${label} is required.`);
  return normalized;
}

function requireUsername(value: string): string {
  const username = value.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{1,15}$/.test(username))
    throw new Error("An exact X username of 1 to 15 letters, numbers, or underscores is required.");
  return username;
}

function normalizePostInput(input: CreatePostInput): CreatePostInput {
  const text = input.text?.trim() ?? "";
  const mediaPaths = [...new Set((input.mediaPaths ?? []).map((path) => path.trim()).filter(Boolean))];
  const quotePostId = input.quotePostId ? requireNumericId(input.quotePostId, "quote post ID") : undefined;
  const replyToPostId = input.replyToPostId ? requireNumericId(input.replyToPostId, "reply post ID") : undefined;

  if (!text && mediaPaths.length === 0) throw new Error("A post needs text or media.");
  if (text.length > 280) throw new Error(`Post text is ${text.length} characters; X allows up to 280.`);
  if (input.poll && mediaPaths.length > 0) throw new Error("A poll cannot be combined with media.");
  if (input.poll && quotePostId) throw new Error("A poll cannot be combined with a quote post.");

  let poll: PostPoll | undefined;
  if (input.poll) {
    const options = input.poll.options.map((option) => option.trim()).filter(Boolean);
    if (options.length < 2 || options.length > 4) throw new Error("A poll needs two to four non-empty options.");
    if (options.some((option) => option.length > 25))
      throw new Error("Each poll option can contain up to 25 characters.");
    if (
      !Number.isInteger(input.poll.durationMinutes) ||
      input.poll.durationMinutes < 5 ||
      input.poll.durationMinutes > 10080
    ) {
      throw new Error("Poll duration must be a whole number from 5 to 10,080 minutes.");
    }
    poll = { options, durationMinutes: input.poll.durationMinutes };
  }

  return {
    text,
    mediaPaths,
    quotePostId,
    replyToPostId,
    poll,
    replySettings: input.replySettings,
  };
}

async function inspectMediaFile(path: string): Promise<MediaFileInfo> {
  const fileStat = await stat(path);
  if (!fileStat.isFile()) throw new Error(`Media attachment is not a file: ${path}`);

  const extension = extname(path).toLowerCase();
  const format = {
    ".jpg": { mimeType: "image/jpeg", kind: "image" },
    ".jpeg": { mimeType: "image/jpeg", kind: "image" },
    ".png": { mimeType: "image/png", kind: "image" },
    ".webp": { mimeType: "image/webp", kind: "image" },
    ".gif": { mimeType: "image/gif", kind: "gif" },
    ".mp4": { mimeType: "video/mp4", kind: "video" },
    ".mov": { mimeType: "video/quicktime", kind: "video" },
    ".webm": { mimeType: "video/webm", kind: "video" },
  }[extension] as Omit<MediaFileInfo, "size"> | undefined;

  if (!format) throw new Error(`Unsupported media format "${extension || "unknown"}" for ${path}.`);

  const maximumSize =
    format.kind === "image" ? 5 * 1024 * 1024 : format.kind === "gif" ? 15 * 1024 * 1024 : 512 * 1024 * 1024;
  if (fileStat.size > maximumSize) {
    const limit = maximumSize / (1024 * 1024);
    throw new Error(`${path} is larger than X's ${limit} MB ${format.kind} upload limit.`);
  }

  return { ...format, size: fileStat.size };
}

function validateMediaCombination(files: MediaFileInfo[]): void {
  if (files.length > 4) throw new Error("A post can contain at most four images.");
  if (files.length > 1 && files.some((file) => file.kind !== "image")) {
    throw new Error("A post can contain either up to four images, one GIF, or one video.");
  }
}

export class ClientV2 {
  private async getAPI(): Promise<TwitterApi> {
    await authorize();
    const tokens = await getOAuthTokens();
    return new TwitterApi(tokens?.accessToken ?? "");
  }

  private async request<T>(
    operation: (api: TwitterApi) => Promise<T>,
    retries = { authentication: true, rateLimit: true },
  ): Promise<T> {
    try {
      const api = await this.getAPI();
      return await operation(api);
    } catch (error) {
      if (!(error instanceof ApiResponseError)) throw error;

      const normalizedError = normalizeTwitterError(error);
      if (retries.authentication && normalizedError instanceof TwitterAuthenticationError) {
        await resetOAuthTokens();
        return await this.request(operation, { authentication: false, rateLimit: retries.rateLimit });
      }

      if (retries.rateLimit && normalizedError instanceof TwitterRateLimitError) {
        const delay = normalizedError.resetAt ? normalizedError.resetAt.getTime() - Date.now() + 250 : 1000;
        if (delay > 0 && delay <= MAX_RATE_LIMIT_BACKOFF_MS) {
          await sleep(delay);
          return await this.request(operation, { authentication: retries.authentication, rateLimit: false });
        }
      }

      throw normalizedError;
    }
  }

  private async cachedRead<T>(key: string, operation: (api: TwitterApi) => Promise<T>): Promise<T> {
    const cached = getCached<T>(key);
    if (cached !== undefined) return cached;

    const value = await this.request(operation);
    setCached(key, value);
    return value;
  }

  clearCache(): void {
    readCache.clear();
  }

  async getUserAccount(userId: string): Promise<User> {
    return await this.cachedRead(`user:${userId}`, async (api) => {
      const result = await api.v2.user(userId, { "user.fields": defaultUserFields });
      return twitterUserToUser(result.data);
    });
  }

  async getUserByUsername(username: string): Promise<User> {
    const normalizedUsername = requireUsername(username);
    try {
      return await this.cachedRead(`username:${normalizedUsername}`, async (api) => {
        const result = await api.v2.userByUsername(normalizedUsername, { "user.fields": defaultUserFields });
        if (!result.data) {
          const isNotFound = result.errors?.some(
            (error) =>
              error.title === "Not Found Error" ||
              error.type.endsWith("/resource-not-found") ||
              /could not find user/i.test(error.detail),
          );
          if (isNotFound) throw new TwitterUserNotFoundError(normalizedUsername);

          const details = result.errors
            ?.map((error) => error.detail)
            .filter(Boolean)
            .join("; ");
          throw new Error(
            details
              ? `X could not load @${normalizedUsername}: ${details}`
              : `X did not return profile data for @${normalizedUsername}. Try again.`,
          );
        }
        return twitterUserToUser(result.data);
      });
    } catch (error) {
      if (error instanceof TwitterAPIError && error.statusCode === 404) {
        throw new TwitterUserNotFoundError(normalizedUsername, error);
      }
      throw error;
    }
  }

  async me(): Promise<User> {
    return await this.cachedRead("me", async (api) => {
      const result = await api.v2.me({ "user.fields": defaultUserFields });
      return twitterUserToUser(result.data);
    });
  }

  async getMyTweets(nextToken?: string): Promise<PaginatedResult<Tweet>> {
    const me = await this.me();
    const cacheKey = `my-analytics:${nextToken ?? "first"}`;
    return await this.cachedRead(cacheKey, async (api) => {
      const startTime = new Date(Date.now() - ANALYTICS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const page = await api.v2.userTimeline(me.id, {
        exclude: "retweets",
        max_results: PAGE_SIZE,
        pagination_token: nextToken,
        start_time: startTime,
        "tweet.fields": [...defaultFields, "non_public_metrics", "organic_metrics"],
        "media.fields": analyticsMediaFields,
        "user.fields": defaultUserFields,
        expansions: defaultExpansions,
      });
      return this.convertTweetPage(page.tweets, page.includes, page.meta.next_token);
    });
  }

  async mentions(nextToken?: string): Promise<PaginatedResult<Tweet>> {
    const me = await this.me();
    const cacheKey = `mentions:${nextToken ?? "first"}`;
    return await this.cachedRead(cacheKey, async (api) => {
      const page = await api.v2.userMentionTimeline(me.id, {
        max_results: PAGE_SIZE,
        pagination_token: nextToken,
        "tweet.fields": defaultFields,
        "media.fields": defaultMediaFields,
        "user.fields": defaultUserFields,
        expansions: defaultExpansions,
      });
      return this.convertTweetPage(page.tweets, page.includes, page.meta.next_token);
    });
  }

  async getUserConnections(username: string, relationship: ConnectionRelationship, nextToken?: string) {
    const normalizedUsername = requireUsername(username);
    if (relationship !== "following" && relationship !== "followers") {
      throw new Error('The relationship must be "following" or "followers".');
    }
    const user = await this.getUserByUsername(normalizedUsername);
    const page = await this.getConnectionPage(user.id, relationship, nextToken, PAGE_SIZE);
    return { user, relationship, ...page };
  }

  /** Check source -> target from the first page; never accept an arbitrary cursor as proof of a complete scan. */
  async checkFollowRelationship(
    sourceUsername: string,
    targetUsername: string,
    maxPages = MAX_CONNECTION_SEARCH_PAGES,
  ): Promise<FollowRelationshipResult> {
    const source = requireUsername(sourceUsername);
    const target = requireUsername(targetUsername);
    if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > MAX_CONNECTION_SEARCH_PAGES) {
      throw new Error("maxPages must be an integer from 1 to 10.");
    }
    const result: FollowRelationshipResult = {
      sourceUsername: source,
      targetUsername: target,
      status: "unverified",
      reason: "page_limit",
      pagesChecked: 0,
      usersChecked: 0,
      reachedEnd: false,
      maxPages,
    };

    try {
      const [sourceUser, targetUser] = await Promise.all([
        this.getUserByUsername(source),
        this.getUserByUsername(target),
      ]);
      result.sourceUserId = requireNumericId(sourceUser.id, "source user ID");
      result.targetUserId = requireNumericId(targetUser.id, "target user ID");
      const seenTokens = new Set<string>();
      let nextToken: string | undefined;

      do {
        const page = await this.getConnectionPage(sourceUser.id, "following", nextToken);
        result.pagesChecked += 1;
        result.usersChecked += page.items.length;
        result.reachedEnd = page.nextToken === undefined;

        if (page.items.some((user) => user.id === targetUser.id)) {
          return { ...result, status: "following", reason: "match_found" };
        }
        if (result.reachedEnd) {
          return { ...result, status: "not_following", reason: "complete_list" };
        }
        nextToken = page.nextToken;
        if (nextToken !== undefined) {
          if (seenTokens.has(nextToken)) return { ...result, reason: "pagination_loop" };
          seenTokens.add(nextToken);
        }
      } while (result.pagesChecked < maxPages);

      return result;
    } catch (error) {
      return {
        ...result,
        status: "unverified",
        reason: "lookup_failed",
        reachedEnd: false,
        error: getErrorMessage(error),
      };
    }
  }

  async searchMyConnections(terms: string[], limit = DEFAULT_CONNECTION_SEARCH_LIMIT): Promise<ConnectionSearchResult> {
    const normalizedTerms = normalizeSearchTerms(terms);
    if (normalizedTerms.length === 0) throw new Error("At least one non-empty connection search term is required.");
    if (normalizedTerms.length > 8) throw new Error("Search connections with at most eight terms.");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("The connection search limit must be an integer from 1 to 100.");
    }

    const following = await this.searchConnectionRelationship(normalizedTerms, "following", limit);
    if (following.items.length > 0) {
      return {
        relationshipsSearched: ["following"],
        ...following,
        retrievalLimitPerRelationship: 10000,
      };
    }

    const followers = await this.searchConnectionRelationship(normalizedTerms, "followers", limit);
    return {
      relationshipsSearched: ["following", "followers"],
      items: followers.items,
      pagesSearched: following.pagesSearched + followers.pagesSearched,
      usersSearched: following.usersSearched + followers.usersSearched,
      reachedEnd: following.reachedEnd && followers.reachedEnd,
      retrievalLimitPerRelationship: 10000,
    };
  }

  private async searchConnectionRelationship(
    normalizedTerms: string[],
    relationship: ConnectionRelationship,
    limit: number,
  ): Promise<ConnectionRelationshipSearchResult> {
    const me = await this.me();
    const matches: Array<{ user: User; score: number }> = [];
    let pagesSearched = 0;
    let usersSearched = 0;
    let nextToken: string | undefined;

    do {
      const page = await this.getConnectionPage(me.id, relationship, nextToken);
      pagesSearched += 1;
      usersSearched += page.items.length;

      for (const user of page.items) {
        const fields = [user.name, user.username, user.description ?? "", user.location ?? ""];
        const score = scoreSearchCandidate({ fields }, normalizedTerms);
        if (score === undefined) continue;

        const identityScore = scoreSearchCandidate({ fields: [user.name, user.username] }, normalizedTerms) ?? 0;
        matches.push({ user, score: score + identityScore });
      }

      nextToken = page.nextToken;
    } while (nextToken && pagesSearched < MAX_CONNECTION_SEARCH_PAGES);

    matches.sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      return left.user.username.localeCompare(right.user.username);
    });

    return {
      items: matches.slice(0, limit).map(({ user }) => user),
      pagesSearched,
      usersSearched,
      reachedEnd: nextToken === undefined,
    };
  }

  private async getConnectionPage(
    userId: string,
    relationship: ConnectionRelationship,
    nextToken?: string,
    pageSize = CONNECTION_PAGE_SIZE,
  ): Promise<ConnectionSearchPage> {
    // Version the key so pages cached before response validation cannot establish a negative relationship.
    const cacheKey = `connections:v2:${userId}:${relationship}:${pageSize}:${nextToken ?? "first"}`;
    return await this.cachedRead(cacheKey, async (api) => {
      const options = {
        max_results: pageSize,
        pagination_token: nextToken,
        "user.fields": defaultUserFields,
      };
      const page =
        relationship === "following"
          ? await api.v2.following(userId, options)
          : await api.v2.followers(userId, options);

      if (page.errors?.length) {
        const details = page.errors.map((error) => [error.title, error.detail].filter(Boolean).join(": ")).join("; ");
        throw new Error(`X returned incomplete ${relationship} data: ${details}`);
      }
      // Empty data is valid only with an explicit zero count. Missing metadata is not evidence of an empty list.
      if (
        !page.meta ||
        !Number.isInteger(page.meta.result_count) ||
        page.meta.result_count !== (page.data ?? []).length ||
        (page.data !== undefined && !Array.isArray(page.data)) ||
        page.data?.some((user) => typeof user?.id !== "string" || !/^\d{1,19}$/.test(user.id)) ||
        (page.meta.next_token !== undefined &&
          (typeof page.meta.next_token !== "string" || page.meta.next_token.length === 0))
      ) {
        throw new Error(`X returned incomplete ${relationship} pagination data.`);
      }
      return {
        items: (page.data ?? []).map(twitterUserToUser),
        nextToken: page.meta.next_token,
      };
    });
  }

  async searchMyPosts(terms: string[], limit = DEFAULT_PERSONAL_SEARCH_LIMIT): Promise<PersonalPostSearchResult> {
    const normalizedTerms = normalizeSearchTerms(terms);
    if (normalizedTerms.length === 0) throw new Error("At least one non-empty search term is required.");
    if (normalizedTerms.length > 8) throw new Error("Search personal posts with at most eight terms.");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("The personal post search limit must be an integer from 1 to 100.");
    }

    const me = await this.me();
    const matches: Array<{ post: Tweet; score: number }> = [];
    let pagesSearched = 0;
    let postsSearched = 0;
    let nextToken: string | undefined;

    do {
      const page = await this.getPersonalPostSearchPage(me.id, nextToken);
      pagesSearched += 1;
      postsSearched += page.candidates.length;

      for (const candidate of page.candidates) {
        const score = scoreSearchCandidate(candidate, normalizedTerms);
        if (score !== undefined) matches.push({ post: candidate.post, score });
      }

      nextToken = page.nextToken;
    } while (nextToken && pagesSearched < MAX_PERSONAL_HISTORY_PAGES);

    matches.sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      return (right.post.created_at ?? "").localeCompare(left.post.created_at ?? "");
    });

    return {
      items: matches.slice(0, limit).map(({ post }) => post),
      pagesSearched,
      postsSearched,
      reachedEnd: nextToken === undefined,
      retrievalLimit: 3200,
    };
  }

  private async getPersonalPostSearchPage(authorId: string, nextToken?: string): Promise<PersonalPostSearchPage> {
    const cacheKey = `personal-post-search:${authorId}:${nextToken ?? "first"}`;
    return await this.cachedRead(cacheKey, async (api) => {
      const page = await api.v2.userTimeline(authorId, {
        exclude: "retweets",
        max_results: HISTORY_PAGE_SIZE,
        pagination_token: nextToken,
        "tweet.fields": defaultFields,
        "media.fields": defaultMediaFields,
        "user.fields": defaultUserFields,
        expansions: defaultExpansions,
      });
      const includes = page.includes;

      return {
        candidates: page.tweets.map((tweet) => {
          const mentionedUsers = (tweet.entities?.mentions ?? [])
            .map((mention) => includes.userById(mention.id))
            .filter((user): user is UserV2 => user !== undefined);
          const repliedToAuthor = includes.repliedToAuthor(tweet);
          const relatedUsers = [...mentionedUsers, ...(repliedToAuthor ? [repliedToAuthor] : [])];

          return {
            post: this.tweetV2ToTweet(tweet, includes),
            fields: [
              tweet.text,
              ...(tweet.entities?.mentions ?? []).map((mention) => mention.username),
              ...relatedUsers.flatMap((user) => [user.name, user.username]),
            ],
          };
        }),
        nextToken: page.meta.next_token,
      };
    });
  }

  async getTweetsFromAuthor(
    authorId: string,
    extraFields: TTweetv2TweetField[] = [],
    nextToken?: string,
  ): Promise<PaginatedResult<Tweet>> {
    const fields = [...new Set([...defaultFields, ...extraFields])];
    const cacheKey = `author-tweets:${authorId}:${nextToken ?? "first"}:${fields.join(",")}`;

    return await this.cachedRead(cacheKey, async (api) => {
      const page = await api.v2.userTimeline(authorId, {
        max_results: PAGE_SIZE,
        pagination_token: nextToken,
        "tweet.fields": fields,
        "media.fields": defaultMediaFields,
        "user.fields": defaultUserFields,
        expansions: defaultExpansions,
      });
      return this.convertTweetPage(page.tweets, page.includes, page.meta.next_token);
    });
  }

  async searchPosts(query: string, nextToken?: string): Promise<PaginatedResult<Tweet>> {
    const normalizedQuery = query.trim();
    const cacheKey = `search:${normalizedQuery}:${nextToken ?? "first"}`;

    return await this.cachedRead(cacheKey, async (api) => {
      const page = await api.v2.search(normalizedQuery, {
        max_results: PAGE_SIZE,
        next_token: nextToken,
        "tweet.fields": defaultFields,
        "media.fields": defaultMediaFields,
        "user.fields": defaultUserFields,
        expansions: defaultExpansions,
      });
      return this.convertTweetPage(page.tweets, page.includes, page.meta.next_token);
    });
  }

  async bookmarks(nextToken?: string): Promise<PaginatedResult<Tweet>> {
    const cacheKey = `bookmarks:${nextToken ?? "first"}`;
    return await this.cachedRead(cacheKey, async (api) => {
      const page = await api.v2.bookmarks({
        max_results: PAGE_SIZE,
        pagination_token: nextToken,
        "tweet.fields": defaultFields,
        "media.fields": defaultMediaFields,
        "user.fields": defaultUserFields,
        expansions: defaultExpansions,
      });
      return this.convertTweetPage(page.tweets, page.includes, page.meta.next_token);
    });
  }

  async bookmarkFolders(nextToken?: string): Promise<PaginatedResult<BookmarkFolder>> {
    const me = await this.me();
    const cacheKey = `bookmark-folders:${nextToken ?? "first"}`;
    return await this.cachedRead(cacheKey, async (api) => {
      const response = await api.v2.get<BookmarkFolderPageResponse>(`users/${me.id}/bookmarks/folders`, {
        max_results: 100,
        pagination_token: nextToken,
      });
      return { items: response.data ?? [], nextToken: response.meta?.next_token };
    });
  }

  async bookmarksInFolder(folderId: string, nextToken?: string): Promise<PaginatedResult<Tweet>> {
    const normalizedFolderId = requireNumericId(folderId, "bookmark folder ID");
    const me = await this.me();
    const cacheKey = `bookmark-folder:${normalizedFolderId}:${nextToken ?? "first"}`;
    return await this.cachedRead(cacheKey, async (api) => {
      const response = await api.v2.get<BookmarkFolderPostPageResponse>(
        `users/${me.id}/bookmarks/folders/${normalizedFolderId}`,
        {
          max_results: PAGE_SIZE,
          pagination_token: nextToken,
        },
      );
      // Folder pages contain only IDs; resolve this page in one batch without fetching additional pages.
      const ids = [...new Set((response.data ?? []).map((post) => post.id))];
      if (ids.length === 0) return { items: [], nextToken: response.meta?.next_token };

      const posts = await api.v2.tweets(ids, {
        "tweet.fields": defaultFields,
        "media.fields": defaultMediaFields,
        "user.fields": defaultUserFields,
        expansions: defaultExpansions,
      });
      const tweets = orderByRequestedIds(ids, posts.data ?? []);
      return this.convertTweetPage(tweets, new TwitterV2IncludesHelper(posts), response.meta?.next_token);
    });
  }

  async postEngagementUsers(
    postId: string,
    kind: Exclude<PostEngagementKind, "quotes">,
    nextToken?: string,
  ): Promise<PaginatedResult<User>> {
    const normalizedPostId = requireNumericId(postId, "post ID");
    const cacheKey = `post-${kind}:${normalizedPostId}:${nextToken ?? "first"}`;
    return await this.cachedRead(cacheKey, async (api) => {
      const options = {
        max_results: 100,
        pagination_token: nextToken,
        "user.fields": defaultUserFields,
      };
      const page =
        kind === "likes"
          ? await api.v2.tweetLikedBy(normalizedPostId, options)
          : await api.v2.tweetRetweetedBy(normalizedPostId, options);
      return { items: (page.data ?? []).map(twitterUserToUser), nextToken: page.meta.next_token };
    });
  }

  async quotedPosts(postId: string, nextToken?: string): Promise<PaginatedResult<Tweet>> {
    const normalizedPostId = requireNumericId(postId, "post ID");
    const cacheKey = `post-quotes:${normalizedPostId}:${nextToken ?? "first"}`;
    return await this.cachedRead(cacheKey, async (api) => {
      const page = await api.v2.quotes(normalizedPostId, {
        max_results: PAGE_SIZE,
        pagination_token: nextToken,
        "tweet.fields": defaultFields,
        "media.fields": defaultMediaFields,
        "user.fields": defaultUserFields,
        expansions: defaultExpansions,
      });
      return this.convertTweetPage(page.tweets, page.includes, page.meta.next_token);
    });
  }

  async homeTimeline(nextToken?: string): Promise<PaginatedResult<Tweet>> {
    const cacheKey = `home:${nextToken ?? "first"}`;
    return await this.cachedRead(cacheKey, async (api) => {
      const page = await api.v2.homeTimeline({
        exclude: "replies",
        max_results: PAGE_SIZE,
        pagination_token: nextToken,
        "tweet.fields": defaultFields,
        "media.fields": defaultMediaFields,
        "user.fields": defaultUserFields,
        expansions: defaultExpansions,
      });
      return this.convertTweetPage(page.tweets, page.includes, page.meta.next_token);
    });
  }

  async refreshTweets(tweets: Tweet[] | undefined): Promise<Tweet[] | undefined> {
    if (tweets === undefined || tweets.length === 0) return tweets;

    const fields = [...defaultFields];
    if (tweets.every((tweet) => tweet.non_public_metrics !== undefined)) fields.push("non_public_metrics");
    if (tweets.every((tweet) => tweet.organic_metrics !== undefined)) fields.push("organic_metrics");
    const tweetIds = tweets.map((tweet) => tweet.id);
    const cacheKey = `tweets:${tweetIds.join(",")}:${fields.join(",")}`;

    return await this.cachedRead(cacheKey, async (api) => {
      const result = await api.v2.tweets(tweetIds, {
        "tweet.fields": fields,
        "media.fields": defaultMediaFields,
        "user.fields": defaultUserFields,
        expansions: defaultExpansions,
      });
      const includes = new TwitterV2IncludesHelper(result);
      return result.data.map((tweet) => this.tweetV2ToTweet(tweet, includes));
    });
  }

  private convertTweetPage(
    tweets: TweetV2[],
    includes: TwitterV2IncludesHelper,
    nextToken?: string,
  ): PaginatedResult<Tweet> {
    return { items: tweets.map((tweet) => this.tweetV2ToTweet(tweet, includes)), nextToken };
  }

  private tweetV2ToTweet(tweet: TweetV2, includes: TwitterV2IncludesHelper): Tweet {
    const author = includes.author(tweet);
    if (!author) throw new Error(`X did not include the author for post ${tweet.id}`);

    const firstMedia = includes.medias(tweet)[0];
    const imageUrl =
      firstMedia?.type === "animated_gif" || firstMedia?.type === "video"
        ? firstMedia.preview_image_url
        : firstMedia?.url;
    const nonPublicMetrics: TweetNonPublicMetrics | undefined = tweet.non_public_metrics
      ? {
          impression_count: tweet.non_public_metrics.impression_count,
          url_link_clicks: tweet.non_public_metrics.url_link_clicks,
          user_profile_clicks: tweet.non_public_metrics.user_profile_clicks,
        }
      : undefined;
    const organicMetrics: TweetOrganicMetrics | undefined = tweet.organic_metrics
      ? {
          impression_count: tweet.organic_metrics.impression_count,
          url_link_clicks: tweet.organic_metrics.url_link_clicks,
          user_profile_clicks: tweet.organic_metrics.user_profile_clicks,
          retweet_count: tweet.organic_metrics.retweet_count,
          reply_count: tweet.organic_metrics.reply_count,
          like_count: tweet.organic_metrics.like_count,
        }
      : undefined;

    return {
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      conversation_id: tweet.conversation_id,
      source: tweet.source ?? "",
      image_url: imageUrl,
      user: twitterUserToUser(author),
      quote_count: tweet.public_metrics?.quote_count ?? 0,
      bookmark_count: tweet.public_metrics?.bookmark_count ?? 0,
      impression_count: tweet.public_metrics?.impression_count ?? 0,
      reply_count: tweet.public_metrics?.reply_count ?? 0,
      retweet_count: tweet.public_metrics?.retweet_count ?? 0,
      like_count: tweet.public_metrics?.like_count ?? 0,
      video_view_count: firstMedia?.organic_metrics?.view_count ?? firstMedia?.public_metrics?.view_count,
      video_playback_count: firstMedia?.non_public_metrics?.playback_0_count,
      non_public_metrics: nonPublicMetrics,
      organic_metrics: organicMetrics,
    };
  }

  private async buildPostPayload(
    api: TwitterApi,
    input: CreatePostInput,
    mediaTarget: "tweet" | "dm" = "tweet",
  ): Promise<SendTweetV2Params> {
    const normalized = normalizePostInput(input);
    const mediaPaths = normalized.mediaPaths ?? [];
    const mediaFiles = await Promise.all(mediaPaths.map(inspectMediaFile));
    validateMediaCombination(mediaFiles);

    const mediaIds = await Promise.all(
      mediaPaths.map(async (path, index) => {
        const file = mediaFiles[index];
        const category = `${mediaTarget}_${file.kind}` as MediaCategory;
        return await api.v2.uploadMedia(
          await readFile(path),
          {
            media_type: file.mimeType as UploadMediaType,
            media_category: category,
          },
          MEDIA_CHUNK_SIZE,
        );
      }),
    );

    const payload: SendTweetV2Params = { text: normalized.text ?? "" };
    if (mediaIds.length > 0) {
      payload.media = {
        media_ids: mediaIds as
          | [string]
          | [string, string]
          | [string, string, string]
          | [string, string, string, string],
      };
    }
    if (normalized.quotePostId) payload.quote_tweet_id = normalized.quotePostId;
    if (normalized.replyToPostId) payload.reply = { in_reply_to_tweet_id: normalized.replyToPostId };
    if (normalized.replySettings && normalized.replySettings !== "everyone") {
      payload.reply_settings = normalized.replySettings;
    }
    if (normalized.poll) {
      payload.poll = {
        options: normalized.poll.options,
        duration_minutes: normalized.poll.durationMinutes,
      };
    }
    return payload;
  }

  async createPost(input: CreatePostInput): Promise<CreatedPost> {
    const result = await this.request(async (api) => await api.v2.tweet(await this.buildPostPayload(api, input)));
    this.clearCache();
    return result.data;
  }

  async createThread(posts: CreatePostInput[]): Promise<CreatedPost[]> {
    if (posts.length === 0) throw new Error("A thread needs at least one post.");
    const result = await this.request(async (api) => {
      const created: CreatedPost[] = [];
      let previousPostId: string | undefined;
      for (const post of posts) {
        const payload = await this.buildPostPayload(api, {
          ...post,
          replyToPostId: previousPostId ?? post.replyToPostId,
        });
        const response = await api.v2.tweet(payload);
        created.push(response.data);
        previousPostId = response.data.id;
      }
      return created;
    });
    this.clearCache();
    return result;
  }

  async sendTweet(text: string): Promise<void> {
    await this.createPost({ text });
  }

  async sendThread(texts: string[]): Promise<void> {
    await this.createThread(texts.map((text) => ({ text })));
  }

  async replyTweetID(text: string, tweetId: string): Promise<void> {
    await this.createPost({ text, replyToPostId: tweetId });
  }

  async replyTweet(text: string, tweet: Tweet): Promise<void> {
    await this.replyTweetID(text, tweet.id);
  }

  async retweet(tweet: Tweet): Promise<void> {
    await this.retweetID(tweet.id);
  }

  async retweetID(tweetId: string): Promise<void> {
    const me = await this.me();
    await this.request(async (api) => void (await api.v2.retweet(me.id, tweetId)));
    this.clearCache();
  }

  async unretweetID(tweetId: string): Promise<void> {
    const me = await this.me();
    await this.request(async (api) => void (await api.v2.unretweet(me.id, tweetId)));
    this.clearCache();
  }

  async deleteTweetID(tweetId: string): Promise<void> {
    await this.request(async (api) => void (await api.v2.deleteTweet(tweetId)));
    this.clearCache();
  }

  async deleteTweet(tweet: Tweet): Promise<void> {
    await this.deleteTweetID(tweet.id);
  }

  async likeTweet(tweet: Tweet): Promise<void> {
    await this.likeTweetID(tweet.id);
  }

  async likeTweetID(tweetId: string): Promise<void> {
    const me = await this.me();
    await this.request(async (api) => void (await api.v2.like(me.id, tweetId)));
    this.clearCache();
  }

  async unlikeTweet(tweet: Tweet): Promise<void> {
    await this.unlikeTweetID(tweet.id);
  }

  async unlikeTweetID(tweetId: string): Promise<void> {
    const me = await this.me();
    await this.request(async (api) => void (await api.v2.unlike(me.id, tweetId)));
    this.clearCache();
  }

  async bookmarkPost(postId: string): Promise<void> {
    const normalizedPostId = requireNumericId(postId, "post ID");
    await this.request(async (api) => void (await api.v2.bookmark(normalizedPostId)));
    this.clearCache();
  }

  async removeBookmark(postId: string): Promise<void> {
    const normalizedPostId = requireNumericId(postId, "post ID");
    await this.request(async (api) => void (await api.v2.deleteBookmark(normalizedPostId)));
    this.clearCache();
  }

  async setReplyHidden(postId: string, hidden: boolean): Promise<void> {
    const normalizedPostId = requireNumericId(postId, "reply post ID");
    await this.request(async (api) => void (await api.v2.hideReply(normalizedPostId, hidden)));
    this.clearCache();
  }

  async sendDirectMessage(
    participantIds: string[],
    text: string,
    mediaPath?: string,
  ): Promise<{ conversationId: string; eventId: string }> {
    const recipients = [...new Set(participantIds.map((id) => requireNumericId(id, "recipient user ID")))];
    const normalizedText = text.trim();
    if (recipients.length === 0) throw new Error("At least one recipient is required.");
    if (!normalizedText && !mediaPath) throw new Error("A direct message needs text or one media attachment.");

    const result = await this.request(async (api) => {
      let mediaId: string | undefined;
      if (mediaPath) {
        const file = await inspectMediaFile(mediaPath);
        const category = `dm_${file.kind}` as MediaCategory;
        mediaId = await api.v2.uploadMedia(
          await readFile(mediaPath),
          {
            media_type: file.mimeType as UploadMediaType,
            media_category: category,
          },
          MEDIA_CHUNK_SIZE,
        );
      }
      const message = {
        text: normalizedText || undefined,
        attachments: mediaId ? ([{ media_id: mediaId }] as [{ media_id: string }]) : undefined,
      };
      if (recipients.length === 1) return await api.v2.sendDmToParticipant(recipients[0], message);
      return await api.v2.createDmConversation({
        conversation_type: "Group",
        participant_ids: recipients,
        message,
      });
    });

    return { conversationId: result.dm_conversation_id, eventId: result.dm_event_id };
  }
}

export function createClientV2(): ClientV2 {
  return new ClientV2();
}

export const clientV2 = createClientV2();

export interface Fetcher {
  updateInline: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useRefresher<T>(
  fn: (updateInline: boolean) => Promise<T>,
  deps?: React.DependencyList,
): { data: T | undefined; error?: string; isLoading: boolean; fetcher: Fetcher } {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [timestamp, setTimestamp] = useState<Date>(new Date());
  const dependencies = [timestamp, ...(deps ?? [])];
  let canceled = false;

  const fetcher: Fetcher = {
    updateInline: async () => await fetchData(true),
    refresh: async () => setTimestamp(new Date()),
  };

  async function fetchData(updateInline = false) {
    if (canceled) return;
    setIsLoading(true);
    setError(undefined);

    try {
      const result = await fn(updateInline);
      if (!canceled) setData(result);
    } catch (error) {
      if (!canceled) setError(getErrorMessage(error));
    } finally {
      if (!canceled) setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    return () => {
      canceled = true;
    };
  }, dependencies);

  return { data, error, isLoading, fetcher };
}
