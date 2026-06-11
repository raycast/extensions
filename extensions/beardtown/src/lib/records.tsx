import { Color, Detail, Grid, List } from "@raycast/api";
import { Fragment, type ReactNode } from "react";
import { API_HOST, FAILED_STATUS_ICON, RESOURCE_CONFIG, SUCCEEDED_STATUS_ICON } from "../config";
import type { ApiRecord, ChallengeEntry, ChallengeFilter, RelationItem } from "../types";
import {
  formatLongDate,
  formatStatusValue,
  getPriceLabel,
  getStatusColor,
  getStatusIcon,
  getWeightLabel,
  formatTimeUsedValue,
  slugify,
} from "./format";

export function getFirstRecord(payload: unknown): ApiRecord | null {
  if (Array.isArray(payload)) {
    return payload.find(isRecord) ?? null;
  }

  const obj = asObject(payload);
  if (!obj) {
    return null;
  }

  if (isRecord(obj.data)) {
    return obj.data;
  }

  if (
    typeof obj.title === "string" ||
    typeof obj.slug === "string" ||
    typeof obj.url === "string" ||
    isRecord(obj.fields)
  ) {
    return obj;
  }

  return getRecords(payload)[0] ?? null;
}

export function getRecordJsonUrl(record: ApiRecord): string | null {
  const jsonUrl = getDisplayValue(record, ["jsonUrl"], "");
  if (jsonUrl) {
    try {
      return new URL(jsonUrl, API_HOST).toString();
    } catch {
      return null;
    }
  }

  const id = getDisplayValue(record, ["id"], "");
  const section = getDisplayValue(record, ["section"], "");
  if (!id || (section && section !== "challenges")) {
    return null;
  }

  return `${API_HOST}/api/v1/challenges/${id}.json`;
}

export function getYouTubeUrl(record: ApiRecord): string | null {
  const videoId = getChallengeFieldValue(record, ["videoId"], "");
  return videoId ? `https://youtu.be/${videoId}` : null;
}

export function canWatchOnYouTube(record: ApiRecord): boolean {
  return !!getYouTubeUrl(record) || !!getRecordJsonUrl(record);
}

export function getRecords(payload: unknown): ApiRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  const obj = asObject(payload);
  if (!obj) {
    return [];
  }

  const direct = obj.challenges ?? obj.items ?? obj.results ?? obj.data;
  if (Array.isArray(direct)) {
    return direct.filter(isRecord);
  }

  const firstArray = Object.values(obj).find(Array.isArray);
  if (Array.isArray(firstArray)) {
    return firstArray.filter(isRecord);
  }

  return [];
}

export function toChallengeEntries(records: ApiRecord[], filter: ChallengeFilter, startIndex = 0): ChallengeEntry[] {
  const entries = records.map((record, index) => {
    const item = unwrapRecord(record);
    const title = getDisplayValue(
      item,
      ["title", "name", "challenge_name", "slug"],
      `Challenge ${startIndex + index + 1}`,
    );
    const id = getDisplayValue(item, ["id", "uuid"], "") || buildSyntheticId(item, startIndex + index);
    const subtitle = filter === "challenges" ? getChallengeSubtitle(item) : getNonChallengeSubtitle(record, item);
    const thumbnailUrl = getImageUrl(record, item, filter);

    return {
      id,
      title,
      subtitle,
      thumbnailUrl,
      keywords: getKeywords(item, title),
      record: item,
    };
  });

  return sortEntries(entries, filter);
}

