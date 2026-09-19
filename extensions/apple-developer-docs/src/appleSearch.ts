import { config } from "./config";

type AppleSearchMetadata = {
  metadataKind?: string;
  title?: string;
  description?: string;
  permalink?: string;
  sourceURL?: string;
  hierarchy?: string;
  availability?: string;
  kind?: string;
  titles?: string[];
  descriptions?: string[];
  permalinks?: string[];
  thumbnailLinks?: string[];
  projectNames?: string[];
  ids?: string[];
  itemTypes?: string[];
  availabilityDates?: string[];
  deliveryLanguageCodes?: string[];
  mediaDurations?: number[];
};

type AppleSearchResult = {
  metadata?: AppleSearchMetadata;
};

type AppleSearchEvent = {
  kind?: string;
  response?: {
    results?: AppleSearchResult[];
  };
  diff?: {
    append?: string;
    removeLast?: number;
  };
};

type AppleSearchPayload = {
  results?: Array<AppleSearchResult | { value?: AppleSearchResult }>;
};

export function createAppleSearchRequest(query: string) {
  return {
    url: `${config.apiBaseUrl}?q=${encodeURIComponent(query)}`,
    options: {
      method: "POST",
      headers: {
        Accept: "application/jsonl",
        "Content-Type": "application/json",
        "User-Agent": "Raycast Apple Developer Docs",
      },
      body: JSON.stringify({
        text: query,
        targetResultLocale: "en",
        includedResponses: ["quickSearch", "search"],
      }),
    },
  };
}

export async function parseAppleSearchResponse(response: Response, maxResults: number): Promise<PayloadResponse> {
  if (!response.ok) {
    throw new Error(`Apple Developer search request failed with status ${response.status}`);
  }

  const results = parseSearchEvents(await response.text())
    .map(normalizeResult)
    .filter((result): result is SearchResult => result !== null)
    .slice(0, maxResults);

  return {
    results,
    featuredResult: "",
    suggested_query: "",
    uuid: "",
  };
}

function parseSearchEvents(body: string): AppleSearchResult[] {
  let quickResults: AppleSearchResult[] = [];
  let searchBuffer = "";

  for (const line of body.split("\n")) {
    if (!line.trim()) continue;

    try {
      const event = JSON.parse(line) as AppleSearchEvent;
      if (event.kind === "quickSearch") {
        quickResults = event.response?.results ?? [];
      } else if (event.kind === "search") {
        const removeLast = event.diff?.removeLast ?? 0;
        searchBuffer = searchBuffer.slice(0, Math.max(0, searchBuffer.length - removeLast));
        searchBuffer += event.diff?.append ?? "";
      }
    } catch (error) {
      if (quickResults.length === 0) throw error;
      break;
    }
  }

  if (!searchBuffer) return quickResults;

  try {
    const payload = JSON.parse(searchBuffer) as AppleSearchPayload;
    const searchResults = (payload.results ?? [])
      .map((result) => ("value" in result ? result.value : result))
      .filter((result): result is AppleSearchResult => result !== undefined);
    return searchResults.length > 0 ? searchResults : quickResults;
  } catch {
    return quickResults;
  }
}

function normalizeResult(result: AppleSearchResult, order: number): SearchResult | null {
  const metadata = result.metadata;
  if (!metadata) return null;

  switch (metadata.metadataKind) {
    case "documentation": {
      const platform = (metadata.availability ?? "")
        .split("|")
        .map((value) => value.trim().split(" ")[0])
        .filter(Boolean);
      const breadcrumbs = (metadata.hierarchy ?? "")
        .split(">")
        .map((value) => value.trim())
        .filter(Boolean);

      return createSearchResult({
        title: metadata.title,
        description: metadata.description,
        url: metadata.permalink,
        type: metadata.kind === "sampleCode" ? "sample_code" : "documentation",
        order,
        platform,
        breadcrumbs,
      });
    }
    case "developer": {
      const itemType = first(metadata.itemTypes);
      if (itemType === "Collection") return null;

      return createSearchResult({
        title: first(metadata.titles),
        description: first(metadata.descriptions),
        url: first(metadata.permalinks),
        type: ["session", "video", "special event"].includes(itemType?.toLowerCase() ?? "") ? "video" : "general",
        order,
        date: first(metadata.availabilityDates),
        event_name: first(metadata.projectNames),
        session_id: first(metadata.ids),
        tile_image: first(metadata.thumbnailLinks),
        language: first(metadata.deliveryLanguageCodes),
        duration: metadata.mediaDurations?.[0]?.toString(),
      });
    }
    case "webPage":
    case "pdf":
      return createSearchResult({
        title: metadata.title,
        description: metadata.description,
        url: metadata.sourceURL,
        type: "general",
        order,
      });
    default:
      return null;
  }
}

function createSearchResult({
  title,
  description,
  url,
  type,
  order,
  platform = [],
  breadcrumbs = [],
  date = "",
  event_name = "",
  session_id = "",
  tile_image = "",
  language = "",
  duration,
}: Partial<SearchResult> & Pick<SearchResult, "type" | "order">): SearchResult {
  return {
    title: title ?? "Untitled",
    description: description ?? "",
    url: url ?? config.rootUrl,
    type,
    order,
    platform,
    breadcrumbs,
    date,
    event_name,
    session_id,
    tile_image,
    relevance: 0,
    is_beta: 0,
    language,
    lang_children: [],
    duration,
  };
}

function first(values?: string[]) {
  return values?.[0] ?? undefined;
}
