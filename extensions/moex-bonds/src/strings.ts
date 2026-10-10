import { Formatter, Language } from "./format";
import { IssError } from "./moex";
import { PricePick } from "./types";

/**
 * Вся текстовая поверхность расширения. По умолчанию английский — этого требует Store;
 * русский включается в настройках расширения, потому что рынок и терминология русские.
 * Названия эмитентов и типов выпуска сюда не входят: они приходят из MOEX как есть.
 */
export interface Strings {
  searchPlaceholder: string;
  found: (count: number) => string;
  favorites: string;

  emptyOffline: string;
  emptyStartTitle: string;
  emptyFavoritesTitle: string;
  emptyStartHint: string;
  emptyTooShort: string;
  emptyNotFound: string;
  emptyNotFoundHint: string;

  openCard: string;
  addToFavorites: string;
  removeFromFavorites: string;
  addedToFavorites: string;
  removedFromFavorites: string;
  refreshQuotes: string;
  refresh: string;
  retry: string;
  copySection: string;
  copySecid: string;
  copyCard: string;
  openSection: string;
  openOnMoex: string;
  openOnSmartLab: string;

  ytm: string;
  ytmTooltip: string;
  maturesIn: (until: string) => string;
  maturesSoon: string;
  misleadingYieldTooltip: (pct: string) => string;
  noQuoteData: string;
  noQuoteDataTooltip: string;
  noTrades: string;

  loading: string;
  loadFailedTitle: string;
  loadFailedHint: string;

  yieldToMaturity: string;
  yieldToOffer: string;
  duration: string;
  accruedInterest: string;
  coupon: string;
  frequency: string;
  nextCoupon: string;
  maturity: string;
  offer: string;
  offerOf: (type: string) => string;
  amortization: string;
  amortizationYes: string;
  amortizationNo: string;
  faceValue: string;
  atIssue: (value: string) => string;
  outstanding: string;
  pieces: string;
  issueType: string;
  issuer: string;
  isin: string;
  securityCode: string;
  board: string;
  listing: string;

  noPrice: string;
  perDay: string;
  yieldWord: string;
  upcomingCoupons: string;
  colDate: string;
  colPayment: string;
  colWhen: string;
  colShare: string;
  colAmount: string;
  rateNotAnnounced: string;
  amortizationPaid: (paid: number, total: number) => string;
  noMarketDataNote: string;
  shortHorizonNote: (until: string) => string;
  price: string;
  sourceLine: (stamp: string) => string;
  priceFromTrade: (time: string | null) => string;
  priceFromMarket: (time: string | null) => string;
  priceFromClose: (date: string) => string;
  priceFromPrevClose: string;

  errorTimeout: string;
  errorOffline: string;
  errorStatus: (status: number) => string;
  errorUnknownBond: (secid: string) => string;
}

