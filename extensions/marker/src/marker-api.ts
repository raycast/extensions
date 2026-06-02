// Copyright (c) 2026 SENTINELITE | FTRBND | Kirkland Layton
// SPDX-License-Identifier: MIT

import { getPreferenceValues } from "@raycast/api";

export const MARKER_API_BASE_URLS = {
  development: "https://api-dev.getmarker.app",
  testflight: "https://api-testflight.getmarker.app",
  production: "https://api.getmarker.app",
} as const;

export type MarkerApiEnvironment = keyof typeof MARKER_API_BASE_URLS;

export const DEFAULT_MARKER_API_ENVIRONMENT: MarkerApiEnvironment =
  "production";
export const DEFAULT_MARKER_API_BASE_URL =
  MARKER_API_BASE_URLS[DEFAULT_MARKER_API_ENVIRONMENT];
const MARKER_API_REQUEST_TIMEOUT_MS = 30_000;
const MARKER_RAYCAST_CLIENT = "marker-raycast";
const MARKER_RAYCAST_CLIENT_VERSION = "1.0.0";

type MarkerPreferences = {
  apiToken?: string;
};

export type MarkerSettings = {
  apiToken?: string;
  apiBaseUrl: string;
  apiEnvironment: MarkerApiEnvironment;
};

export type MarkerSessionSummary = {
  id: string;
  clientID?: string;
  name: string;
  isRunning?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastStartTime?: number;
};

export type MarkerSubsessionSummary = {
  id: string;
  clientID?: string;
  sessionID: string;
  name: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  lastStartTime?: number;
};

export type MarkerTagSummary = {
  id: string;
  clientID?: string;
  sessionID?: string;
  effectiveSessionID?: string;
  markerSessionID?: string;
  sessionIDs: string[];
  tagLoadoutID?: string;
  name: string;
};

export type MarkerSummary = {
  id: string;
  clientID?: string;
  sessionID: string;
  subSessionID: string;
  name: string;
  note?: string;
  date: string;
  endDate?: string;
  tagIDs: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type MarkerChapterSummary = {
  id: string;
  clientID?: string;
  sessionID: string;
  subSessionID: string;
  name: string;
  startDate: string;
  tagIDs: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type MarkerTimelineItemSummary =
  | (MarkerSummary & { type: "marker" })
  | (MarkerChapterSummary & { type: "chapterMarker"; date: string });

export type MarkerTwitchChannelSummary = {
  id: string;
  broadcasterID?: string;
  login?: string;
  displayName: string;
  profileImageURL?: string;
  markerSessionID?: string;
  importEnabled?: boolean;
  pushEnabled?: boolean;
  validationStatus?: string;
  liveStatus?: string;
  streamID?: string;
  videoID?: string;
  streamTitle?: string;
  startedAt?: string;
  endedAt?: string;
  subSessionID?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type MarkerIntegrationContext = {
  sessions: MarkerSessionSummary[];
  subsessions: MarkerSubsessionSummary[];
  tags: MarkerTagSummary[];
  activeSubsessions: MarkerSubsessionSummary[];
  twitchChannels: MarkerTwitchChannelSummary[];
  meta: MarkerIntegrationContextMeta;
};

export type MarkerIntegrationContextMeta = {
  hasMore: {
    sessions: boolean;
    subsessions: boolean;
    tags: boolean;
  };
  nextCursors: {
    sessions?: string;
    subsessions?: string;
    tags?: string;
  };
};

type MarkerApiResponse = {
  data?: unknown;
  meta?: unknown;
  error?: {
    code?: string;
    message?: string;
  };
};

type MarkerApiSuccessResponse = {
  data: unknown;
  meta?: unknown;
};

export class MarkerApiError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
    } = {},
  ) {
    super(message);
    this.name = "MarkerApiError";
    this.status = options.status;
    this.code = options.code;
  }
}

export function markerSettingsFromPreferences(): MarkerSettings {
  const preferences = getPreferenceValues<MarkerPreferences>();
  const apiToken = preferences.apiToken?.trim() || undefined;
  const apiEnvironment = environmentFromApiToken(apiToken);

  return {
    apiToken,
    apiEnvironment,
    apiBaseUrl: MARKER_API_BASE_URLS[apiEnvironment],
  };
}

