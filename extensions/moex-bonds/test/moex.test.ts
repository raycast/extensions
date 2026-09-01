import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import {
  alignBoards,
  fetchQuotes,
  hasAmortization,
  isYieldMisleading,
  issFetch,
  moexUrl,
  num,
  nextOffer,
  pickPrice,
  selectMarketRow,
  smartLabUrl,
  sortByRelevance,
  str,
  toRows,
  upcomingCoupons,
} from "../src/moex";
import type { BondRef, Coupon, IssResponse, Offer } from "../src/types";

// Тесты запускаются из корня репозитория (npm run test), сборка лежит в .test-build.
const FIXTURES = join(process.cwd(), "test", "fixtures");

function fixture(name: string): IssResponse {
  return JSON.parse(readFileSync(join(FIXTURES, name), "utf8")) as IssResponse;
}

test("toRows превращает колонки ISS в объекты", () => {
  const rows = toRows({
    columns: ["A", "B"],
    data: [
      [1, "x"],
      [2, null],
    ],
  });
  assert.deepEqual(rows, [
    { A: 1, B: "x" },
    { A: 2, B: null },
  ]);
});

test("toRows переживает пустой и битый блок", () => {
  assert.deepEqual(toRows(undefined), []);
  assert.deepEqual(toRows({ columns: ["A"], data: [] }), []);
});

test("selectMarketRow берёт режим со сделками, а не первый попавшийся", () => {
  // У замещающей RU000A105RH2 два режима: TQCB (есть LAST) и TQOD (только MARKETPRICE).
  const rows = toRows(fixture("RU000A105RH2.security.json").marketdata);
  assert.equal(rows.length, 2);
  assert.equal(str(rows[1], "BOARDID"), "TQOD");

  // Без подсказки — тот режим, где реально прошла сделка.
  assert.equal(str(selectMarketRow(rows), "BOARDID"), "TQCB");
  // primary_boardid из поиска уважаем.
  assert.equal(str(selectMarketRow(rows, "TQCB"), "BOARDID"), "TQCB");
  // Несуществующий режим не должен ронять выбор в пустоту.
  assert.equal(str(selectMarketRow(rows, "XXXX"), "BOARDID"), "TQCB");
  // Режим есть, но данных в нём нет — проваливаемся на режим с данными.
  const withEmptyBoard = [...rows, { BOARDID: "SMAL", LAST: null, MARKETPRICE: null, PREVPRICE: null }];
  assert.equal(str(selectMarketRow(withEmptyBoard, "SMAL"), "BOARDID"), "TQCB");
  assert.equal(selectMarketRow([]), undefined);
});

test("pickPrice идёт по приоритету LAST → MARKETPRICE → PREVPRICE", () => {
  const security = { PREVPRICE: 99.5, PREVDATE: "2026-08-28" };

  const last = pickPrice(security, { LAST: 100.25, MARKETPRICE: 100.1, UPDATETIME: "18:53:25" });
  assert.equal(last.value, 100.25);
  assert.equal(last.source, "last");
  assert.equal(last.label, "сделка 18:53");

  const market = pickPrice(security, { LAST: null, MARKETPRICE: 100.1, UPDATETIME: "18:53:25" });
  assert.equal(market.value, 100.1);
  assert.equal(market.source, "market");

  const prev = pickPrice(security, { LAST: null, MARKETPRICE: null });
  assert.equal(prev.value, 99.5);
  assert.equal(prev.source, "prev");
  assert.equal(prev.label, "закрытие 28.08.2026");

  const nothing = pickPrice({}, {});
  assert.equal(nothing.value, null);
  assert.equal(nothing.source, "none");
});

test("pickPrice на живых данных ОФЗ даёт цену с TQOB", () => {
  const response = fixture("SU26238RMFS4.security.json");
  const security = selectMarketRow(toRows(response.securities));
  const market = selectMarketRow(toRows(response.marketdata), str(security, "BOARDID"));
  const price = pickPrice(security, market);
  assert.ok(price.value !== null && price.value > 40 && price.value < 70, `цена вне ожиданий: ${price.value}`);
  assert.equal(str(market, "BOARDID"), "TQOB");
});