const EN: Strings = {
  searchPlaceholder: "Name, ticker or ISIN — e.g. Sberbank, 26238, RU000A10CB66",
  found: (count) => `Found: ${count}`,
  favorites: "Favorites",

  emptyOffline: "MOEX is not responding",
  emptyStartTitle: "Start typing a name",
  emptyFavoritesTitle: "No favorites yet",
  emptyStartHint: "Part of a name, an issue number (26238) or an ISIN (RU000A10CB66) all work.",
  emptyTooShort: "Type at least 2 characters",
  emptyNotFound: "Nothing found",
  emptyNotFoundHint: "Try a ticker, an ISIN or the issuer name. Only currently traded issues are shown.",

  openCard: "Open Bond Card",
  addToFavorites: "Add to Favorites",
  removeFromFavorites: "Remove from Favorites",
  addedToFavorites: "Added to favorites",
  removedFromFavorites: "Removed from favorites",
  refreshQuotes: "Refresh Quotes",
  refresh: "Refresh",
  retry: "Retry",
  copySection: "Copy",
  copySecid: "Security Code",
  copyCard: "Card as Text",
  openSection: "Open",
  openOnMoex: "On MOEX",
  openOnSmartLab: "On Smart-Lab",

  ytm: "YTM",
  ytmTooltip: "Yield to maturity",
  maturesIn: (until) => `matures ${until}`,
  maturesSoon: "matures soon",
  misleadingYieldTooltip: (pct) => `Annualised yield ${pct} — meaningless over a horizon this short`,
  noQuoteData: "no data",
  noQuoteDataTooltip: "Quotes failed to load. Press ⌘R to refresh",
  noTrades: "no trades",

  loading: "Loading data from MOEX…",
  loadFailedTitle: "Could not load the bond",
  loadFailedHint: "MOEX ISS may be down, or the connection dropped.",

  yieldToMaturity: "Yield to maturity",
  yieldToOffer: "Yield to offer",
  duration: "Duration",
  accruedInterest: "Accrued interest",
  coupon: "Coupon",
  frequency: "Frequency",
  nextCoupon: "Next coupon",
  maturity: "Maturity",
  offer: "Offer",
  offerOf: (type) => `Offer (${type})`,
  amortization: "Amortization",
  amortizationYes: "yes",
  amortizationNo: "no, repaid at once",
  faceValue: "Face value",
  atIssue: (value) => `(${value} at issue)`,
  outstanding: "Outstanding",
  pieces: "pcs",
  issueType: "Issue type",
  issuer: "Issuer",
  isin: "ISIN",
  securityCode: "Security code",
  board: "Board",
  listing: "Listing",

  noPrice: "No price",
  perDay: "today",
  yieldWord: "yield",
  upcomingCoupons: "Upcoming coupons",
  colDate: "Date",
  colPayment: "Payment",
  colWhen: "When",
  colShare: "Share of face value",
  colAmount: "Amount",
  rateNotAnnounced: "rate not announced yet",
  amortizationPaid: (paid, total) => `${paid} of ${total} principal instalments already paid.`,
  noMarketDataNote: "> No market data for this bond — most likely it has not traded in a long time.",
  shortHorizonNote: (until) =>
    `\n> Matures ${until}. Over a horizon this short the annualised yield means little: MOEX annualises a few kopecks of difference from par. Look at the price, not the percentage.`,
  price: "Price",
  sourceLine: (stamp) => `MOEX ISS data, ${stamp}`,
  priceFromTrade: (time) => (time ? `trade at ${time}` : "last trade"),
  priceFromMarket: (time) => (time ? `market price at ${time}` : "market price"),
  priceFromClose: (date) => `close of ${date}`,
  priceFromPrevClose: "previous close",

  errorTimeout: "MOEX did not respond within 10 seconds",
  errorOffline: "No connection to MOEX ISS",
  errorStatus: (status) => `MOEX ISS returned ${status}`,
  errorUnknownBond: (secid) => `MOEX does not know the security ${secid}`,
};