export async function listMarkerSessions(
  options: MarkerSettings,
): Promise<MarkerSessionSummary[]> {
  const values = await callMarkerApiList(options, "/v1/sessions");
  return values.flatMap((session) => normalizeSession(session));
}

export async function getMarkerIntegrationContext(
  options: MarkerSettings & {
    sessionsCursor?: string;
    subsessionsCursor?: string;
    tagsCursor?: string;
  },
): Promise<MarkerIntegrationContext> {
  const response = await requestMarkerApi(
    options,
    "GET",
    "/v1/integrations/stream-deck/context",
    {
      query: {
        sessionsCursor: options.sessionsCursor,
        subsessionsCursor: options.subsessionsCursor,
        tagsCursor: options.tagsCursor,
      },
    },
  );
  return normalizeIntegrationContext(response.data, response.meta);
}

export async function getCompleteMarkerIntegrationContext(
  options: MarkerSettings,
): Promise<MarkerIntegrationContext> {
  try {
    return await getCompleteMarkerIntegrationContextFromEndpoint(options);
  } catch (error) {
    if (isContextUnavailableError(error)) {
      return getFallbackMarkerIntegrationContext(options);
    }
    throw error;
  }
}

async function getCompleteMarkerIntegrationContextFromEndpoint(
  options: MarkerSettings,
): Promise<MarkerIntegrationContext> {
  // The Stream Deck context endpoint is intentionally reused for Raycast:
  // it gives the picker data we need without fetching marker history up front.
  let nextCursors: MarkerIntegrationContextMeta["nextCursors"] = {};
  let hasMore: MarkerIntegrationContextMeta["hasMore"] = {
    sessions: true,
    subsessions: true,
    tags: true,
  };
  const context: MarkerIntegrationContext = {
    sessions: [],
    subsessions: [],
    tags: [],
    activeSubsessions: [],
    twitchChannels: [],
    meta: {
      hasMore: { sessions: false, subsessions: false, tags: false },
      nextCursors: {},
    },
  };

  do {
    const page = await getMarkerIntegrationContext({
      ...options,
      sessionsCursor: nextCursors.sessions,
      subsessionsCursor: nextCursors.subsessions,
      tagsCursor: nextCursors.tags,
    });
    context.sessions = uniqueByID([...context.sessions, ...page.sessions]);
    context.subsessions = uniqueByID([
      ...context.subsessions,
      ...page.subsessions,
    ]);
    context.tags = uniqueByID([...context.tags, ...page.tags]);
    context.activeSubsessions = uniqueByID([
      ...context.activeSubsessions,
      ...page.activeSubsessions,
    ]);
    context.twitchChannels = uniqueByID([
      ...context.twitchChannels,
      ...page.twitchChannels,
    ]);
    hasMore = page.meta.hasMore;
    nextCursors = page.meta.nextCursors;
    context.meta = page.meta;

    if (
      (hasMore.sessions && !nextCursors.sessions) ||
      (hasMore.subsessions && !nextCursors.subsessions) ||
      (hasMore.tags && !nextCursors.tags)
    ) {
      throw new MarkerApiError(
        "Marker API returned a context page without the required next cursor.",
      );
    }
  } while (hasMore.sessions || hasMore.subsessions || hasMore.tags);

  context.meta = {
    hasMore: { sessions: false, subsessions: false, tags: false },
    nextCursors: {},
  };
  return context;
}

async function getFallbackMarkerIntegrationContext(
  options: MarkerSettings,
): Promise<MarkerIntegrationContext> {
  const sessions = await listMarkerSessions(options);
  const subsessions = await listMarkerSubsessions(options);
  const tags = await listMarkerTags(options);
  const activeSubsessions = (
    await Promise.all(
      sessions.map(async (session) => {
        try {
          return await getActiveMarkerSubsession({
            ...options,
            sessionID: session.id,
          });
        } catch {
          return undefined;
        }
      }),
    )
  ).filter((subsession): subsession is MarkerSubsessionSummary =>
    Boolean(subsession),
  );

  return {
    sessions,
    subsessions,
    tags,
    activeSubsessions,
    twitchChannels: [],
    meta: {
      hasMore: { sessions: false, subsessions: false, tags: false },
      nextCursors: {},
    },
  };
}

