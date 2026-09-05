import {
  Amortization,
  BondDetail,
  BondRef,
  Bondization,
  Coupon,
  IssBlock,
  IssResponse,
  Offer,
  PricePick,
  Quote,
  QuoteRef,
  QuotesResult,
  Row,
} from "./types";
import { parseIsoDate, todayMsk } from "./format";

const ISS_BASE = "https://iss.moex.com/iss";
const TIMEOUT_MS = 10_000;
/** Батч котировок режем на куски: длина URL у ISS не резиновая. */
const QUOTE_CHUNK = 30;

export class IssError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IssError";
  }
}

type Params = Record<string, string | number | undefined>;

export async function issFetch(path: string, params: Params, signal?: AbortSignal): Promise<IssResponse> {
  const url = new URL(`${ISS_BASE}${path}`);
  url.searchParams.set("iss.meta", "off");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(url, { signal: combined, headers: { "User-Agent": "raycast-moex-bonds" } });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new IssError("MOEX не ответил за 10 секунд");
    }
    throw new IssError("Нет связи с MOEX ISS");
  }

  if (!response.ok) throw new IssError(`MOEX ISS ответил ${response.status}`);
  return (await response.json()) as IssResponse;
}

/** «Колонки + массив массивов» → обычные объекты. */
export function toRows(block: IssBlock | undefined): Row[] {
  if (!block || !Array.isArray(block.columns) || !Array.isArray(block.data)) return [];
  return block.data.map((values) => {
    const row: Row = {};
    block.columns.forEach((column, index) => {
      row[column] = values[index] ?? null;
    });
    return row;
  });
}

