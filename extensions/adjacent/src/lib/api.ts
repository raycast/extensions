import { cached, mapPool, peekCache } from './http';
import { displayPrice, formatLevel, formatProb, formatWhen, marketTitle } from './format';
import { apiKey, hasApiKey, timeframeQuery, type Timeframe } from './prefs';
import { site } from './urls';
import type {
  Candle,
  Constituent,
  EntityType,
  Event,
  FindHit,
  Index,
  Market,
  NewsArticle,
  Page,
  PriceEntityType,
  PricePoint,
  PublicPlan,
  Quote,
  Rate,
  SimilarMarket,
  SnapshotMeta,
  Trade,
} from './types';

const BASE = site.api;

export class AdjacentError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly upgradeUrl?: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'AdjacentError';
  }
}

const AUTH_ONLY = /\/(candles|similar|trades|quotes)(\/|$)/;
const NEWS_PATH = /(^|\/)news(\/|$)/;

function resolvePath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (hasApiKey() || p.startsWith('/public/')) return p;
  if (NEWS_PATH.test(p) || p.startsWith('/export') || AUTH_ONLY.test(p)) {
    throw new AdjacentError(
      'This surface needs an Adjacent API key. Add one in Raycast → Extensions → Adjacent.',
      401,
      site.subscribe,
    );
  }
  return `/public${p}`;
}