export async function listMarkerSubsessions(
  options: MarkerSettings & { sessionID?: string },
): Promise<MarkerSubsessionSummary[]> {
  const values = await callMarkerApiList(options, "/v1/subsessions", {
    ...(options.sessionID ? { sessionID: options.sessionID } : {}),
  });
  return values.flatMap((subsession) => normalizeSubsession(subsession));
}

export async function getActiveMarkerSubsession(
  options: MarkerSettings & { sessionID: string },
): Promise<MarkerSubsessionSummary | undefined> {
  const value = await callMarkerApi(options, "GET", "/v1/subsessions/active", {
    query: { sessionID: options.sessionID },
  });
  if (value === null) {
    return undefined;
  }
  return normalizeSubsession(value)[0];
}

export async function listMarkerTags(
  options: MarkerSettings & { sessionID?: string },
): Promise<MarkerTagSummary[]> {
  const values = await callMarkerApiList(options, "/v1/tags", {
    ...(options.sessionID ? { sessionID: options.sessionID } : {}),
  });
  return values.flatMap((tag) => normalizeTag(tag));
}

export function tagsForSession(
  tags: MarkerTagSummary[],
  sessionID: string | undefined,
): MarkerTagSummary[] {
  if (!sessionID) {
    return [];
  }

  const exactMatches = tags.filter((tag) =>
    tagBelongsToSession(tag, sessionID),
  );
  if (exactMatches.length) {
    return sortedTags(uniqueByID(exactMatches));
  }

  const sessionlessTags = tags.filter((tag) => !hasAnySessionReference(tag));
  return sortedTags(uniqueByID(sessionlessTags));
}

export async function listMarkers(
  options: MarkerSettings & { subSessionID: string },
): Promise<MarkerSummary[]> {
  const values = await callMarkerApiList(options, "/v1/markers", {
    subSessionID: options.subSessionID,
  });
  return values.flatMap((marker) => normalizeMarker(marker));
}

export async function listChapterMarkers(
  options: MarkerSettings & { subSessionID: string },
): Promise<MarkerChapterSummary[]> {
  const values = await callMarkerApiList(options, "/v1/chapter-markers", {
    subSessionID: options.subSessionID,
  });
  return values.flatMap((chapter) => normalizeChapterMarker(chapter));
}

export async function listTimeline(
  options: MarkerSettings & { subSessionID: string },
): Promise<MarkerTimelineItemSummary[]> {
  const values = await callMarkerApiList(options, "/v1/timeline", {
    subSessionID: options.subSessionID,
  });
  return values.flatMap((item) => normalizeTimelineItem(item));
}

export async function createMarkerSession(
  options: MarkerSettings & {
    name: string;
    clientID: string;
    createdAt: string;
    updatedAt: string;
  },
): Promise<string> {
  const value = await callMarkerApi(options, "POST", "/v1/sessions", {
    body: {
      name: options.name,
      isRunning: false,
      clientID: options.clientID,
      createdAt: options.createdAt,
      updatedAt: options.updatedAt,
    },
  });
  return createdResourceID(value);
}

export async function createMarkerSubsession(
  options: MarkerSettings & {
    sessionID: string;
    name: string;
    clientID: string;
    createdAt: string;
    updatedAt: string;
    lastStartTime: number;
  },
): Promise<string> {
  const value = await callMarkerApi(options, "POST", "/v1/subsessions", {
    body: {
      createdAt: options.createdAt,
      updatedAt: options.updatedAt,
      lastStartTime: options.lastStartTime,
      sessionID: options.sessionID,
      status: "active",
      name: options.name,
      clientID: options.clientID,
    },
  });
  return createdResourceID(value);
}

export async function createMarker(
  options: MarkerSettings & {
    name: string;
    note?: string;
    sessionID: string;
    subSessionID: string;
    tagIDs: string[];
    clientID: string;
    date: string;
    createdAt: string;
    updatedAt: string;
  },
): Promise<string> {
  const value = await callMarkerApi(options, "POST", "/v1/markers", {
    body: {
      name: options.name,
      date: options.date,
      note: options.note,
      subSessionID: options.subSessionID,
      sessionID: options.sessionID,
      tagIDs: options.tagIDs,
      clientID: options.clientID,
      createdAt: options.createdAt,
      updatedAt: options.updatedAt,
    },
  });
  return createdResourceID(value);
}

