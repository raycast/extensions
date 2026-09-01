/** Сырой блок ответа MOEX ISS: колонки отдельно, строки — массивы значений. */
export interface IssBlock {
  columns: string[];
  data: unknown[][];
}

export type IssResponse = Record<string, IssBlock | undefined>;

export type Row = Record<string, unknown>;

/** Ссылка на бумагу из поиска — минимум, которого хватает списку. */
export interface BondRef {
  secid: string;
  shortname: string;
  isin: string | null;
  fullname: string | null;
  emitent: string | null;
  /** primary_boardid — режим торгов, с которого берём цену. */
  boardid: string | null;
  type: string | null;
}

/** Откуда взято показанное число. */
export type PriceSource = "last" | "market" | "prev" | "history" | "none";

export interface PricePick {
  value: number | null;
  source: PriceSource;
  /** Человеческая подпись: «сделка 18:53», «закрытие 28.08.2026». */
  label: string | null;
}

/** Чего достаточно, чтобы запросить котировку: код бумаги и её основной режим торгов. */
export interface QuoteRef {
  secid: string;
  boardid: string | null;
}

export interface Quote {
  secid: string;
  boardid: string | null;
  price: PricePick;
  /** LASTTOPREVPRICE — изменение к предыдущему закрытию, % */
  changePct: number | null;
  yieldPct: number | null;
  yieldToOffer: number | null;
  /** Дюрация в днях. */
  durationDays: number | null;
  /** Нужна списку, чтобы у бумаг с погашением на днях показать срок вместо годовых. */
  matDate: string | null;
}

/** Полная карточка: справочные поля + рыночные. */
export interface BondDetail extends Quote {
  shortname: string;
  fullname: string | null;
  isin: string | null;
  boardName: string | null;
  faceValue: number | null;
  faceUnit: string | null;
  currentFaceValue: number | null;
  couponPercent: number | null;
  couponValue: number | null;
  couponPeriod: number | null;
  nextCoupon: string | null;
  accruedInt: number | null;
  matDate: string | null;
  offerDate: string | null;
  putOptionDate: string | null;
  callOptionDate: string | null;
  buybackDate: string | null;
  listLevel: number | null;
  issueSizePlaced: number | null;
  bondType: string | null;
  bondSubtype: string | null;
  lotSize: number | null;
  status: string | null;
}

export interface Coupon {
  date: string | null;
  value: number | null;
  percent: number | null;
  faceUnit: string | null;
}

export interface Offer {
  date: string | null;
  price: number | null;
  type: string | null;
}

export interface Amortization {
  date: string | null;
  percent: number | null;
  value: number | null;
  faceUnit: string | null;
  /** Номинал при размещении — у амортизируемых он больше текущего. */
  initialFaceValue: number | null;
}

export interface Bondization {
  coupons: Coupon[];
  offers: Offer[];
  amortizations: Amortization[];
}

export interface FavoriteItem {
  secid: string;
  shortname: string;
  boardid: string | null;
}