function queryString(
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

function ttlFor(path: string): number {
  if (path.includes('/news')) return 180_000;
  if (path.includes('/constituents')) return 120_000;
  if (path.includes('/prices') || path.includes('/candles')) return 45_000;
  if (path.includes('/indices') || path.includes('/rates')) return 30_000;
  if (path.includes('/markets') || path.includes('/events')) return 20_000;
  return 15_000;
}

async function fetchRaw<T>(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<T> {
  const url = `${BASE}${resolvePath(path)}${queryString(params)}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'adjacent-raycast/0.1',
  };
  const key = apiKey();
  if (key) headers.Authorization = `Bearer ${key}`;

  const response = await fetch(url, { headers });
  const text = await response.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const message =
      (typeof payload.message === 'string' && payload.message) ||
      (typeof payload.error === 'string' && payload.error) ||
      `Adjacent API ${response.status} for ${path}`;
    throw new AdjacentError(
      message,
      response.status,
      typeof payload.upgrade_url === 'string' ? payload.upgrade_url : undefined,
      typeof payload.error === 'string' ? payload.error : undefined,
    );
  }

  return body as T;
}

function cacheKey(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  return `${hasApiKey() ? 'a' : 'p'}:${path}${queryString(params)}`;
}

async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<T> {
  return cached(cacheKey(path, params), ttlFor(path), () => fetchRaw<T>(path, params));
}

function emptyPage<T>(): Page<T> {
  return {
    data: [],
    meta: { total: 0, page: 1, per_page: 0, total_pages: 1, has_next: false, has_prev: false },
  };
}

function asPage<T>(value: Page<T> | T[] | undefined): Page<T> {
  if (!value) return emptyPage<T>();
  if (Array.isArray(value)) {
    return {
      data: value,
      meta: {
        total: value.length,
        page: 1,
        per_page: value.length,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
    };
  }
  return { data: value.data ?? [], meta: value.meta };
}

export type ListParams = {
  page?: number;
  per_page?: number;
  search?: string;
  platform?: string;
  category?: string;
  status?: string;
  sort_dir?: 'asc' | 'desc';
  include_closed?: boolean;
  include_resolved?: boolean;
  days?: number;
};

export async function listMarkets(params: ListParams = {}): Promise<Page<Market>> {
  return asPage(await apiGet<Page<Market>>('/markets', params));
}

export async function getMarket(id: string): Promise<Market> {
  return apiGet<Market>(`/markets/${encodeURIComponent(id)}`);
}

export async function listEvents(params: ListParams = {}): Promise<Page<Event>> {
  return asPage(await apiGet<Page<Event>>('/events', params));
}

export async function getEvent(id: string): Promise<Event> {
  try {
    return await apiGet<Event>(`/events/${encodeURIComponent(id)}`);
  } catch (error) {
    if (hasApiKey() || !(error instanceof AdjacentError) || error.status !== 404) throw error;
    const raw = id.includes(':') ? id.split(':')[1] : id;
    const page = await listMarkets({ search: raw, per_page: 50 });
    return {
      event_id: id,
      name: raw,
      markets: page.data,
      market_count: page.data.length,
    };
  }
}

export async function listIndices(params: ListParams = {}): Promise<Page<Index>> {
  return asPage(await apiGet<Page<Index>>('/indices', params));
}

export async function getIndex(id: string): Promise<Index> {
  return apiGet<Index>(`/indices/${encodeURIComponent(id)}`);
}

export async function listIndexConstituents(id: string): Promise<Page<Constituent>> {
  return asPage(await apiGet<Page<Constituent>>(`/indices/${encodeURIComponent(id)}/constituents`));
}

export async function listRates(params: ListParams = {}): Promise<Page<Rate>> {
  return asPage(await apiGet<Page<Rate>>('/rates', params));
}

export async function getRate(id: string): Promise<Rate> {
  return apiGet<Rate>(`/rates/${encodeURIComponent(id)}`);
}

export function newsId(article: Pick<NewsArticle, 'id' | 'article_id'>): string {
  return article.id || article.article_id || '';
}

function normalizeNews(article: NewsArticle): NewsArticle {
  return { ...article, id: newsId(article) };
}

function asNewsPage(value: Page<NewsArticle> | NewsArticle[] | undefined): Page<NewsArticle> {
  const page = asPage(value);
  return { ...page, data: page.data.map(normalizeNews).filter((row) => row.id) };
}

export async function listNews(params: ListParams = {}): Promise<Page<NewsArticle>> {
  return asNewsPage(await apiGet<Page<NewsArticle>>('/news/latest', params));
}

export async function getNews(id: string): Promise<NewsArticle> {
  return normalizeNews(await apiGet<NewsArticle>(`/news/${encodeURIComponent(id)}`));
}

function collectionPath(
  type: Exclude<PriceEntityType, 'event'>,
  id: string,
  suffix: string,
): string {
  const prefix = type === 'index' ? 'indices' : `${type}s`;
  return `/${prefix}/${encodeURIComponent(id)}${suffix}`;
}

export async function listRelatedNews(
  type: PriceEntityType,
  id: string,
  perPage = 20,
): Promise<Page<NewsArticle>> {
  if (type === 'event') return emptyPage();
  return asNewsPage(
    await apiGet<Page<NewsArticle>>(collectionPath(type, id, '/news'), {
      per_page: perPage,
    }),
  );
}

export async function listNewsMarkets(id: string): Promise<Page<Market>> {
  return asPage(await apiGet<Page<Market>>(`/news/${encodeURIComponent(id)}/markets`));
}

export type NewsTickerMap = {
  byId: Record<string, string[]>;
  byUrl: Record<string, string[]>;
};

const TICKER_KEY = 'ticker-map';
const TICKER_TTL = 10 * 60_000;

function addTicker(bag: Record<string, string[]>, key: string | undefined, ticker: string) {
  if (!key || !ticker) return;
  const cur = bag[key] ?? [];
  if (!cur.includes(ticker)) bag[key] = [...cur, ticker];
}

export function peekTickerMap(): NewsTickerMap | undefined {
  return peekCache<NewsTickerMap>(TICKER_KEY);
}

async function buildTickerMap(): Promise<NewsTickerMap> {
  const indices = await listIndices({ per_page: 100 });
  const byId: Record<string, string[]> = {};
  const byUrl: Record<string, string[]> = {};
  const settled = await mapPool(indices.data, 6, async (index) => {
    const page = await listRelatedNews('index', index.index_id, 25);
    return { ticker: index.ticker, rows: page.data };
  });
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    for (const article of result.value.rows) {
      addTicker(byId, newsId(article), result.value.ticker);
      addTicker(byUrl, article.url ?? undefined, result.value.ticker);
    }
  }
  return { byId, byUrl };
}

/** Index tickers stamped onto articles. Serves disk/memory immediately, refreshes in back. */
export async function newsTickerMap(): Promise<NewsTickerMap> {
  return cached(TICKER_KEY, TICKER_TTL, buildTickerMap);
}

export function tickersFor(
  article: Pick<NewsArticle, 'id' | 'article_id' | 'url' | 'tickers'>,
  map?: NewsTickerMap,
): string[] {
  if (article.tickers?.length) return article.tickers;
  if (!map) return [];
  return map.byId[newsId(article)] ?? (article.url ? map.byUrl[article.url] : undefined) ?? [];
}

const CATALOG = { indices: 100, rates: 100, events: 20, markets: 20 } as const;

async function fetchCatalogPages() {
  return Promise.allSettled([
    listIndices({ per_page: CATALOG.indices }),
    listRates({ per_page: CATALOG.rates }),
    listEvents({ per_page: CATALOG.events }),
    listMarkets({ per_page: CATALOG.markets }),
  ]);
}

function catalogHits(
  indices?: Page<Index>,
  rates?: Page<Rate>,
  events?: Page<Event>,
  markets?: Page<Market>,
): FindHit[] {
  return zipRounds(
    (indices?.data ?? []).map(indexToHit),
    (rates?.data ?? []).map(rateToHit),
    (events?.data ?? []).map(eventToHit),
    (markets?.data ?? []).map(marketToHit),
  );
}

export function warmCatalog(): void {
  void fetchCatalogPages().catch(() => undefined);
}

export function warmNews(): void {
  if (hasApiKey()) void newsTickerMap().catch(() => undefined);
}

export function peekIndices(): Index[] {
  return peekCache<Page<Index>>(cacheKey('/indices', { per_page: CATALOG.indices }))?.data ?? [];
}

export function peekRates(): Rate[] {
  return peekCache<Page<Rate>>(cacheKey('/rates', { per_page: CATALOG.rates }))?.data ?? [];
}

export function peekCatalog(): FindHit[] | undefined {
  const indices = peekCache<Page<Index>>(cacheKey('/indices', { per_page: CATALOG.indices }));
  const rates = peekCache<Page<Rate>>(cacheKey('/rates', { per_page: CATALOG.rates }));
  const events = peekCache<Page<Event>>(cacheKey('/events', { per_page: CATALOG.events }));
  const markets = peekCache<Page<Market>>(cacheKey('/markets', { per_page: CATALOG.markets }));
  if (!indices && !rates && !events && !markets) return undefined;
  return catalogHits(indices, rates, events, markets);
}

export function peekLatestNews(days: number): NewsArticle[] | undefined {
  const page = peekCache<Page<NewsArticle>>(
    cacheKey('/news/latest', { days, page: 1, per_page: 25 }),
  );
  return page ? asNewsPage(page).data : undefined;
}

export async function listPrices(
  type: Exclude<PriceEntityType, 'event'>,
  id: string,
  timeframe: Timeframe,
): Promise<Page<PricePoint>> {
  const query = timeframeQuery(timeframe, hasApiKey());
  return asPage(
    await apiGet<Page<PricePoint>>(collectionPath(type, id, '/prices'), {
      interval: query.interval,
      per_page: query.per_page,
      order: 'asc',
    }),
  );
}

export async function listEventMarketPrices(
  id: string,
  timeframe: Timeframe,
  maxMarkets = 10,
): Promise<Array<{ market: Market; points: PricePoint[] }>> {
  const event = await getEvent(id);
  const markets = (event.markets ?? []).slice(0, maxMarkets);
  const rows = await mapPool(markets, 4, async (market) => {
    try {
      const page = await listPrices('market', market.market_id, timeframe);
      return { market, points: page.data };
    } catch {
      return { market, points: [] as PricePoint[] };
    }
  });
  return markets.map((market, i) => {
    const row = rows[i];
    return row?.status === 'fulfilled' ? row.value : { market, points: [] as PricePoint[] };
  });
}

export async function listCandles(id: string, intervalMinutes = 60): Promise<Page<Candle>> {
  return asPage(
    await apiGet<Page<Candle>>(`/markets/${encodeURIComponent(id)}/candles`, {
      interval: intervalMinutes,
      per_page: 100,
    }),
  );
}

export async function listSimilar(id: string, minSimilarity = 0.38): Promise<Page<SimilarMarket>> {
  return asPage(
    await apiGet<Page<SimilarMarket>>(`/markets/${encodeURIComponent(id)}/similar`, {
      min_similarity: minSimilarity,
      per_page: 25,
    }),
  );
}

export async function listTrades(id: string): Promise<Page<Trade>> {
  return asPage(
    await apiGet<Page<Trade>>(`/markets/${encodeURIComponent(id)}/trades`, { per_page: 50 }),
  );
}

export async function listQuotes(id: string): Promise<Page<Quote>> {
  return asPage(
    await apiGet<Page<Quote>>(`/markets/${encodeURIComponent(id)}/quotes`, { per_page: 50 }),
  );
}

export async function getSnapshotMeta(): Promise<SnapshotMeta> {
  return apiGet<SnapshotMeta>('/public/meta');
}

export async function listPlans(): Promise<Page<PublicPlan>> {
  const raw = await apiGet<Page<PublicPlan> | PublicPlan[]>('/public/plans');
  return asPage(raw);
}

function matchesQuery(query: string, ...fields: Array<string | null | undefined>): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = fields.filter(Boolean).join(' ').toLowerCase();
  return tokens.every((token) => hay.includes(token));
}

function fieldScore(query: string, ...fields: Array<string | null | undefined>): number {
  const n = query.toLowerCase().trim();
  if (!n) return 0;
  let best = 0;
  for (const field of fields) {
    if (!field) continue;
    const v = field.toLowerCase();
    if (v === n) best = Math.max(best, 100);
    else if (v.startsWith(n)) best = Math.max(best, 80);
    else if (v.includes(n)) best = Math.max(best, 50);
  }
  if (best === 0 && matchesQuery(query, ...fields)) best = 30;
  return best;
}

const TYPE_TIE: Record<EntityType, number> = {
  index: 4,
  rate: 3,
  event: 2,
  news: 1,
  market: 0,
};

function hitScore(query: string, hit: FindHit): number {
  return fieldScore(query, hit.id, hit.name, hit.subtitle, hit.accessory) * 10 + TYPE_TIE[hit.type];
}

function marketToHit(market: Market): FindHit {
  const shown = displayPrice(market);
  return {
    type: 'market',
    id: market.market_id,
    name: marketTitle(market),
    subtitle: [market.platform, market.category].filter(Boolean).join(' · '),
    accessory: shown.value != null ? formatProb(shown.value) : undefined,
  };
}

function eventToHit(event: Event): FindHit {
  return {
    type: 'event',
    id: event.event_id,
    name: event.name,
    subtitle: [event.category, event.region].filter(Boolean).join(' · ') || undefined,
    accessory: event.market_count != null ? `${event.market_count} mkts` : undefined,
  };
}

function indexToHit(index: Index): FindHit {
  return {
    type: 'index',
    id: index.index_id,
    name: index.ticker,
    subtitle: index.name,
    accessory: index.latest_price != null ? formatLevel(index.latest_price) : undefined,
  };
}

function rateToHit(rate: Rate): FindHit {
  return {
    type: 'rate',
    id: rate.rate_id,
    name: rate.name,
    subtitle: rate.methodology ?? undefined,
    accessory: rate.latest_price != null ? formatProb(rate.latest_price) : undefined,
  };
}

function newsToHit(article: NewsArticle): FindHit {
  return {
    type: 'news',
    id: newsId(article),
    name: article.title,
    subtitle: article.source ?? undefined,
    accessory: formatWhen(article.published_date),
    url: article.url ?? undefined,
  };
}

function zipRounds(...groups: FindHit[][]): FindHit[] {
  const out: FindHit[] = [];
  const max = Math.max(0, ...groups.map((g) => g.length));
  for (let i = 0; i < max; i++) {
    for (const group of groups) {
      if (group[i]) out.push(group[i]);
    }
  }
  return out;
}

function settledHits<T>(
  result: PromiseSettledResult<Page<T>>,
  map: (row: T) => FindHit,
): FindHit[] {
  return result.status === 'fulfilled' ? result.value.data.map(map) : [];
}

/** Mixed catalog for an empty browse: index, rate, event, market interleaved. */
export async function listCatalog(): Promise<FindHit[]> {
  const [indices, rates, events, markets] = await fetchCatalogPages();
  return zipRounds(
    settledHits(indices, indexToHit),
    settledHits(rates, rateToHit),
    settledHits(events, eventToHit),
    settledHits(markets, marketToHit),
  );
}

export async function findEntities(
  query: string,
  type?: EntityType,
  limit = 8,
): Promise<FindHit[]> {
  const q = query.trim();
  if (!q) return [];
  const perPage = Math.min(Math.max(limit, 1), 25);

  const jobs: Array<Promise<FindHit[]>> = [];

  if (!type || type === 'market') {
    jobs.push(
      listMarkets({ search: q, per_page: perPage }).then((page) => page.data.map(marketToHit)),
    );
  }

  if (!type || type === 'event') {
    jobs.push(
      listEvents({ search: q, per_page: perPage }).then((page) => page.data.map(eventToHit)),
    );
  }

  if (!type || type === 'index') {
    jobs.push(
      listIndices({ per_page: 100 }).then((page) =>
        page.data
          .filter((index) =>
            matchesQuery(q, index.index_id, index.ticker, index.name, index.description),
          )
          .slice(0, perPage)
          .map(indexToHit),
      ),
    );
  }

  if (!type || type === 'rate') {
    jobs.push(
      listRates({ per_page: 100 }).then((page) =>
        page.data
          .filter((rate) => matchesQuery(q, rate.rate_id, rate.name, rate.methodology))
          .slice(0, perPage)
          .map(rateToHit),
      ),
    );
  }

  if (type === 'news' && hasApiKey()) {
    jobs.push(
      listNews({ per_page: 40, days: 14 }).then((page) =>
        page.data
          .filter((article) =>
            matchesQuery(q, article.title, article.source, article.author, article.id),
          )
          .slice(0, perPage)
          .map(newsToHit),
      ),
    );
  }

  const settled = await Promise.allSettled(jobs);
  const hits: FindHit[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') hits.push(...result.value);
  }
  hits.sort((a, b) => hitScore(q, b) - hitScore(q, a));
  return hits;
}

export async function resolveEntity(
  id: string,
): Promise<
  | { type: 'market'; data: Market }
  | { type: 'event'; data: Event }
  | { type: 'index'; data: Index }
  | { type: 'rate'; data: Rate }
  | { type: 'news'; data: NewsArticle }
> {
  const trimmed = id.trim();
  const attempts: Array<
    () => Promise<{ type: EntityType; data: Market | Event | Index | Rate | NewsArticle }>
  > = [];

  if (trimmed.includes(':')) {
    attempts.push(async () => ({ type: 'market', data: await getMarket(trimmed) }));
    attempts.push(async () => ({ type: 'event', data: await getEvent(trimmed) }));
  }
  attempts.push(async () => ({ type: 'index', data: await getIndex(trimmed) }));
  attempts.push(async () => ({ type: 'rate', data: await getRate(trimmed) }));
  if (hasApiKey()) {
    attempts.push(async () => ({ type: 'news', data: await getNews(trimmed) }));
    if (!trimmed.includes(':')) {
      attempts.push(async () => ({ type: 'market', data: await getMarket(trimmed) }));
      attempts.push(async () => ({ type: 'event', data: await getEvent(trimmed) }));
    }
  }

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return (await attempt()) as Awaited<ReturnType<typeof resolveEntity>>;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError instanceof AdjacentError) throw lastError;
  throw new AdjacentError(`Nothing found for ${trimmed}`, 404);
}