export async function renameMarker(
  options: MarkerSettings & {
    id: string;
    name: string;
    updatedAt: string;
  },
): Promise<string> {
  return updateMarker(options);
}

export async function updateMarker(
  options: MarkerSettings & {
    id: string;
    name?: string;
    note?: string | null;
    date?: string;
    endDate?: string | null;
    sessionID?: string;
    subSessionID?: string;
    tagIDs?: string[];
    updatedAt?: string;
  },
): Promise<string> {
  const value = await callMarkerApi(options, "PATCH", "/v1/markers", {
    body: {
      id: options.id,
      name: options.name,
      note: options.note,
      date: options.date,
      endDate: options.endDate,
      sessionID: options.sessionID,
      subSessionID: options.subSessionID,
      tagIDs: options.tagIDs,
      updatedAt: options.updatedAt,
    },
  });
  return createdResourceID(value);
}

export async function deleteMarker(
  options: MarkerSettings & { id: string },
): Promise<void> {
  await callMarkerApi(options, "DELETE", "/v1/markers", {
    query: { id: options.id },
  });
}

export async function renameChapterMarker(
  options: MarkerSettings & {
    id: string;
    name: string;
    updatedAt: string;
  },
): Promise<string> {
  return updateChapterMarker(options);
}

export async function updateChapterMarker(
  options: MarkerSettings & {
    id: string;
    name?: string;
    startDate?: string;
    sessionID?: string;
    subSessionID?: string;
    tagIDs?: string[];
    updatedAt?: string;
  },
): Promise<string> {
  const value = await callMarkerApi(options, "PATCH", "/v1/chapter-markers", {
    body: {
      id: options.id,
      name: options.name,
      startDate: options.startDate,
      sessionID: options.sessionID,
      subSessionID: options.subSessionID,
      tagIDs: options.tagIDs,
      updatedAt: options.updatedAt,
    },
  });
  return createdResourceID(value);
}

export async function deleteChapterMarker(
  options: MarkerSettings & { id: string },
): Promise<void> {
  await callMarkerApi(options, "DELETE", "/v1/chapter-markers", {
    query: { id: options.id },
  });
}

export async function createChapterMarker(
  options: MarkerSettings & {
    name: string;
    sessionID: string;
    subSessionID: string;
    tagIDs: string[];
    clientID: string;
    startDate: string;
    createdAt: string;
    updatedAt: string;
  },
): Promise<string> {
  const value = await callMarkerApi(options, "POST", "/v1/chapter-markers", {
    body: {
      name: options.name,
      startDate: options.startDate,
      subSessionID: options.subSessionID,
      sessionID: options.sessionID,
      tagIDs: options.tagIDs,
      clientID: options.clientID,
      createdAt: options.createdAt,
      updatedAt: options.updatedAt,
    },
  });
  return createdResourceID(value);
}

async function callMarkerApi(
  options: MarkerSettings,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  init: {
    query?: Record<string, string | undefined>;
    body?: Record<string, unknown>;
  } = {},
): Promise<unknown> {
  return (await requestMarkerApi(options, method, path, init)).data;
}

async function callMarkerApiList(
  options: MarkerSettings,
  path: string,
  query: Record<string, string | undefined> = {},
): Promise<unknown[]> {
  const values: unknown[] = [];
  let cursor: string | undefined;

  do {
    const response = await requestMarkerApi(options, "GET", path, {
      query: { ...query, ...(cursor ? { cursor } : {}) },
    });
    if (Array.isArray(response.data)) {
      values.push(...response.data);
    }

    const meta = normalizeResponseMeta(response.meta);
    if (meta.hasMore && !meta.nextCursor) {
      throw new MarkerApiError(
        "Marker API returned a paginated response without a next cursor.",
      );
    }
    cursor = meta.hasMore ? meta.nextCursor : undefined;
  } while (cursor);

  return values;
}