test("upcomingCoupons отдаёт только будущие выплаты и не больше пяти", () => {
  const response = fixture("RU000A10CB66.bondization.json");
  const coupons: Coupon[] = toRows(response.coupons).map((row) => ({
    date: str(row, "coupondate"),
    value: typeof row.value === "number" ? row.value : null,
    percent: typeof row.valueprc === "number" ? row.valueprc : null,
    faceUnit: str(row, "faceunit"),
  }));

  const upcoming = upcomingCoupons(coupons);
  assert.equal(upcoming.length, 5);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  for (const coupon of upcoming) assert.ok((coupon.date ?? "") >= today, `прошлый купон в списке: ${coupon.date}`);
  // Отсортированы по возрастанию.
  const dates = upcoming.map((coupon) => coupon.date ?? "");
  assert.deepEqual(dates, [...dates].sort());
});

test("hasAmortization: одна строка — это погашение, а не амортизация", () => {
  const response = fixture("RU000A10CB66.bondization.json");
  const amortizations = toRows(response.amortizations);
  assert.equal(amortizations.length, 1);
  assert.equal(
    hasAmortization(
      amortizations.map(() => ({ date: null, percent: null, value: null, faceUnit: null, initialFaceValue: null })),
    ),
    false,
  );
});

test("nextOffer выбирает ближайшую будущую оферту", () => {
  const offers: Offer[] = [
    { date: "2020-01-01", price: 100, type: "put" },
    { date: "2099-05-05", price: 100, type: "put" },
    { date: "2099-01-01", price: 100, type: "call" },
  ];
  assert.equal(nextOffer(offers)?.date, "2099-01-01");
  assert.equal(nextOffer([{ date: "2020-01-01", price: null, type: null }]), null);
});

test("sortByRelevance поднимает точное совпадение по ISIN", () => {
  const response = fixture("search.segezha.json");
  const refs: BondRef[] = toRows(response.securities).map((row) => ({
    secid: str(row, "secid") ?? "",
    shortname: str(row, "shortname") ?? "",
    isin: str(row, "isin"),
    fullname: str(row, "name"),
    emitent: str(row, "emitent_title"),
    boardid: str(row, "primary_boardid"),
    type: str(row, "type"),
  }));
  assert.ok(refs.length >= 8, `в фикстуре мало выпусков: ${refs.length}`);

  const target = refs[refs.length - 1].secid;
  assert.equal(sortByRelevance(refs, target)[0].secid, target);
  assert.equal(sortByRelevance(refs, target.toLowerCase())[0].secid, target);
});

test("ссылки собираются только из безопасных кодов", () => {
  assert.equal(moexUrl("SU26238RMFS4", "TQOB"), "https://www.moex.com/ru/issue.aspx?board=TQOB&code=SU26238RMFS4");
  assert.equal(smartLabUrl("RU000A10CB66"), "https://smart-lab.ru/q/bonds/RU000A10CB66/");
  assert.equal(moexUrl("evil?x=1", "TQCB"), null);
  assert.equal(smartLabUrl("../../etc"), null);
  // Битый режим торгов просто выпадает из ссылки, а не ломает её.
  assert.equal(moexUrl("SU26238RMFS4", "tq ob"), "https://www.moex.com/ru/issue.aspx?code=SU26238RMFS4");
});