export function toTShirtEntries(records: ApiRecord[], startIndex = 0): ChallengeEntry[] {
  const entries = records.flatMap((record, index) => {
    const item = unwrapRecord(record);
    const tShirtImageUrl = getDisplayValue(item, ["tShirtUrl"], "") || getTShirtImageUrl(item);
    if (!tShirtImageUrl) {
      return [];
    }

    const challengeId = getDisplayValue(item, ["id", "challengeId", "challenge_id"], "");
    const title = getDisplayValue(
      item,
      ["title", "challengeName", "challenge_name"],
      `T-Shirt ${startIndex + index + 1}`,
    );
    const locationName = getDisplayValue(item, ["locationName", "location_name"], "");
    const videoReleased = getDisplayValue(item, ["videoReleased"], "");
    const challengeRecord: ApiRecord = {
      id: challengeId || getDisplayValue(item, ["id", "uuid"], ""),
      title,
      locationName,
      ...(videoReleased ? { videoReleased } : {}),
      section: "challenges",
      jsonUrl: challengeId ? `${API_HOST}/api/v1/challenges/${challengeId}.json` : "",
    };
    const id = `${challengeRecord.id || buildSyntheticId(item, startIndex + index)}::tshirt`;

    return [
      {
        id,
        title,
        subtitle: locationName,
        thumbnailUrl: tShirtImageUrl,
        keywords: getKeywords(challengeRecord, title),
        record: challengeRecord,
      },
    ];
  });

  return sortEntries(entries, "tshirts");
}

export function buildSyntheticId(record: ApiRecord, index: number): string {
  const parts = [
    getDisplayValue(record, ["slug"], ""),
    getDisplayValue(record, ["title", "name", "challenge_name"], ""),
    getDisplayValue(record, ["url"], ""),
    getDisplayValue(record, ["date", "challenge_date", "event_date"], ""),
  ].filter(Boolean);

  return parts.length > 0 ? `${parts.join("::")}::${index}` : `challenge-${index}`;
}

export function unwrapRecord(record: ApiRecord): ApiRecord {
  const nested = asObject(record.data);
  const attributes = asObject(record.attributes);
  return { ...record, ...(nested ?? {}), ...(attributes ?? {}) };
}

export function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function isRecord(value: unknown): value is ApiRecord {
  return !!asObject(value);
}

export function parsePageNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const numeric = Number(trimmed);
  if (Number.isInteger(numeric) && numeric > 0) {
    return numeric;
  }

  try {
    const parsed = new URL(trimmed, API_HOST);
    const page = parsed.searchParams.get("page");
    if (!page) {
      return null;
    }

    const parsedPage = Number(page);
    return Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : null;
  } catch {
    return null;
  }
}

