/**
 * Currency registry — resolves what the user wrote after (or, for a glyph,
 * before) a number ("usd", "$", "баксов", "₸") to a lowercase ISO code, and
 * maps that code to its rate against the *base* currency.
 *
 * The rate is the multiplier applied to a foreign-currency amount to express
 * it in the base currency. With base = USD, `register("eur", 1.17)` means
 * "1 EUR = 1.17 USD", so `200 eur` evaluates to `234`.
 *
 * The registry has no opinion on where rates come from, when they were
 * fetched, or how stale they are — callers wire that up separately and pass
 * a fresh registry into `parseInput`.
 */
export interface CurrencyRegistry {
  /**
   * The lowercase ISO code `text` names (a glyph, code or alias from the
   * table below, or a code registered here), or undefined if it names none.
   * A resolved code may still have no rate.
   */
  resolve(text: string): string | undefined;
  /** Multiplier converting an amount in this currency to base currency. */
  rate(code: string): number | undefined;
  has(code: string): boolean;
  register(code: string, rateToBase: number): void;
}

// Lowercase ISO code → glyph and word spellings (matched case-insensitively).
// A glyph belongs to one currency only: "$" is USD, "¥" is JPY; CNY, CAD and
// the like are written by code. With no mass units here, "pound" is GBP.
// prettier-ignore
const CURRENCY_ALIASES: Record<string, readonly string[]> = {
  usd: ["$", "dollar", "dollars", "доллар", "доллара", "доллары", "долларов", "долларах",
        "бакс", "бакса", "баксы", "баксов", "баксах"],
  eur: ["€", "euro", "euros", "евро"],
  gbp: ["£", "pound", "pounds", "фунт", "фунта", "фунты", "фунтов", "фунтах"],
  jpy: ["¥", "yen", "иена", "иены", "иен", "иенах", "йена", "йены", "йен", "йенах"],
  kzt: ["₸", "tenge", "тенге", "теңге", "тг", "кзт"],
  rub: ["₽", "ruble", "rubles", "rouble", "рубль", "рубля", "рубли", "рублей", "рублях", "руб"],
  inr: ["₹", "rupee", "rupees", "рупия", "рупии", "рупий", "рупиях"],
  krw: ["₩", "won", "вона", "воны", "вон", "вонах"],
  try: ["₺", "lira", "лира", "лиры", "лир", "лире", "лиру", "лирой", "лирами", "лирах"],
  thb: ["฿", "baht", "бат", "бата", "баты", "батов", "батах"],
  cny: ["yuan", "rmb", "renminbi", "юань", "юаня", "юани", "юаней", "юанях"],
  chf: ["franc", "francs", "франк", "франка", "франки", "франков", "франках"],
  cad: [],
  aud: [],
  aed: ["dirham", "дирхам", "дирхама", "дирхамы", "дирхамов", "дирхамах"],
  brl: ["real", "reais", "реал", "реала", "реалы", "реалов", "реалах"],
  mxn: ["песо"],
  sgd: [],
  hkd: [],
  nok: [],
  sek: ["krona", "kronor", "крона", "кроны", "крон", "кронах"],
  pln: ["zł", "zloty", "злотый", "злотые", "злотых"],
  zar: ["rand", "ранд", "ранда", "ранды", "рандов", "рандах"],
  uzs: ["сум", "сума", "сумов", "сумах"],
  kgs: ["сом", "сома", "сомы", "сомов", "сомах"],
  tjs: ["somoni", "сомони"],
  gel: ["₾", "lari", "лари"],
  amd: ["֏", "dram", "драм", "драма", "драмы", "драмов", "драмах"],
  azn: ["₼", "manat", "манат", "маната", "манаты", "манатов", "манатах"],
  byn: [],
  mnt: ["₮", "tugrik", "тугрик", "тугрика", "тугрики", "тугриков", "тугриках"],
  dkk: [],
  czk: ["kč", "koruna"],
  huf: ["forint", "форинт", "форинта", "форинты", "форинтов", "форинтах"],
  nzd: [],
  ils: ["₪", "shekel", "shekels", "шекель", "шекеля", "шекели", "шекелей", "шекелях"],
  sar: ["riyal", "риял", "рияла", "риялы", "риялов", "риялах"],
  idr: ["rupiah"],
  myr: ["ringgit", "ринггит", "ринггита", "ринггиты", "ринггитов", "ринггитах"],
  vnd: ["₫", "dong", "донг", "донга", "донги", "донгов", "донгах"],
  php: ["₱"],
};

const CODE_BY_ALIAS = new Map<string, string>();
for (const [code, aliases] of Object.entries(CURRENCY_ALIASES)) {
  CODE_BY_ALIAS.set(code, code);
  for (const alias of aliases) CODE_BY_ALIAS.set(alias, code);
}

const toCode = (text: string) => {
  const lower = text.toLowerCase();
  return CODE_BY_ALIAS.get(lower) ?? lower;
};

const isUsableRate = (rate: unknown): rate is number =>
  typeof rate === "number" && Number.isFinite(rate) && rate > 0;

class DefaultCurrencyRegistry implements CurrencyRegistry {
  private readonly entries = new Map<string, number>();

  register(code: string, rateToBase: number): void {
    if (typeof code !== "string" || code.length === 0) {
      throw new Error("Currency code must be a non-empty string");
    }
    this.entries.set(toCode(code), rateToBase);
  }

  resolve(text: string): string | undefined {
    const lower = text.toLowerCase();
    return CODE_BY_ALIAS.get(lower) ?? (this.entries.has(lower) ? lower : undefined);
  }

  rate(code: string): number | undefined {
    return this.entries.get(toCode(code));
  }

  has(code: string): boolean {
    return this.entries.has(toCode(code));
  }
}

/** Rates are keyed by code, glyph or alias ("$" registers USD). */
export function createCurrencyRegistry(
  rates: Record<string, number> = {},
): CurrencyRegistry {
  const registry = new DefaultCurrencyRegistry();
  for (const [code, rate] of Object.entries(rates)) {
    registry.register(code, rate);
  }
  return registry;
}

/**
 * Registry for a budget kept in `base`. `rates` holds units of each currency
 * per one unit of a common reference (whichever one the provider uses), so
 * the rate to base is `rates[base] / rates[code]`. The base itself always
 * converts at 1, even without rates. Only currencies in the alias table are
 * taken from `rates`, so a provider code like "all" or "cup" can't turn a
 * stray word into a conversion.
 */
export function createBudgetCurrencyRegistry(
  base: string,
  rates: Record<string, number> | null | undefined,
): CurrencyRegistry {
  const registry = new DefaultCurrencyRegistry();
  const baseCode = base.toLowerCase();
  registry.register(baseCode, 1);

  const table = new Map(
    Object.entries(rates ?? {}).map(([code, rate]) => [code.toLowerCase(), rate]),
  );
  const baseRate = table.get(baseCode);
  if (!isUsableRate(baseRate)) return registry;

  for (const [code, rate] of table) {
    if (Object.hasOwn(CURRENCY_ALIASES, code) && isUsableRate(rate)) {
      registry.register(code, baseRate / rate);
    }
  }
  return registry;
}