async function requestMarkerApi(
  options: MarkerSettings,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  init: {
    query?: Record<string, string | undefined>;
    body?: Record<string, unknown>;
  } = {},
): Promise<MarkerApiSuccessResponse> {
  const apiToken = options.apiToken?.trim() ?? "";
  if (!apiToken) {
    throw new MarkerApiError(
      "Configure the Marker API token in extension preferences before using Marker.",
      { code: "missing_token" },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    MARKER_API_REQUEST_TIMEOUT_MS,
  );
  try {
    const response = await fetch(
      markerApiEndpoint(options.apiBaseUrl, path, init.query),
      {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiToken}`,
          "X-Marker-Client": MARKER_RAYCAST_CLIENT,
          "X-Marker-Client-Version": MARKER_RAYCAST_CLIENT_VERSION,
          "User-Agent": `MarkerRaycast/${MARKER_RAYCAST_CLIENT_VERSION}`,
          ...(init.body || method !== "GET"
            ? { "Content-Type": "application/json" }
            : {}),
        },
        signal: controller.signal,
        body: init.body ? JSON.stringify(init.body) : undefined,
      },
    );

    let body: MarkerApiResponse;
    try {
      body = (await response.json()) as MarkerApiResponse;
    } catch {
      throw new MarkerApiError(
        `Marker API returned HTTP ${response.status} with a non-JSON response.`,
        { status: response.status },
      );
    }

    if (!response.ok || body.error) {
      const message = body.error?.message || response.statusText;
      throw new MarkerApiError(
        message
          ? `Marker API returned HTTP ${response.status}: ${message}`
          : `Marker API returned HTTP ${response.status}.`,
        { status: response.status, code: body.error?.code },
      );
    }

    if (!Object.prototype.hasOwnProperty.call(body, "data")) {
      throw new MarkerApiError("Marker API returned an unexpected response.");
    }

    return { data: body.data, meta: body.meta };
  } catch (error) {
    if (error instanceof MarkerApiError) {
      throw error;
    }
    if (isAbortError(error)) {
      throw new MarkerApiError(
        "Marker API request timed out after 30 seconds.",
        { code: "timeout" },
      );
    }
    throw new MarkerApiError(
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      { code: "network" },
    );
  } finally {
    clearTimeout(timeout);
  }
}

function markerApiEndpoint(
  baseUrl: string,
  path: string,
  query: Record<string, string | undefined> | undefined,
): string {
  const normalizedBase = validatedApiBaseUrl(baseUrl);
  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(`${normalizedBase}/${normalizedPath}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return url.href;
}

function normalizeResponseMeta(value: unknown): {
  hasMore: boolean;
  nextCursor?: string;
} {
  if (!isRecord(value)) {
    return { hasMore: false };
  }
  return {
    hasMore: value.hasMore === true,
    nextCursor:
      typeof value.nextCursor === "string" && value.nextCursor.trim()
        ? value.nextCursor
        : undefined,
  };
}

function validatedApiBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim() || DEFAULT_MARKER_API_BASE_URL;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new MarkerApiError(
      "Enter a valid Marker API base URL in extension preferences.",
      { code: "invalid_base_url" },
    );
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new MarkerApiError(
      "Marker API base URL must start with http:// or https://.",
      { code: "invalid_base_url" },
    );
  }

  url.hash = "";
  url.search = "";
  return url.href.replace(/\/+$/, "");
}

function normalizeIntegrationContext(
  value: unknown,
  meta: unknown,
): MarkerIntegrationContext {
  const record = isRecord(value) ? value : {};
  return {
    sessions: arrayValue(record.sessions).flatMap((session) =>
      normalizeSession(session),
    ),
    subsessions: arrayValue(record.subsessions).flatMap((subsession) =>
      normalizeSubsession(subsession),
    ),
    tags: arrayValue(record.tags).flatMap((tag) => normalizeTag(tag)),
    activeSubsessions: arrayValue(record.activeSubsessions).flatMap(
      (subsession) => normalizeSubsession(subsession),
    ),
    twitchChannels: arrayValue(record.twitchChannels).flatMap((channel) =>
      normalizeTwitchChannel(channel),
    ),
    meta: normalizeIntegrationContextMeta(meta ?? record.meta),
  };
}

function normalizeIntegrationContextMeta(
  value: unknown,
): MarkerIntegrationContextMeta {
  if (!isRecord(value)) {
    return {
      hasMore: { sessions: false, subsessions: false, tags: false },
      nextCursors: {},
    };
  }
  const hasMore = isRecord(value.hasMore) ? value.hasMore : {};
  const nextCursors = isRecord(value.nextCursors) ? value.nextCursors : {};
  return {
    hasMore: {
      sessions: hasMore.sessions === true,
      subsessions: hasMore.subsessions === true,
      tags: hasMore.tags === true,
    },
    nextCursors: {
      sessions: stringValue(nextCursors.sessions),
      subsessions: stringValue(nextCursors.subsessions),
      tags: stringValue(nextCursors.tags),
    },
  };
}

function environmentFromApiToken(
  value: string | undefined,
): MarkerApiEnvironment {
  const token = value?.trim().toLowerCase() ?? "";
  if (token.startsWith("mkr_dev_")) {
    return "development";
  }
  if (token.startsWith("mkr_tf_")) {
    return "testflight";
  }
  if (token.startsWith("mkr_prod_") || token.startsWith("mrk_prod_")) {
    return "production";
  }
  return DEFAULT_MARKER_API_ENVIRONMENT;
}

function normalizeSession(value: unknown): MarkerSessionSummary[] {
  if (!isRecord(value)) {
    return [];
  }

  const id =
    stringValue(value._id) ||
    stringValue(value.id) ||
    stringValue(value.clientID);
  if (!id) {
    return [];
  }

  return [
    {
      id,
      clientID: stringValue(value.clientID),
      name: stringValue(value.name) || "Untitled Session",
      isRunning:
        typeof value.isRunning === "boolean" ? value.isRunning : undefined,
      createdAt: stringValue(value.createdAt),
      updatedAt: stringValue(value.updatedAt),
      lastStartTime:
        typeof value.lastStartTime === "number"
          ? value.lastStartTime
          : undefined,
    },
  ];
}

function normalizeSubsession(value: unknown): MarkerSubsessionSummary[] {
  if (!isRecord(value)) {
    return [];
  }

  const id =
    stringValue(value._id) ||
    stringValue(value.id) ||
    stringValue(value.clientID);
  const sessionID = stringValue(value.sessionID);
  if (!id || !sessionID) {
    return [];
  }

  return [
    {
      id,
      clientID: stringValue(value.clientID),
      sessionID,
      name:
        stringValue(value.name) ||
        stringValue(value.subsessionName) ||
        "Untitled Sub-session",
      status: stringValue(value.status),
      createdAt: stringValue(value.createdAt),
      updatedAt: stringValue(value.updatedAt),
      lastStartTime:
        typeof value.lastStartTime === "number"
          ? value.lastStartTime
          : undefined,
    },
  ];
}

function normalizeTag(value: unknown): MarkerTagSummary[] {
  if (!isRecord(value)) {
    return [];
  }

  const id =
    stringValue(value._id) ||
    stringValue(value.id) ||
    stringValue(value.clientID);
  if (!id) {
    return [];
  }

  return [
    {
      id,
      clientID: stringValue(value.clientID),
      sessionID: stringValue(value.sessionID),
      effectiveSessionID: stringValue(value.effectiveSessionID),
      markerSessionID: stringValue(value.markerSessionID),
      sessionIDs: stringArrayValue(value.sessionIDs),
      tagLoadoutID: stringValue(value.tagLoadoutID),
      name: stringValue(value.name) || "Untitled Tag",
    },
  ];
}

function tagBelongsToSession(
  tag: MarkerTagSummary,
  sessionID: string,
): boolean {
  return (
    tag.sessionID === sessionID ||
    tag.effectiveSessionID === sessionID ||
    tag.markerSessionID === sessionID ||
    tag.sessionIDs.includes(sessionID)
  );
}

function hasAnySessionReference(tag: MarkerTagSummary): boolean {
  return Boolean(
    tag.sessionID ||
    tag.effectiveSessionID ||
    tag.markerSessionID ||
    tag.sessionIDs.length,
  );
}

function sortedTags(tags: MarkerTagSummary[]): MarkerTagSummary[] {
  return [...tags].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );
}

