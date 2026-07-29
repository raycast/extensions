import type {
  FlowReference,
  Platform,
  ReferenceImage,
  ReferenceSource,
  ScreenReference,
  SectionReference,
} from "./types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asPositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function asPlatform(value: unknown, fallback: Platform): Platform {
  const normalized = asString(value)?.toLowerCase();
  if (normalized === "ios" || normalized === "mobile") return "ios";
  if (normalized === "web" || normalized === "website") return "web";
  return fallback;
}

function firstString(
  record: UnknownRecord,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return undefined;
}

function appName(record: UnknownRecord): string | undefined {
  const direct = firstString(record, [
    "app_name",
    "appName",
    "website_name",
    "websiteName",
    "product_name",
    "productName",
  ]);
  if (direct) return direct;

  const app = record.app;
  if (isRecord(app)) {
    const name = firstString(app, ["name", "title"]);
    if (name) return name;
  }
  for (const key of ["website", "site", "product"]) {
    const nested = record[key];
    if (!isRecord(nested)) continue;
    const name = firstString(nested, ["name", "title", "domain", "hostname"]);
    if (name) return name;
  }
  return undefined;
}

function referenceImage(record: UnknownRecord): ReferenceImage | undefined {
  const nested = isRecord(record.image) ? record.image : undefined;
  const url =
    firstString(record, [
      "image_url",
      "imageUrl",
      "imageURL",
      "thumbnail_url",
    ]) ?? (nested ? firstString(nested, ["url", "src"]) : undefined);
  const data =
    firstString(record, ["image_data", "imageData"]) ??
    (nested ? firstString(nested, ["data", "base64"]) : undefined);
  const mimeType =
    firstString(record, ["mime_type", "mimeType"]) ??
    (nested ? firstString(nested, ["mime_type", "mimeType"]) : undefined);
  const dataUrl =
    data && mimeType
      ? `data:${mimeType};base64,${data.replace(/^data:[^,]+,/, "")}`
      : data?.startsWith("data:")
        ? data
        : undefined;

  if (!url && !dataUrl) return undefined;

  const expiresAt =
    firstString(record, [
      "image_url_expires_at",
      "imageUrlExpiresAt",
      "expires_at",
      "expiresAt",
    ]) ??
    (nested
      ? firstString(nested, [
          "url_expires_at",
          "urlExpiresAt",
          "expires_at",
          "expiresAt",
        ])
      : undefined);
  const width =
    asPositiveNumber(record.width) ??
    (nested ? asPositiveNumber(nested.width) : undefined);
  const height =
    asPositiveNumber(record.height) ??
    (nested ? asPositiveNumber(nested.height) : undefined);

  return {
    ...(url ? { url } : {}),
    ...(dataUrl ? { dataUrl } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(expiresAt ? { expiresAt } : {}),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };
}

function referenceUrl(record: UnknownRecord): string | undefined {
  return firstString(record, [
    "mobbin_url",
    "mobbinUrl",
    "reference_url",
    "referenceUrl",
    "mobbin_link",
    "mobbinLink",
    "deep_link",
    "deepLink",
    "url",
  ]);
}

function candidateArray(value: unknown, keys: readonly string[]): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];
  for (const key of keys) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate;
    if (isRecord(candidate)) {
      const nested = candidateArray(candidate, keys);
      if (nested.length > 0) return nested;
    }
  }
  for (const wrapper of ["data", "payload", "response"]) {
    const nested = value[wrapper];
    if (!isRecord(nested)) continue;
    const candidates = candidateArray(nested, keys);
    if (candidates.length > 0) return candidates;
  }
  return [];
}

function normalizeScreen(
  value: unknown,
  fallbackPlatform: Platform,
  source: ReferenceSource,
  parent?: Partial<Pick<ScreenReference, "appName" | "mobbinUrl">>,
): ScreenReference | undefined {
  if (!isRecord(value)) return undefined;
  const nestedScreen = isRecord(value.screen) ? value.screen : undefined;
  const screen = nestedScreen ? { ...value, ...nestedScreen } : value;
  const id = firstString(screen, ["id", "screen_id", "screenId", "uuid"]);
  const image = referenceImage(screen);
  const mobbinUrl = referenceUrl(screen) ?? parent?.mobbinUrl;
  const name = appName(screen) ?? parent?.appName;
  if (!id || !image || !mobbinUrl || !name) return undefined;

  return {
    kind: "screen",
    id,
    title: firstString(screen, ["title", "name", "screen_name"]) ?? name,
    appName: name,
    platform: asPlatform(screen.platform, fallbackPlatform),
    mobbinUrl,
    source,
    image,
  };
}