export function parsePageSize(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const numeric = Number(value.trim());
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

export function getNextPage(payload: unknown): number | null {
  const root = asObject(payload);
  const meta = asObject(root?.meta);
  const pagination = asObject(meta?.pagination);
  const candidates = [pagination, meta, root].filter((v): v is ApiRecord => !!v);

  for (const container of candidates) {
    const current = parsePageNumber(container.current_page ?? container.currentPage ?? container.page);
    const total = parsePageNumber(container.total_pages ?? container.totalPages ?? container.pages);
    if (current && total && total > current) {
      return current + 1;
    }
  }

  return null;
}

export function resolveNextUrl(candidate: unknown, baseUrl: string): string | null {
  if (typeof candidate !== "string" || !candidate.trim()) {
    return null;
  }

  try {
    return new URL(candidate.trim(), baseUrl).toString();
  } catch {
    return null;
  }
}

export function getNextPageUrl(payload: unknown, baseUrl: string): string | null {
  const root = asObject(payload);
  const meta = asObject(root?.meta);
  const pagination = asObject(meta?.pagination);
  const links = asObject(pagination?.links);

  return (
    resolveNextUrl(links?.next, baseUrl) ||
    resolveNextUrl(pagination?.next, baseUrl) ||
    resolveNextUrl(meta?.next, baseUrl) ||
    resolveNextUrl(root?.next, baseUrl)
  );
}

export function getPerPage(payload: unknown): number | null {
  const root = asObject(payload);
  const meta = asObject(root?.meta);
  const pagination = asObject(meta?.pagination);
  const candidates = [pagination, meta, root].filter((v): v is ApiRecord => !!v);

  for (const container of candidates) {
    const pageSize = parsePageSize(container.per_page ?? container.perPage ?? container.limit);
    if (pageSize) {
      return pageSize;
    }
  }

  return null;
}

export function getDisplayValue(record: ApiRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  return fallback;
}

export function getLocationTitle(record: ApiRecord): string {
  const fields = asObject(record.fields);
  const rawLocation = fields?.location ?? record.location;
  const location = Array.isArray(rawLocation) ? asObject(rawLocation[0]) : asObject(rawLocation);

  if (location) {
    return getDisplayValue(location, ["title", "name"], "");
  }

  return "";
}

export function getChallengeSubtitle(record: ApiRecord): string {
  const locationTitle = getLocationTitle(record);
  if (locationTitle) {
    return locationTitle;
  }

  return getDisplayValue(
    record,
    ["locationName", "location_name", "venue", "venueName", "venue_name", "restaurant", "place"],
    "",
  );
}

export function getNonChallengeSubtitle(rawRecord: ApiRecord, normalizedRecord: ApiRecord): string {
  const challengeCount =
    getDisplayValue(rawRecord, ["challengeCount", "challenge_count"], "") ||
    getDisplayValue(normalizedRecord, ["challengeCount", "challenge_count"], "");

  if (!challengeCount) {
    return "";
  }

  return `${challengeCount} ${challengeCount === "1" ? "challenge" : "challenges"}`;
}

export function getChallengeFieldValue(record: ApiRecord, keys: string[], fallback = ""): string {
  const fields = asObject(record.fields);
  return getDisplayValue(fields ?? {}, keys, "") || getDisplayValue(record, keys, fallback);
}

export function getRelationItems(record: ApiRecord, keys: string[]): RelationItem[] {
  const fields = asObject(record.fields);
  const results: RelationItem[] = [];

  for (const key of keys) {
    const value = fields?.[key] ?? record[key];
    for (const item of normalizeRelationRecords(value).map(unwrapRecord)) {
      const title = getDisplayValue(item, ["title", "name"], "");
      const url = getAbsoluteRecordUrl(item);
      const id = getDisplayValue(item, ["id"], "");
      const slug = getDisplayValue(item, ["slug"], "");
      const section = getDisplayValue(item, ["section"], "");
      if (title && !results.some((entry) => entry.title === title)) {
        results.push({
          title,
          ...(id ? { id } : {}),
          ...(slug ? { slug } : {}),
          ...(section ? { section } : {}),
          ...(url ? { url } : {}),
        });
      }
    }
  }

  return results;
}

export function getAbsoluteRecordUrl(record: ApiRecord): string | undefined {
  const url = getDisplayValue(record, ["url"], "");
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url, API_HOST).toString();
  } catch {
    return undefined;
  }
}

export function getFilterForRelationSection(section?: string): ChallengeFilter | null {
  switch ((section ?? "").toLowerCase()) {
    case "highlights":
      return "highlights";
    case "consumed":
      return "consumed";
    case "prizes":
      return "prizes";
    case "guests":
      return "guests";
    case "series":
      return "series";
    default:
      return null;
  }
}

export function relationMatchesRecord(relation: RelationItem, record: ApiRecord): boolean {
  const recordId = getDisplayValue(record, ["id"], "");
  if (relation.id && recordId && relation.id === recordId) {
    return true;
  }

  const recordSlug = getDisplayValue(record, ["slug"], "");
  if (relation.slug && recordSlug && relation.slug === recordSlug) {
    return true;
  }

  const recordUrl = getAbsoluteRecordUrl(record);
  if (relation.url && recordUrl && relation.url === recordUrl) {
    return true;
  }

  return relation.title === getDisplayValue(record, ["title", "name"], "");
}

export function getLocationMapUrl(locationTitle: string) {
  return `https://beard.town/map#${slugify(locationTitle)}`;
}

export function getKeywords(record: ApiRecord, title: string): string[] {
  return Array.from(
    new Set(
      [
        title,
        getDisplayValue(record, ["slug"], ""),
        getDisplayValue(record, ["location", "venue", "food", "meal", "status"], ""),
      ].filter(Boolean),
    ),
  );
}

