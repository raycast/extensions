export interface PerigonArticle {
  articleId: string;
  title: string;
  url: string;
  description: string;
  pubDate: string;
  sourceDomain: string;
  imageUrl: string;
}

export interface PerigonStory {
  id: string;
  name: string;
  summary: string;
  shortSummary: string;
  uniqueSources: string[];
  totalCount: number;
  uniqueSourcesCount: number;
  updatedAt: string;
}

export interface PerigonMonitor {
  uuid: string;
  name: string;
  status: string;
  classificationType: string;
}

export interface PerigonMonitorEvent {
  uuid: string;
  eventType: string;
  eventDate: string;
  createdAt: string;
  summary: string;
  articleTitle: string;
  articleUrl: string;
}

export interface PerigonMonitorNewsletter {
  uuid: string;
  title: string;
  createdAt: string;
  content: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readOptionalString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  return "";
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readDomains(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const domains: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const domain = item.trim();
    const key = domain.toLowerCase();
    if (!domain || domain.length > 253 || seen.has(key) || /[\s"'<>]/.test(domain) || !domain.includes(".")) {
      continue;
    }
    seen.add(key);
    domains.push(domain);
  }
  return domains;
}

export function parseArticlesResponse(json: unknown): PerigonArticle[] {
  if (!isRecord(json) || !Array.isArray(json.articles)) {
    return [];
  }

  const articles: PerigonArticle[] = [];
  for (const item of json.articles) {
    if (!isRecord(item)) {
      continue;
    }
    const url = readOptionalString(item.url);
    const title = readOptionalString(item.title);
    if (!url && !title) {
      continue;
    }
    const source = isRecord(item.source) ? readOptionalString(item.source.domain) : "";
    articles.push({
      articleId: readOptionalString(item.articleId) || url || title,
      title: title || "Untitled",
      url,
      description: readOptionalString(item.description) || readOptionalString(item.summary),
      pubDate: readOptionalString(item.pubDate),
      sourceDomain: source,
      imageUrl: readOptionalString(item.imageUrl),
    });
  }
  return articles;
}

export function parseStoriesResponse(json: unknown): PerigonStory[] {
  if (!isRecord(json) || !Array.isArray(json.results)) {
    return [];
  }

  const stories: PerigonStory[] = [];
  for (const item of json.results) {
    if (!isRecord(item)) {
      continue;
    }
    const id = readOptionalString(item.id);
    const name = readOptionalString(item.name);
    if (!id && !name) {
      continue;
    }
    stories.push({
      id: id || name,
      name: name || id,
      summary: readOptionalString(item.summary),
      shortSummary: readOptionalString(item.shortSummary),
      uniqueSources: readDomains(item.uniqueSources),
      totalCount: readNumber(item.totalCount),
      uniqueSourcesCount: readNumber(item.uniqueSourcesCount),
      updatedAt: readOptionalString(item.updatedAt),
    });
  }
  return stories;
}

export function parseMonitorsResponse(json: unknown): PerigonMonitor[] {
  if (!isRecord(json) || !Array.isArray(json.data)) {
    return [];
  }

  const monitors: PerigonMonitor[] = [];
  for (const item of json.data) {
    if (!isRecord(item)) {
      continue;
    }
    const uuid = readString(item.uuid);
    const name = readString(item.name);
    if (!uuid || !name) {
      continue;
    }
    monitors.push({
      uuid,
      name,
      status: readOptionalString(item.status) || "UNKNOWN",
      classificationType: readOptionalString(item.classificationType),
    });
  }
  return monitors;
}

export function parseMonitorEventsResponse(json: unknown): PerigonMonitorEvent[] {
  if (!isRecord(json) || !Array.isArray(json.data)) {
    return [];
  }

  const events: PerigonMonitorEvent[] = [];
  for (const item of json.data) {
    if (!isRecord(item)) {
      continue;
    }
    const uuid = readString(item.uuid);
    if (!uuid) {
      continue;
    }
    let articleTitle = "";
    let articleUrl = "";
    const articles = item.articles;
    if (isRecord(articles)) {
      const firstKey = Object.keys(articles)[0];
      if (firstKey) {
        const article = articles[firstKey];
        if (isRecord(article)) {
          articleTitle = readOptionalString(article.title);
          articleUrl = readOptionalString(article.url);
        }
      }
    }
    events.push({
      uuid,
      eventType: readOptionalString(item.eventType),
      eventDate: readOptionalString(item.eventDate),
      createdAt: readOptionalString(item.createdAt),
      summary: readOptionalString(item.summary),
      articleTitle,
      articleUrl,
    });
  }
  return events;
}

export function parseMonitorNewslettersResponse(json: unknown): PerigonMonitorNewsletter[] {
  if (!isRecord(json) || !Array.isArray(json.data)) {
    return [];
  }

  const newsletters: PerigonMonitorNewsletter[] = [];
  for (const item of json.data) {
    if (!isRecord(item)) {
      continue;
    }
    const uuid = readString(item.uuid);
    const title = readString(item.title);
    if (!uuid) {
      continue;
    }
    newsletters.push({
      uuid,
      title: title || "Briefing",
      createdAt: readOptionalString(item.createdAt),
      content: readOptionalString(item.content),
    });
  }
  return newsletters;
}