export function num(row: Row | undefined, key: string): number | null {
  const value = row?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Ноль у доходности и дюрации означает «данных нет», а не «ноль процентов». */
function positive(row: Row | undefined, key: string): number | null {
  const value = num(row, key);
  return value === null || value === 0 ? null : value;
}

export function str(row: Row | undefined, key: string): string | null {
  const value = row?.[key];
  if (typeof value === "string" && value.trim() !== "") return value;
  if (typeof value === "number") return String(value);
  return null;
}

function hasAnyPrice(row: Row): boolean {
  return num(row, "LAST") !== null || num(row, "MARKETPRICE") !== null || num(row, "PREVPRICE") !== null;
}

/**
 * Одна бумага торгуется на нескольких режимах, и у чужого режима цена бывает пустой
 * (RU000A105RH2: TQCB с ценой и TQOD без). Выбор режима — здесь и только здесь.
 */
export function selectMarketRow<T extends Row>(rows: T[], preferredBoard?: string | null): T | undefined {
  if (rows.length === 0) return undefined;
  if (preferredBoard) {
    const preferred = rows.find((row) => row.BOARDID === preferredBoard);
    if (preferred && hasAnyPrice(preferred)) return preferred;
  }
  return (
    rows.find((row) => num(row, "LAST") !== null) ??
    rows.find((row) => num(row, "MARKETPRICE") !== null) ??
    rows.find((row) => num(row, "PREVPRICE") !== null) ??
    rows[0]
  );
}

/** Одна цена по чёткому приоритету + подпись, откуда она взята. */
export function pickPrice(security: Row | undefined, market: Row | undefined): PricePick {
  const last = num(market, "LAST");
  if (last !== null) {
    const time = str(market, "UPDATETIME");
    return { value: last, source: "last", label: time ? `сделка ${time.slice(0, 5)}` : "последняя сделка" };
  }

  const marketPrice = num(market, "MARKETPRICE");
  if (marketPrice !== null) {
    const time = str(market, "UPDATETIME");
    return { value: marketPrice, source: "market", label: time ? `рыночная ${time.slice(0, 5)}` : "рыночная цена" };
  }

  const prev = num(security, "PREVPRICE");
  if (prev !== null) {
    const prevDate = str(security, "PREVDATE");
    return {
      value: prev,
      source: "prev",
      label: prevDate ? `закрытие ${fmtShortDate(prevDate)}` : "предыдущее закрытие",
    };
  }

  return { value: null, source: "none", label: null };
}

function fmtShortDate(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return iso;
  const [y, m, d] = parsed;
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

function pickYield(security: Row | undefined, market: Row | undefined): number | null {
  return positive(market, "YIELD") ?? positive(market, "YIELDATWAPRICE") ?? positive(security, "YIELDATPREVWAPRICE");
}

function buildQuote(security: Row | undefined, market: Row | undefined, secid: string): Quote {
  return {
    secid,
    boardid: str(market, "BOARDID") ?? str(security, "BOARDID"),
    price: pickPrice(security, market),
    changePct: num(market, "LASTTOPREVPRICE"),
    yieldPct: pickYield(security, market),
    yieldToOffer: positive(market, "YIELDTOOFFER"),
    durationDays: positive(market, "DURATION"),
    matDate: str(security, "MATDATE"),
  };
}

// ───────────────────────── поиск ─────────────────────────

const SEARCH_COLUMNS = "secid,shortname,isin,name,emitent_title,primary_boardid,type,is_traded";

export async function searchBonds(query: string, signal?: AbortSignal): Promise<BondRef[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const response = await issFetch(
    "/securities.json",
    {
      q: trimmed,
      engine: "stock",
      market: "bonds",
      is_trading: 1,
      limit: 50,
      "securities.columns": SEARCH_COLUMNS,
    },
    signal,
  );

  const seen = new Set<string>();
  const refs: BondRef[] = [];
  for (const row of toRows(response.securities)) {
    if (num(row, "is_traded") !== 1) continue;
    const secid = str(row, "secid");
    if (!secid || seen.has(secid)) continue;
    seen.add(secid);
    refs.push({
      secid,
      shortname: str(row, "shortname") ?? secid,
      isin: str(row, "isin"),
      fullname: str(row, "name"),
      emitent: str(row, "emitent_title"),
      boardid: str(row, "primary_boardid"),
      type: str(row, "type"),
    });
  }

  return sortByRelevance(refs, trimmed);
}

export function sortByRelevance(refs: BondRef[], query: string): BondRef[] {
  const needle = query.trim().toLowerCase();
  const rank = (ref: BondRef): number => {
    const secid = ref.secid.toLowerCase();
    const isin = (ref.isin ?? "").toLowerCase();
    const shortname = ref.shortname.toLowerCase();
    if (secid === needle || isin === needle) return 0;
    if (secid.startsWith(needle) || shortname.startsWith(needle)) return 1;
    if (shortname.includes(needle)) return 2;
    return 3;
  };
  return [...refs].sort((a, b) => rank(a) - rank(b) || a.shortname.localeCompare(b.shortname, "ru"));
}

// ───────────────────────── котировки списком ─────────────────────────

const QUOTE_SEC_COLUMNS = "SECID,BOARDID,PREVPRICE,PREVDATE,YIELDATPREVWAPRICE,MATDATE";
const QUOTE_MD_COLUMNS =
  "SECID,BOARDID,LAST,MARKETPRICE,LASTTOPREVPRICE,YIELD,YIELDATWAPRICE,YIELDTOOFFER,DURATION,UPDATETIME";

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Цены пачкой для списка. Один упавший кусок не должен обнулять весь список —
 * поэтому allSettled и частичный результат.
 */
export async function fetchQuotes(refs: QuoteRef[], signal?: AbortSignal): Promise<QuotesResult> {
  const quotes = new Map<string, Quote>();
  const failed = new Set<string>();
  if (refs.length === 0) return { quotes, failed };

  const preferredBoards = new Map(refs.map((ref) => [ref.secid, ref.boardid ?? null]));
  const parts = chunk(
    refs.map((ref) => ref.secid),
    QUOTE_CHUNK,
  );

  const results = await Promise.allSettled(
    parts.map((part) =>
      issFetch(
        "/engines/stock/markets/bonds/securities.json",
        {
          securities: part.join(","),
          "iss.only": "securities,marketdata",
          "securities.columns": QUOTE_SEC_COLUMNS,
          "marketdata.columns": QUOTE_MD_COLUMNS,
        },
        signal,
      ),
    ),
  );

  // Частичный отказ переживаем, полный — нет: иначе недоступный MOEX выглядит как
  // успешно загруженный список из одних прочерков, и пользователь не увидит «Повторить».
  const rejected = results.filter((result) => result.status === "rejected");
  if (rejected.length > 0 && rejected.length === results.length) {
    throw (rejected[0] as PromiseRejectedResult).reason;
  }

  results.forEach((result, index) => {
    if (result.status !== "fulfilled") {
      // Помечаем поимённо: прочерк «нет сделок» и «данные не доехали» — разные вещи.
      for (const secid of parts[index]) failed.add(secid);
      return;
    }
    const securities = groupBySecid(toRows(result.value.securities));
    const marketdata = groupBySecid(toRows(result.value.marketdata));
    for (const [secid, secRows] of securities) {
      const { security, market } = alignBoards(secRows, marketdata.get(secid) ?? [], preferredBoards.get(secid));
      quotes.set(secid, buildQuote(security, market, secid));
    }
  });

  return { quotes, failed };
}

/**
 * Режим торгов выбираем по блоку marketdata — только там есть сделки и цены.
 * Обратный порядок обманывает: у ОФЗ в справочном блоке первым идёт служебный SPOB
 * («Поставка по ОФЗ»), и доходность по нему бессмысленная (−3 %, 28 %).
 */
export function alignBoards(
  secRows: Row[],
  mdRows: Row[],
  preferredBoard?: string | null,
): { security: Row | undefined; market: Row | undefined } {
  const market = selectMarketRow(mdRows, preferredBoard);
  const board = str(market, "BOARDID") ?? preferredBoard ?? null;
  const security =
    (board ? secRows.find((row) => str(row, "BOARDID") === board) : undefined) ??
    selectMarketRow(secRows, preferredBoard);
  return { security, market };
}

function groupBySecid(rows: Row[]): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const secid = str(row, "SECID");
    if (!secid) continue;
    const bucket = grouped.get(secid);
    if (bucket) bucket.push(row);
    else grouped.set(secid, [row]);
  }
  return grouped;
}