function normalizeMarker(value: unknown): MarkerSummary[] {
  if (!isRecord(value)) {
    return [];
  }

  const id =
    stringValue(value._id) ||
    stringValue(value.id) ||
    stringValue(value.clientID);
  const sessionID = stringValue(value.sessionID);
  const subSessionID = stringValue(value.subSessionID);
  const date = stringValue(value.date);
  if (!id || !sessionID || !subSessionID || !date) {
    return [];
  }

  return [
    {
      id,
      clientID: stringValue(value.clientID),
      sessionID,
      subSessionID,
      // Marker names are optional in the API; keep blank names blank so the UI
      // does not invent titles for intentionally untitled moments.
      name: stringValue(value.name) ?? "",
      note: stringValue(value.note),
      date,
      endDate: stringValue(value.endDate),
      tagIDs: stringArrayValue(value.tagIDs),
      createdAt: stringValue(value.createdAt),
      updatedAt: stringValue(value.updatedAt),
    },
  ];
}

function normalizeChapterMarker(value: unknown): MarkerChapterSummary[] {
  if (!isRecord(value)) {
    return [];
  }

  const id =
    stringValue(value._id) ||
    stringValue(value.id) ||
    stringValue(value.clientID);
  const sessionID = stringValue(value.sessionID);
  const subSessionID = stringValue(value.subSessionID);
  const startDate = stringValue(value.startDate);
  if (!id || !sessionID || !subSessionID || !startDate) {
    return [];
  }

  return [
    {
      id,
      clientID: stringValue(value.clientID),
      sessionID,
      subSessionID,
      // Existing data may contain blank chapter names even though new chapter
      // marker creation requires a title.
      name: stringValue(value.name) ?? "",
      startDate,
      tagIDs: stringArrayValue(value.tagIDs),
      createdAt: stringValue(value.createdAt),
      updatedAt: stringValue(value.updatedAt),
    },
  ];
}