const RU: Strings = {
  searchPlaceholder: "Название, тикер или ISIN — например «сегежа», «26238», RU000A10CB66",
  found: (count) => `Найдено: ${count}`,
  favorites: "Избранное",

  emptyOffline: "MOEX не отвечает",
  emptyStartTitle: "Начните вводить название",
  emptyFavoritesTitle: "Избранное пусто",
  emptyStartHint: "Подойдёт часть названия («сегежа»), номер выпуска («26238») или ISIN (RU000A10CB66).",
  emptyTooShort: "Нужно минимум 2 символа",
  emptyNotFound: "Ничего не нашлось",
  emptyNotFoundHint: "Попробуйте тикер, ISIN или имя эмитента. Показываются только торгующиеся выпуски.",

  openCard: "Открыть карточку",
  addToFavorites: "В избранное",
  removeFromFavorites: "Убрать из избранного",
  addedToFavorites: "Добавлено в избранное",
  removedFromFavorites: "Убрано из избранного",
  refreshQuotes: "Обновить котировки",
  refresh: "Обновить",
  retry: "Повторить",
  copySection: "Скопировать",
  copySecid: "Код бумаги",
  copyCard: "Карточку текстом",
  openSection: "Открыть",
  openOnMoex: "На MOEX",
  openOnSmartLab: "На Smart-Lab",

  ytm: "YTM",
  ytmTooltip: "Доходность к погашению",
  maturesIn: (until) => `гасится ${until}`,
  maturesSoon: "скоро гасится",
  misleadingYieldTooltip: (pct) => `Годовая доходность ${pct} — на таком горизонте число условное`,
  noQuoteData: "нет данных",
  noQuoteDataTooltip: "Котировки не загрузились. ⌘R — обновить",
  noTrades: "нет сделок",

  loading: "Загружаю данные MOEX…",
  loadFailedTitle: "Не получилось загрузить",
  loadFailedHint: "MOEX ISS мог не ответить или пропал интернет.",

  yieldToMaturity: "Доходность к погашению",
  yieldToOffer: "Доходность к оферте",
  duration: "Дюрация",
  accruedInterest: "НКД",
  coupon: "Купон",
  frequency: "Периодичность",
  nextCoupon: "Ближайший купон",
  maturity: "Погашение",
  offer: "Оферта",
  offerOf: (type) => `Оферта (${type})`,
  amortization: "Амортизация",
  amortizationYes: "есть",
  amortizationNo: "нет, погашение разом",
  faceValue: "Номинал",
  atIssue: (value) => `(при выпуске ${value})`,
  outstanding: "В обращении",
  pieces: "шт.",
  issueType: "Тип выпуска",
  issuer: "Эмитент",
  isin: "ISIN",
  securityCode: "Код бумаги",
  board: "Режим торгов",
  listing: "Листинг",

  noPrice: "Цены нет",
  perDay: "за день",
  yieldWord: "доходность",
  upcomingCoupons: "Ближайшие купоны",
  colDate: "Дата",
  colPayment: "Выплата",
  colWhen: "Когда",
  colShare: "Доля номинала",
  colAmount: "Сумма",
  rateNotAnnounced: "ставка ещё не объявлена",
  amortizationPaid: (paid, total) => `Уже выплачено ${paid} из ${total} частей номинала.`,
  noMarketDataNote: "> Рыночных данных по бумаге нет — вероятно, по ней давно не было сделок.",
  shortHorizonNote: (until) =>
    `\n> Погашение ${until}. На таком горизонте годовая доходность — число условное: MOEX пересчитывает в годовые копеечную разницу с номиналом. Смотрите на саму цену, а не на процент.`,
  price: "Цена",
  sourceLine: (stamp) => `Данные MOEX ISS, ${stamp}`,
  priceFromTrade: (time) => (time ? `сделка ${time}` : "последняя сделка"),
  priceFromMarket: (time) => (time ? `рыночная ${time}` : "рыночная цена"),
  priceFromClose: (date) => `закрытие ${date}`,
  priceFromPrevClose: "предыдущее закрытие",

  errorTimeout: "MOEX не ответил за 10 секунд",
  errorOffline: "Нет связи с MOEX ISS",
  errorStatus: (status) => `MOEX ISS ответил ${status}`,
  errorUnknownBond: (secid) => `MOEX не знает бумагу ${secid}`,
};

export function strings(language: Language): Strings {
  return language === "ru" ? RU : EN;
}

/** Ошибку клиента показываем пользователю на его языке, а не английским текстом из логов. */
export function describeError(error: unknown, t: Strings): string {
  if (error instanceof IssError) {
    switch (error.kind) {
      case "timeout":
        return t.errorTimeout;
      case "offline":
        return t.errorOffline;
      case "status":
        return t.errorStatus(error.status ?? 0);
      case "unknown-bond":
        return t.errorUnknownBond(error.secid ?? "");
    }
  }
  return error instanceof Error ? error.message : String(error);
}

/** Подпись под ценой: откуда взято показанное число. */
export function priceLabel(price: PricePick, fmt: Formatter, t: Strings): string | null {
  switch (price.source) {
    case "last":
      return t.priceFromTrade(price.stamp);
    case "market":
      return t.priceFromMarket(price.stamp);
    case "prev":
    case "history":
      return price.stamp ? t.priceFromClose(fmt.date(price.stamp)) : t.priceFromPrevClose;
    case "none":
      return null;
  }
}