export function filterEntries(entries: ChallengeEntry[], searchText: string): ChallengeEntry[] {
  const query = searchText.trim().toLowerCase();
  if (!query) {
    return entries;
  }

  return entries.filter((entry) =>
    [entry.title, entry.subtitle, ...entry.keywords].filter(Boolean).join(" ").toLowerCase().includes(query),
  );
}

export function getImageUrl(rawRecord: ApiRecord, normalizedRecord: ApiRecord, filter: ChallengeFilter): string {
  const primaryThumbnailUrl = getPrimaryThumbnailUrl(rawRecord) || getPrimaryThumbnailUrl(normalizedRecord);
  if (primaryThumbnailUrl) {
    return primaryThumbnailUrl;
  }

  if (filter !== "challenges") {
    const latestVideoThumbnailUrl =
      getLatestVideoThumbnailUrl(rawRecord) || getLatestVideoThumbnailUrl(normalizedRecord);
    if (latestVideoThumbnailUrl) {
      return latestVideoThumbnailUrl;
    }
  }

  return "";
}

export function getTShirtImageUrl(record: ApiRecord): string {
  const fields = asObject(record.fields);
  const shirts = normalizeRelationRecords(fields?.tShirt ?? record.tShirt).map(unwrapRecord);

  for (const shirt of shirts) {
    const url = getDisplayValue(shirt, ["url"], "");
    if (url) {
      return url;
    }
  }

  return "";
}

export function hasTShirt(record: ApiRecord): boolean {
  const fields = asObject(record.fields);
  return normalizeRelationRecords(fields?.tShirt ?? record.tShirt).map(unwrapRecord).length > 0;
}

export function getNonChallengeListIcon(entry: ChallengeEntry): List.Item.Props["icon"] {
  if (!entry.thumbnailUrl) {
    return undefined;
  }

  const tooltip = getLatestRelatedChallengeTooltip(entry.record);
  if (tooltip) {
    return {
      value: { source: entry.thumbnailUrl },
      tooltip,
    };
  }

  return { source: entry.thumbnailUrl };
}

export function getLatestRelatedChallengeTooltip(record: ApiRecord): string {
  const latest = getLatestRelatedChallenge(record);
  if (!latest) {
    return "";
  }

  const title = getDisplayValue(latest, ["title", "name", "challenge_name", "challengeTitle", "slug"], "");
  if (!title) {
    return "";
  }

  const locationName =
    getDisplayValue(latest, ["locationName"], "") ||
    getDisplayValue(asObject(latest.fields) ?? {}, ["locationName"], "") ||
    getLocationTitle(latest);

  return locationName ? `Latest: ${title} Challenge at ${locationName}` : `Latest: ${title} Challenge`;
}

export function getLatestRelatedChallenge(record: ApiRecord): ApiRecord | null {
  const fields = asObject(record.fields);
  const candidateSources = [record.challenges, fields?.challenges];
  const candidates = dedupeRecords(
    candidateSources.flatMap((value) => normalizeRelationRecords(value)).map(unwrapRecord),
  );

  const sortedCandidates = candidates
    .map((item, index) => ({ item, index, timestamp: getRecordTimestamp(item) }))
    .sort((left, right) => {
      if (left.timestamp === right.timestamp) {
        return left.index - right.index;
      }
      if (left.timestamp === null) {
        return 1;
      }
      if (right.timestamp === null) {
        return -1;
      }
      return right.timestamp - left.timestamp;
    });

  return sortedCandidates[0]?.item ?? null;
}