test("сетевая ошибка превращается в понятное сообщение", async () => {
  const realFetch = globalThis.fetch;
  try {
    // Node при отсутствии сети бросает TypeError «fetch failed».
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await assert.rejects(issFetch("/securities.json", { q: "офз" }), (error: Error) => {
      assert.equal(error.name, "IssError");
      assert.equal(error.message, "Нет связи с MOEX ISS");
      return true;
    });
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("таймаут MOEX тоже читается по-человечески", async () => {
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => {
      const error = new Error("timed out");
      error.name = "TimeoutError";
      throw error;
    }) as typeof fetch;
    await assert.rejects(issFetch("/securities.json", { q: "офз" }), (error: Error) => {
      assert.equal(error.name, "IssError");
      assert.match(error.message, /не ответил/);
      return true;
    });
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("отмену пользователя не подменяем своей ошибкой", async () => {
  const realFetch = globalThis.fetch;
  const controller = new AbortController();
  try {
    globalThis.fetch = (async () => {
      controller.abort();
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    }) as typeof fetch;
    await assert.rejects(issFetch("/securities.json", { q: "офз" }, controller.signal), (error: Error) => {
      assert.equal(error.name, "AbortError");
      return true;
    });
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("режим торгов берётся из блока с торгами, а не из справочного", () => {
  // Регрессия: у ОФЗ ISS отдаёт служебный SPOB («Поставка по ОФЗ») ПЕРЕД TQOB.
  // В SPOB нет сделок, а YIELD там бессмысленный: 28,29 % и −3,03 % вместо 13,67 % и 13,34 %.
  const response = fixture("batch.ofz-spob.json");
  const securities = toRows(response.securities);
  const marketdata = toRows(response.marketdata);
  assert.equal(str(marketdata[0], "BOARDID"), "SPOB", "фикстура должна начинаться со SPOB");

  for (const secid of ["SU26207RMFS9", "SU26219RMFS4"]) {
    const secRows = securities.filter((row) => str(row, "SECID") === secid);
    const mdRows = marketdata.filter((row) => str(row, "SECID") === secid);

    // Без подсказки режима — открытие карточки из избранного.
    const blind = alignBoards(secRows, mdRows);
    assert.equal(str(blind.market, "BOARDID"), "TQOB", `${secid}: выбран не тот режим`);
    assert.equal(str(blind.security, "BOARDID"), "TQOB", `${secid}: справочная строка от чужого режима`);

    // С primary_boardid из поиска.
    const hinted = alignBoards(secRows, mdRows, "TQOB");
    assert.equal(str(hinted.market, "BOARDID"), "TQOB");

    const quoteYield = num(hinted.market, "YIELD");
    assert.ok(quoteYield !== null && quoteYield > 10 && quoteYield < 20, `${secid}: доходность ${quoteYield}`);
  }
});

test("короткий горизонт помечается как обманчивая доходность", () => {
  // Сегежа3P3R: погашение завтра, дюрация 1 день, MOEX показывает 306 % годовых.
  assert.equal(isYieldMisleading(1, 306.25), true);
  assert.equal(isYieldMisleading(30, 40), true);
  assert.equal(isYieldMisleading(431, 31.6), false);
  assert.equal(isYieldMisleading(null, 15), false);
  assert.equal(isYieldMisleading(1, null), false);
});

test("полный отказ котировок пробрасывается, частичный — нет", async () => {
  const realFetch = globalThis.fetch;
  const many = Array.from({ length: 45 }, (_, i) => ({ secid: `SEC${i}`, boardid: "TQCB" }));
  const emptyPayload = JSON.stringify({
    securities: { columns: ["SECID", "BOARDID"], data: [["SEC0", "TQCB"]] },
    marketdata: { columns: ["SECID", "BOARDID"], data: [["SEC0", "TQCB"]] },
  });

  try {
    // Упало всё — список обязан показать ошибку, а не пустоту.
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await assert.rejects(fetchQuotes(many), (error: Error) => {
      assert.equal(error.name, "IssError");
      return true;
    });

    // 45 бумаг — это два куска по 30; роняем только первый.
    let call = 0;
    globalThis.fetch = (async () => {
      call += 1;
      if (call === 1) throw new TypeError("fetch failed");
      return new Response(emptyPayload, { status: 200 });
    }) as typeof fetch;
    const partial = await fetchQuotes(many);
    assert.equal(partial.size, 1, "частичный результат должен дожить до списка");
  } finally {
    globalThis.fetch = realFetch;
  }
});