function normalizeTimelineItem(value: unknown): MarkerTimelineItemSummary[] {
  if (!isRecord(value)) {
    return [];
  }

  if (value.type === "marker") {
    return normalizeMarker(value).map((marker) => ({
      ...marker,
      type: "marker" as const,
    }));
  }

  if (value.type === "chapterMarker") {
    return normalizeChapterMarker({
      ...value,
      startDate: stringValue(value.startDate) ?? stringValue(value.date),
    }).map((chapter) => ({
      ...chapter,
      type: "chapterMarker" as const,
      date: stringValue(value.date) ?? chapter.startDate,
    }));
  }

  return [];
}

function normalizeTwitchChannel(value: unknown): MarkerTwitchChannelSummary[] {
  if (!isRecord(value)) {
    return [];
  }

  const id =
    stringValue(value.id) ||
    stringValue(value._id) ||
    stringValue(value.broadcasterID) ||
    stringValue(value.login);
  if (!id) {
    return [];
  }

  return [
    {
      id,
      broadcasterID: stringValue(value.broadcasterID),
      login: stringValue(value.login),
      displayName:
        stringValue(value.displayName) ||
        stringValue(value.login) ||
        "Twitch Channel",
      profileImageURL: stringValue(value.profileImageURL),
      markerSessionID: stringValue(value.markerSessionID),
      importEnabled:
        typeof value.importEnabled === "boolean"
          ? value.importEnabled
          : undefined,
      pushEnabled:
        typeof value.pushEnabled === "boolean" ? value.pushEnabled : undefined,
      validationStatus: stringValue(value.validationStatus),
      liveStatus: stringValue(value.liveStatus),
      streamID: stringValue(value.streamID),
      videoID: stringValue(value.videoID),
      streamTitle: stringValue(value.streamTitle),
      startedAt: stringValue(value.startedAt),
      endedAt: stringValue(value.endedAt),
      subSessionID: stringValue(value.subSessionID),
      createdAt: stringValue(value.createdAt),
      updatedAt: stringValue(value.updatedAt),
    },
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function createdResourceID(value: unknown): string {
  if (isRecord(value)) {
    return (
      stringValue(value.id) ||
      stringValue(value._id) ||
      stringValue(value.clientID) ||
      ""
    );
  }
  return stringValue(value) ?? "";
}

function uniqueByID<Value extends { id: string }>(values: Value[]): Value[] {
  return [...new Map(values.map((value) => [value.id, value])).values()];
}

function isContextUnavailableError(error: unknown): boolean {
  return (
    error instanceof MarkerApiError && [404, 405].includes(error.status ?? 0)
  );
}

function isAbortError(value: unknown): boolean {
  return isRecord(value) && value.name === "AbortError";
}