export function getLatestVideoThumbnailUrl(record: ApiRecord): string {
  const fields = asObject(record.fields);
  const candidateSources = [
    fields?.latestVideo,
    fields?.latestVideos,
    fields?.video,
    fields?.videos,
    fields?.relatedVideo,
    fields?.relatedVideos,
    fields?.featuredVideo,
    fields?.featuredVideos,
    record.latestVideo,
    record.latestVideos,
    record.video,
    record.videos,
    record.relatedVideo,
    record.relatedVideos,
    record.featuredVideo,
    record.featuredVideos,
  ];

  const videos = candidateSources.flatMap((value) => normalizeRelationRecords(value)).map(unwrapRecord);
  const dedupedVideos = dedupeRecords(videos);

  const sortedVideos = dedupedVideos
    .map((video, index) => ({ video, index, timestamp: getRecordTimestamp(video) }))
    .sort((left, right) => {
      if (left.timestamp === right.timestamp) {
        return left.index - right.index;
      }
      if (left.timestamp === null) {
        return 1;
      }
      if (right.timestamp === null) {
        return -1;
      }
      return right.timestamp - left.timestamp;
    });

  const latestVideo = sortedVideos[0]?.video;
  if (!latestVideo) {
    return "";
  }

  return getPrimaryThumbnailUrl(latestVideo);
}

export function getPrimaryThumbnailUrl(record: ApiRecord): string {
  const fields = asObject(record.fields);
  const candidates = [fields?.thumbnail, record.thumbnail, fields?.image, record.image, fields?.images, record.images];

  for (const candidate of candidates) {
    const nestedRecords = normalizeRelationRecords(candidate).map(unwrapRecord);
    for (const nested of nestedRecords) {
      const nestedUrl = getDisplayValue(nested, ["url"], "");
      if (nestedUrl) {
        return nestedUrl;
      }
    }

    const direct = asObject(candidate);
    if (direct) {
      const nestedUrl = getDisplayValue(direct, ["url"], "");
      if (nestedUrl) {
        return nestedUrl;
      }
    }
  }

  return "";
}

export function normalizeRelationRecords(value: unknown): ApiRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  return isRecord(value) ? [value] : [];
}

export function getRecordTimestamp(record: ApiRecord): number | null {
  const candidates = [
    record.postDate,
    record.date,
    record.videoReleased,
    record.videoReleaseDate,
    record.publishedAt,
    record.publishDate,
    record.videoDate,
    record.createdAt,
    record.updatedAt,
    asObject(record.fields)?.postDate,
    asObject(record.fields)?.date,
    asObject(record.fields)?.videoReleased,
    asObject(record.fields)?.videoReleaseDate,
    asObject(record.fields)?.publishedAt,
    asObject(record.fields)?.publishDate,
    asObject(record.fields)?.videoDate,
    asObject(record.fields)?.createdAt,
    asObject(record.fields)?.updatedAt,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" && typeof candidate !== "number") {
      continue;
    }

    const timestamp = new Date(candidate).getTime();
    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  return null;
}

export function getRecordUrl(record: ApiRecord): string | null {
  const url = getDisplayValue(record, ["url"], "");
  if (!url) {
    return null;
  }

  try {
    return new URL(url, API_HOST).toString();
  } catch {
    return null;
  }
}

export function getDedupKey(record: ApiRecord, fallback: string): string {
  return getDisplayValue(record, ["id", "slug", "url"], "") || fallback;
}