// ───────────────────────── карточка ─────────────────────────

export async function fetchBond(
  secid: string,
  preferredBoard?: string | null,
  signal?: AbortSignal,
): Promise<BondDetail> {
  const response = await issFetch(
    `/engines/stock/markets/bonds/securities/${encodeURIComponent(secid)}.json`,
    { "iss.only": "securities,marketdata" },
    signal,
  );

  const securities = toRows(response.securities);
  if (securities.length === 0) throw new IssError(`MOEX не знает бумагу ${secid}`);

  const { security, market } = alignBoards(securities, toRows(response.marketdata), preferredBoard);
  const board = str(market, "BOARDID") ?? str(security, "BOARDID");
  const quote = buildQuote(security, market, secid);

  if (quote.price.value === null) {
    const fallback = await fetchLastHistory(secid, board, signal);
    if (fallback) {
      quote.price = { value: fallback.close, source: "history", label: `закрытие ${fmtShortDate(fallback.date)}` };
      quote.yieldPct = quote.yieldPct ?? fallback.yieldClose;
    }
  }

  return {
    ...quote,
    shortname: str(security, "SHORTNAME") ?? secid,
    fullname: str(security, "SECNAME"),
    isin: str(security, "ISIN"),
    boardName: str(security, "BOARDNAME"),
    faceValue: num(security, "FACEVALUE"),
    faceUnit: str(security, "FACEUNIT"),
    currentFaceValue: num(security, "FACEVALUEONSETTLEDATE"),
    // Ноль здесь — «ставка следующего периода ещё не объявлена» (флоатеры, бумаги с офертой),
    // а не «купон нулевой»; у дисконтных выпусков про это говорит BONDTYPE.
    couponPercent: positive(security, "COUPONPERCENT"),
    couponValue: positive(security, "COUPONVALUE"),
    couponPeriod: num(security, "COUPONPERIOD"),
    nextCoupon: str(security, "NEXTCOUPON"),
    accruedInt: num(security, "ACCRUEDINT"),
    matDate: str(security, "MATDATE"),
    offerDate: str(security, "OFFERDATE"),
    putOptionDate: str(security, "PUTOPTIONDATE"),
    callOptionDate: str(security, "CALLOPTIONDATE"),
    buybackDate: str(security, "BUYBACKDATE"),
    listLevel: num(security, "LISTLEVEL"),
    issueSizePlaced: num(security, "ISSUESIZEPLACED") ?? num(security, "ISSUESIZE"),
    bondType: str(security, "BONDTYPE"),
    bondSubtype: str(security, "BONDSUBTYPE"),
    lotSize: num(security, "LOTSIZE"),
    status: str(security, "STATUS"),
  };
}

/**
 * Крайний случай: рыночных данных нет вообще. Берём последний день со сделками —
 * одного дня мало, у неликвида бывают пустые дни подряд.
 */