export function normalizeScreens(
  value: unknown,
  fallbackPlatform: Platform,
  source: ReferenceSource,
): ScreenReference[] {
  const candidates = candidateArray(value, ["screens", "results", "items"]);
  const seen = new Set<string>();
  return candidates.flatMap((candidate) => {
    const screen = normalizeScreen(candidate, fallbackPlatform, source);
    if (!screen || seen.has(screen.id)) return [];
    seen.add(screen.id);
    return [screen];
  });
}

export function normalizeFlows(
  value: unknown,
  fallbackPlatform: Platform,
  source: ReferenceSource,
): FlowReference[] {
  const candidates = candidateArray(value, ["flows", "results", "items"]);
  const seen = new Set<string>();

  return candidates.flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];
    const id =
      firstString(candidate, ["id", "flow_id", "flowId", "uuid", "slug"]) ??
      `flow-${index}`;
    if (seen.has(id)) return [];

    const name = appName(candidate) ?? "Mobbin";
    const mobbinUrl = referenceUrl(candidate);
    if (!mobbinUrl) return [];
    const platform = asPlatform(candidate.platform, fallbackPlatform);
    const screens = candidateArray(candidate, [
      "screens",
      "flow_screens",
      "flowScreens",
      "screen_sequence",
      "screenSequence",
      "sequence",
      "steps",
      "actions",
      "items",
    ]).flatMap((screen) => {
      const normalized = normalizeScreen(screen, platform, source, {
        appName: name,
        mobbinUrl,
      });
      return normalized ? [normalized] : [];
    });
    const coverImage = referenceImage(candidate) ?? screens[0]?.image;
    if (screens.length === 0 && !coverImage) return [];

    seen.add(id);
    return [
      {
        kind: "flow",
        id,
        title:
          firstString(candidate, ["title", "name", "flow_name", "flowName"]) ??
          `${name} Flow`,
        appName: name,
        platform,
        mobbinUrl,
        source,
        screens,
        ...(coverImage ? { coverImage } : {}),
      },
    ];
  });
}

export function normalizeSections(
  value: unknown,
  source: ReferenceSource,
): SectionReference[] {
  const candidates = candidateArray(value, ["sections", "results", "items"]);
  const seen = new Set<string>();
  return candidates.flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];
    const image = referenceImage(candidate);
    const mobbinUrl = referenceUrl(candidate);
    const name = appName(candidate) ?? "Website";
    const id =
      firstString(candidate, [
        "id",
        "section_id",
        "sectionId",
        "uuid",
        "slug",
      ]) ?? `section-${index}`;
    if (!image || !mobbinUrl || seen.has(id)) return [];
    seen.add(id);
    return [
      {
        kind: "section",
        id,
        title:
          firstString(candidate, [
            "title",
            "name",
            "section_name",
            "sectionName",
          ]) ?? name,
        appName: name,
        platform: "web",
        mobbinUrl,
        source,
        image,
      },
    ];
  });
}

export function extractMcpPayloads(value: unknown): unknown[] {
  if (!isRecord(value)) return [value];
  const payloads: unknown[] = [];

  if (value.structuredContent !== undefined)
    payloads.push(value.structuredContent);

  const content = value.content;
  if (Array.isArray(content)) {
    for (const item of content) {
      if (!isRecord(item)) continue;
      if (item.json !== undefined) payloads.push(item.json);
      if (item.data !== undefined && item.type !== "image")
        payloads.push(item.data);
      if (item.type === "text" && typeof item.text === "string") {
        try {
          payloads.push(JSON.parse(item.text));
        } catch {
          // Prose is not a structured search result.
        }
      }
    }
  }

  return payloads.length > 0 ? payloads : [value];
}

export function candidateKeys(value: unknown): string[] {
  if (!isRecord(value)) return [];
  return Object.keys(value).slice(0, 20);
}