function dedupeRecords(records: ApiRecord[]): ApiRecord[] {
  const seen = new Set<string>();

  return records.filter((record, index) => {
    const key = getDedupKey(record, String(index));
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function getResourceUrl(filter: ChallengeFilter): string {
  return new URL(RESOURCE_CONFIG[filter].path, API_HOST).toString();
}

export function getNonChallengeAccessories(record: ApiRecord) {
  const succeededCount = getNumericField(record, ["succeededCount", "succeeded_count"]);
  const failedCount = getNumericField(record, ["failedCount", "failed_count"]);
  const accessories = [];

  if (succeededCount !== null && succeededCount > 0) {
    accessories.push({
      text: { value: String(succeededCount), color: Color.Green },
      tooltip: "Succeeded challenges",
    });
  }

  if (failedCount !== null && failedCount > 0) {
    accessories.push({
      text: { value: String(failedCount), color: Color.Red },
      tooltip: "Failed challenges",
    });
  }

  if (succeededCount !== null && failedCount !== null) {
    const total = succeededCount + failedCount;
    if (total > 0) {
      const successRate = Math.round((succeededCount / total) * 100);
      accessories.push({
        text: { value: `${successRate}%`, color: Color.SecondaryText },
        tooltip: "Success rate",
      });
    }
  }

  return accessories.length > 0 ? accessories : undefined;
}

export function getNumericField(record: ApiRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

export function sortEntries(entries: ChallengeEntry[], filter: ChallengeFilter) {
  if (filter === "challenges") {
    return entries;
  }

  if (filter === "tshirts") {
    return [...entries].sort((left, right) => {
      const leftTimestamp = getRecordTimestamp(left.record);
      const rightTimestamp = getRecordTimestamp(right.record);

      if (leftTimestamp !== null || rightTimestamp !== null) {
        if (leftTimestamp === null) return 1;
        if (rightTimestamp === null) return -1;
        if (leftTimestamp !== rightTimestamp) return rightTimestamp - leftTimestamp;
      }

      return left.title.localeCompare(right.title, "en-US", { sensitivity: "base" });
    });
  }

  if (filter === "guests") {
    return [...entries].sort((left, right) => left.title.localeCompare(right.title, "en-US", { sensitivity: "base" }));
  }

  return [...entries].sort((left, right) => getChallengeCount(right.record) - getChallengeCount(left.record));
}

export function groupChallengeEntriesByYear(entries: ChallengeEntry[], countEntries: ChallengeEntry[] = entries) {
  const groups = new Map<string, ChallengeEntry[]>();
  const counts = new Map<string, number>();

  for (const entry of countEntries) {
    const timestamp = getVideoReleasedTimestamp(entry.record);
    const year = timestamp ? new Date(timestamp).getUTCFullYear().toString() : "Unknown";
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }

  for (const entry of entries) {
    const timestamp = getVideoReleasedTimestamp(entry.record);
    const year = timestamp ? new Date(timestamp).getUTCFullYear().toString() : "Unknown";
    const existing = groups.get(year);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(year, [entry]);
    }
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => {
      if (left === "Unknown") return 1;
      if (right === "Unknown") return -1;
      return right.localeCompare(left);
    })
    .map(([title, items]) => ({ title, items, count: counts.get(title) ?? items.length }));
}

function getVideoReleasedTimestamp(record: ApiRecord): number | null {
  const fields = asObject(record.fields);
  const candidates = [record.videoReleased, record.videoReleaseDate, fields?.videoReleased, fields?.videoReleaseDate];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" && typeof candidate !== "number") {
      continue;
    }

    const timestamp = new Date(candidate).getTime();
    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  return null;
}

export function getChallengeCount(record: ApiRecord) {
  const value = record.challengeCount ?? record.challenge_count;
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function getChallengeAccessory(record: ApiRecord): Grid.Item.Props["accessory"] {
  const fields = asObject(record.fields) ?? {};
  const outcome = [
    getDisplayValue(record, ["status", "result", "outcome", "completionStatus", "challengeStatus"], ""),
    getDisplayValue(fields, ["status", "result", "outcome", "completionStatus", "challengeStatus"], ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const succeededFlag = pickFirstBoolean(record, ["succeeded", "success", "completed", "won", "isWinner"]);
  const failedFlag = pickFirstBoolean(record, ["failed", "failure", "lost", "dnf"]);
  const fieldSucceededFlag = pickFirstBoolean(fields, ["succeeded", "success", "completed", "won", "isWinner"]);
  const fieldFailedFlag = pickFirstBoolean(fields, ["failed", "failure", "lost", "dnf"]);

  if (succeededFlag === true || fieldSucceededFlag === true) {
    return { icon: SUCCEEDED_STATUS_ICON, tooltip: "Succeeded" };
  }

  if (failedFlag === true || fieldFailedFlag === true) {
    return { icon: FAILED_STATUS_ICON, tooltip: "Failed" };
  }

  if (["succeeded", "success", "completed", "won", "win"].some((term) => outcome.includes(term))) {
    return { icon: SUCCEEDED_STATUS_ICON, tooltip: "Succeeded" };
  }

  if (["failed", "fail", "lost", "loss", "dnf"].some((term) => outcome.includes(term))) {
    return { icon: FAILED_STATUS_ICON, tooltip: "Failed" };
  }

  return undefined;
}

export function pickFirstBoolean(record: ApiRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      if (value === 1) return true;
      if (value === 0) return false;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "yes", "1"].includes(normalized)) return true;
      if (["false", "no", "0"].includes(normalized)) return false;
    }
  }

  return undefined;
}

export function extractRelatedChallengeRecords(payload: unknown): ApiRecord[] {
  const root = asObject(payload);
  if (!root) {
    return [];
  }

  const directChallenges = normalizeRelationRecords(root.challenges);
  if (directChallenges.length > 0) {
    return directChallenges.map(unwrapRecord);
  }

  const fields = asObject(root.fields);
  const fieldChallenges = normalizeRelationRecords(fields?.challenges);
  if (fieldChallenges.length > 0) {
    return fieldChallenges.map(unwrapRecord);
  }

  return [];
}

export function buildDetailMarkdown(entry: ChallengeEntry, record: ApiRecord): string {
  const lines: string[] = [];
  const detailImageUrl = getPrimaryThumbnailUrl(record) || (getRecordJsonUrl(record) ? "" : entry.thumbnailUrl);

  lines.push(`# ${getDetailTitle(record, entry.title)}`);

  if (detailImageUrl) {
    lines.push("");
    lines.push(`![${entry.title}](${detailImageUrl})`);
    lines.push("");
  }

  return lines.join("\n");
}

export function getDetailTitle(record: ApiRecord, fallbackTitle: string): string {
  const locationTitle = getChallengeSubtitle(record);
  if (locationTitle) {
    return `${fallbackTitle} Challenge at ${locationTitle}`;
  }

  return `${fallbackTitle} Challenge`;
}

export function buildDetailMetadata(
  record: ApiRecord,
  onOpenRelation: (item: RelationItem) => void,
  onOpenTShirt?: () => void,
) {
  const locationTitle = getLocationTitle(record);
  const dateValue = formatLongDate(
    getChallengeFieldValue(record, ["videoReleased", "date", "challenge_date", "event_date", "postDate"], ""),
  );
  const statusValue = formatStatusValue(getChallengeFieldValue(record, ["status", "result", "challengeStatus"], ""));
  const urlValue = getDisplayValue(record, ["url"], "");
  const priceValue = getPriceLabel(record);
  const weightValue = getWeightLabel(record);
  const timeLimitValue = getChallengeFieldValue(record, ["timeLimit"], "");
  const timeTakenValue = getChallengeFieldValue(record, ["timeTaken"], "");
  const timeUsedValue = formatTimeUsedValue(getChallengeFieldValue(record, ["timeUsed"], ""));
  const videoLengthValue = getChallengeFieldValue(record, ["videoLength"], "");
  const joinedByItems = getRelationItems(record, ["joinedBy"]);
  const consumedItems = getRelationItems(record, ["food"]);
  const prizeItems = getRelationItems(record, ["prizes"]);
  const highlightItems = getRelationItems(record, ["stats"]);

  if (
    !locationTitle &&
    !dateValue &&
    !statusValue &&
    !priceValue &&
    !weightValue &&
    !timeLimitValue &&
    !timeTakenValue &&
    !timeUsedValue &&
    !videoLengthValue &&
    joinedByItems.length === 0 &&
    consumedItems.length === 0 &&
    prizeItems.length === 0 &&
    highlightItems.length === 0 &&
    !urlValue
  ) {
    return undefined;
  }

  const sections: ReactNode[][] = [];

  const topSection: ReactNode[] = [];
  if (locationTitle) {
    topSection.push(
      <Detail.Metadata.Link
        key="location"
        title="Location"
        text={locationTitle}
        target={getLocationMapUrl(locationTitle)}
      />,
    );
  }
  if (joinedByItems.length > 0) {
    topSection.push(
      <Detail.Metadata.TagList key="joined-by" title="Joined By">
        {joinedByItems.map((item) => (
          <Detail.Metadata.TagList.Item
            key={`joined-by-${item.title}`}
            text={item.title}
            onAction={() => onOpenRelation(item)}
          />
        ))}
      </Detail.Metadata.TagList>,
    );
  }
  if (topSection.length > 0) {
    sections.push(topSection);
  }

  const statsSection: ReactNode[] = [];
  if (priceValue) {
    statsSection.push(<Detail.Metadata.Label key="price" title="Price" text={priceValue} />);
  }
  if (weightValue) {
    statsSection.push(<Detail.Metadata.Label key="weight" title="Weight" text={weightValue} />);
  }
  if (statsSection.length > 0) {
    sections.push(statsSection);
  }

  const timingSection: ReactNode[] = [];
  if (timeLimitValue) {
    timingSection.push(<Detail.Metadata.Label key="time-limit" title="Time Limit" text={timeLimitValue} />);
  }
  if (timeTakenValue) {
    timingSection.push(<Detail.Metadata.Label key="time-taken" title="Time Taken" text={timeTakenValue} />);
  }
  if (timeUsedValue) {
    timingSection.push(<Detail.Metadata.Label key="time-used" title="Time Used" text={timeUsedValue} />);
  }
  if (statusValue) {
    timingSection.push(
      <Detail.Metadata.Label
        key="status"
        title="Status"
        icon={getStatusIcon(statusValue)}
        text={{ value: statusValue, color: getStatusColor(statusValue) }}
      />,
    );
  }
  if (timingSection.length > 0) {
    sections.push(timingSection);
  }

  const relationsSection: ReactNode[] = [];
  if (highlightItems.length > 0) {
    relationsSection.push(
      <Detail.Metadata.TagList key="highlights" title="Highlights">
        {highlightItems.map((item) => (
          <Detail.Metadata.TagList.Item
            key={`highlight-${item.title}`}
            text={item.title}
            onAction={() => onOpenRelation(item)}
          />
        ))}
      </Detail.Metadata.TagList>,
    );
  }
  if (consumedItems.length > 0) {
    relationsSection.push(
      <Detail.Metadata.TagList key="consumed" title="Consumed">
        {consumedItems.map((item) => (
          <Detail.Metadata.TagList.Item
            key={`consumed-${item.title}`}
            text={item.title}
            onAction={() => onOpenRelation(item)}
          />
        ))}
      </Detail.Metadata.TagList>,
    );
  }
  if (prizeItems.length > 0) {
    relationsSection.push(
      <Detail.Metadata.TagList key="prizes" title="Prizes">
        {prizeItems.map((item) => (
          <Detail.Metadata.TagList.Item
            key={`prize-${item.title}`}
            text={item.title}
            onAction={() => onOpenRelation(item)}
          />
        ))}
      </Detail.Metadata.TagList>,
    );
  }
  if (onOpenTShirt && hasTShirt(record)) {
    relationsSection.push(
      <Detail.Metadata.TagList key="tshirt" title="T-Shirt">
        <Detail.Metadata.TagList.Item text="View in Gallery" onAction={onOpenTShirt} />
      </Detail.Metadata.TagList>,
    );
  }
  if (relationsSection.length > 0) {
    sections.push(relationsSection);
  }

  const videoSection: ReactNode[] = [];
  if (dateValue) {
    videoSection.push(<Detail.Metadata.Label key="video-released" title="Video Released" text={dateValue} />);
  }
  if (videoLengthValue) {
    videoSection.push(<Detail.Metadata.Label key="video-length" title="Video Length" text={videoLengthValue} />);
  }
  if (videoSection.length > 0) {
    sections.push(videoSection);
  }

  return (
    <Detail.Metadata>
      {sections.map((section, index) => (
        <Fragment key={`metadata-section-${index}`}>
          {index > 0 ? <Detail.Metadata.Separator /> : null}
          {section}
        </Fragment>
      ))}
    </Detail.Metadata>
  );
}