export async function fetchLastHistory(
  secid: string,
  boardid: string | null,
  signal?: AbortSignal,
): Promise<{ date: string; close: number; yieldClose: number | null } | null> {
  const response = await issFetch(
    `/history/engines/stock/markets/bonds/securities/${encodeURIComponent(secid)}.json`,
    {
      "iss.only": "history",
      sort_order: "desc",
      limit: 20,
      "history.columns": "TRADEDATE,BOARDID,CLOSE,LEGALCLOSEPRICE,YIELDCLOSE",
    },
    signal,
  );

  const rows = toRows(response.history);
  const sameBoard = boardid ? rows.filter((row) => str(row, "BOARDID") === boardid) : [];
  const candidates = sameBoard.length > 0 ? sameBoard : rows;

  for (const row of candidates) {
    const close = num(row, "CLOSE") ?? num(row, "LEGALCLOSEPRICE");
    const date = str(row, "TRADEDATE");
    if (close !== null && date) {
      return { date, close, yieldClose: positive(row, "YIELDCLOSE") };
    }
  }
  return null;
}

// ───────────────────────── купоны, оферты, амортизация ─────────────────────────

export async function fetchBondization(secid: string, signal?: AbortSignal): Promise<Bondization> {
  const response = await issFetch(
    `/securities/${encodeURIComponent(secid)}/bondization.json`,
    { limit: "unlimited" },
    signal,
  );

  const coupons: Coupon[] = toRows(response.coupons).map((row) => ({
    date: str(row, "coupondate"),
    value: num(row, "value"),
    percent: num(row, "valueprc"),
    faceUnit: str(row, "faceunit"),
  }));

  const offers: Offer[] = toRows(response.offers).map((row) => ({
    date: str(row, "offerdate"),
    price: num(row, "price"),
    type: str(row, "offertype"),
  }));

  const amortizations: Amortization[] = toRows(response.amortizations).map((row) => ({
    date: str(row, "amortdate"),
    percent: num(row, "valueprc"),
    value: num(row, "value"),
    faceUnit: str(row, "faceunit"),
    initialFaceValue: num(row, "initialfacevalue"),
  }));

  return { coupons, offers, amortizations };
}

/** Ближайшие выплаты: только будущие (по московской дате), не больше limit. */
export function upcomingCoupons(coupons: Coupon[], limit = 5): Coupon[] {
  const today = todayMsk();
  return coupons
    .filter((coupon) => coupon.date !== null && coupon.date >= today)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
    .slice(0, limit);
}

export function nextOffer(offers: Offer[]): Offer | null {
  const today = todayMsk();
  const future = offers
    .filter((offer) => offer.date !== null && offer.date >= today)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  return future[0] ?? null;
}

/** Погашение — тоже строка амортизации, поэтому «есть амортизация» = больше одной выплаты тела. */
/**
 * Годовая доходность на горизонте в считаные дни — арифметически верное, но обманчивое число:
 * у бумаги с погашением завтра и ценой 99,65 MOEX честно показывает 306 % годовых.
 */
export const SHORT_HORIZON_DAYS = 30;

export function isYieldMisleading(durationDays: number | null, yieldPct: number | null): boolean {
  return durationDays !== null && durationDays <= SHORT_HORIZON_DAYS && yieldPct !== null;
}

export function hasAmortization(amortizations: Amortization[]): boolean {
  return amortizations.length > 1;
}

/** Номинал при размещении: у амортизируемых бумаг он выше текущего. */
export function initialFaceValue(amortizations: Amortization[]): number | null {
  for (const item of amortizations) {
    if (item.initialFaceValue !== null) return item.initialFaceValue;
  }
  return null;
}

/** Для таблицы показываем оставшиеся выплаты тела; если все позади — последние из прошлых. */
export function remainingAmortizations(amortizations: Amortization[]): Amortization[] {
  const today = todayMsk();
  const sorted = [...amortizations].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const future = sorted.filter((item) => (item.date ?? "") >= today);
  return future.length > 0 ? future : sorted.slice(-3);
}

// ───────────────────────── внешние ссылки ─────────────────────────

const SAFE_CODE = /^[A-Z0-9]+$/;

export function moexUrl(secid: string, boardid: string | null): string | null {
  if (!SAFE_CODE.test(secid)) return null;
  const board = boardid && SAFE_CODE.test(boardid) ? `board=${encodeURIComponent(boardid)}&` : "";
  return `https://www.moex.com/ru/issue.aspx?${board}code=${encodeURIComponent(secid)}`;
}

export function smartLabUrl(secid: string): string | null {
  if (!SAFE_CODE.test(secid)) return null;
  return `https://smart-lab.ru/q/bonds/${encodeURIComponent(secid)}/`;
}
