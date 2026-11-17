import { StatementItemResponse } from "../api/types";
import { BANK_REQUISITES, STATEMENT_PAGE_SIZE } from "../data/constants";
import { createIban } from "./iban";
import { MOCK_OWNER } from "./owner";
import { Random, createId, createRandom } from "./random";
import { getMockUahRate } from "./rates";

const UAH = 980;
const USD = 840;
const EUR = 978;
const PLN = 985;

/** Transactions start on this day. */
const EPOCH = new Date(2026, 0, 1);
const HOUR = 3600;
/** Card purchases stay holds this long, in seconds. */
const HOLD_PERIOD = 2 * 24 * HOUR;

/** Ids of the mock accounts and jars. Readable, so they're easy to spot in storage. */
export const MOCK_IDS = {
  black: "mockBlackUah0001",
  white: "mockWhiteUah0002",
  platinum: "mockPlatUsd00003",
  iron: "mockIronEur00004",
  fop: "mockFopUah000005",
  yellow: "mockYellowUah006",
  eAid: "mockEAidUah00007",
  jarVacation: "mockJarVacation1",
  jarLaptop: "mockJarLaptop002",
  jarSafety: "mockJarSafety003",
  jarUsd: "mockJarUsd000004",
} as const;

/** One operation before it becomes a statement item. */
interface Op {
  description: string;
  mcc: number;
  originalMcc?: number;
  /** In major units of `currency`. Negative for expenses. */
  amount: number;
  /** The operation's currency. The account's when missing. */
  currency?: number;
  /** In major units of the account currency, charged on top of `amount`. */
  commission?: number;
  comment?: string;
  receiptId?: string;
  invoiceId?: string;
  counterEdrpou?: string;
  counterIban?: string;
  counterName?: string;
  /** A card purchase: a hold for its first days, and eligible for cashback. */
  card?: boolean;
  /** Seconds since the day's midnight. Random when missing. */
  at?: number;
}

/** A kind of random operation, picked by `weight`. */
interface Merchant {
  weight: number;
  build: (date: Date, random: Random) => Op;
}

interface Profile {
  id: string;
  currency: number;
  /** Balance before the first day, in major units. Includes the credit limit. */
  start: number;
  /** Mean number of random operations per day. */
  perDay: number;
  merchants: Merchant[];
  /** Operations on fixed days, e.g. salary. */
  scheduled?: (date: Date, random: Random) => Op[];
  /**
   * The lowest balance, in major units. An expense that would go below it gets a `topUp` right before it,
   * or is skipped when there's none.
   */
  floor: number;
  topUp?: { description: string; amount: number };
  /** Cashback rate of card purchases: one for all, or by MCC. */
  cashback?: number | Record<number, number>;
}

interface MerchantSpec {
  names: string[];
  mcc: number;
  originalMcc?: number;
  /** In major units of `currency`. */
  range: [number, number];
  currency?: number;
  weight: number;
  income?: boolean;
  /** A transfer rather than a card payment: never a hold, no cashback. */
  transfer?: boolean;
  /** Whole amounts, as people send. */
  whole?: boolean;
  /** Chance of a receipt. */
  receipt?: number;
  /** Half of the operations get one of these. */
  comments?: string[];
  /** Relative to the amount. */
  commission?: number;
}

function merchant(spec: MerchantSpec): Merchant {
  return {
    weight: spec.weight,
    build: (_, random) => {
      const amount = random.amount(spec.range[0], spec.range[1], spec.whole ? 0 : 2);
      return {
        description: random.pick(spec.names),
        mcc: spec.mcc,
        originalMcc: spec.originalMcc,
        amount: spec.income ? amount : -amount,
        currency: spec.currency,
        commission: spec.commission ? Math.max(5, round(amount * spec.commission)) : undefined,
        comment: spec.comments && random.chance(0.5) ? random.pick(spec.comments) : undefined,
        receiptId: spec.receipt && random.chance(spec.receipt) ? createReceiptId(random) : undefined,
        card: !spec.income && !spec.transfer,
      };
    },
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

const RECEIPT_CHARS = "ABCEHKMPTX0123456789";

function createReceiptId(random: Random) {
  const group = () => Array.from({ length: 4 }, () => random.pick([...RECEIPT_CHARS])).join("");
  return [group(), group(), group(), group()].join("-");
}

const friends = ["Андрій Мельник", "Ірина Шевчук", "Максим Бондар", "Софія Ткаченко", "Олег Кравець"];

/** Top-ups of a jar from the black card, so both statements show the same amount. */
function getJarTopUp(jarId: string, date: Date, range: [number, number]) {
  return createRandom(`jarTopUp:${jarId}:${date.toDateString()}`).amount(range[0], range[1], 0);
}

/**
 * The 1st of the month `months` before the current one. Schedules that show a state relative to today (a price
 * change, a cancelled subscription) use it, so "Show Subscriptions" shows them on any day.
 */
function startOfMonthAgo(months: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - months, 1);
}

/** A bill that changes every month, so it isn't a subscription. Seeded by the bill and the day. */
function getBill(name: string, date: Date, range: [number, number]) {
  return createRandom(`bill:${name}:${date.toDateString()}`).amount(range[0], range[1], 2);
}

const VACATION_TOP_UP: [number, number] = [400, 800];
const LAPTOP_TOP_UP: [number, number] = [300, 700];
const SAFETY_TOP_UP: [number, number] = [3_000, 6_000];
const WHITE_TOP_UP = 12_000;
const SAFETY_WITHDRAWAL: [number, number] = [3_000, 9_000];

/**
 * A withdrawal from the safety jar to the black card, about once a month, so both statements show the same amount
 * a few seconds apart: the amount and when it leaves the jar (seconds since midnight). Undefined on other days.
 */
function getSafetyWithdrawal(date: Date) {
  const random = createRandom(`jarWithdrawal:${date.toDateString()}`);
  if (!random.chance(0.03)) return undefined;
  return {
    amount: random.amount(SAFETY_WITHDRAWAL[0], SAFETY_WITHDRAWAL[1], 0),
    at: random.int(9 * HOUR, 21 * HOUR),
  };
}

const OLD_JAR_TOP_UP: [number, number] = [500, 1_500];
/** The day the "Стара банка" jar was smashed: the last 5th before today, so its last top-ups are in Last Month. */
const OLD_JAR_SMASHED = (() => {
  const month = startOfMonthAgo(new Date().getDate() > 5 ? 0 : 1);
  return new Date(month.getFullYear(), month.getMonth(), 5);
})();

function isBefore(date: Date, other: Date) {
  return date.getTime() < other.getTime();
}

/** Everything the "Стара банка" jar collected: its top-ups since `EPOCH`. */
function getOldJarPayout() {
  let total = 0;
  for (let date = new Date(EPOCH); isBefore(date, OLD_JAR_SMASHED); date.setDate(date.getDate() + 1)) {
    if (date.getDate() === 8 || date.getDate() === 24) total += getJarTopUp("oldJar", date, OLD_JAR_TOP_UP);
  }
  return total;
}

const black: Profile = {
  id: MOCK_IDS.black,
  currency: UAH,
  // 25 000 of own money and the 50 000 credit limit.
  start: 75_000,
  // Over 500 transactions in 31 days, so a statement of the last 31 days is incomplete.
  perDay: 22,
  floor: 20_000,
  topUp: { description: "З картки ПриватБанку", amount: 20_000 },
  cashback: { 5812: 0.05, 5814: 0.05, 5912: 0.03, 4121: 0.02 },
  merchants: [
    merchant({ names: ["Київський метрополітен"], mcc: 4111, range: [8, 8], weight: 7 }),
    merchant({ names: ["Київпастранс"], mcc: 4131, range: [8, 15], weight: 2 }),
    merchant({
      names: ["Aroma Kava", "One Love Espresso Bar", "Кав'ярня «Зерно»"],
      mcc: 5814,
      range: [55, 160],
      weight: 8,
      receipt: 0.3,
    }),
    merchant({ names: ["Хлібна хата", "Пекарня «Бріош»"], mcc: 5462, range: [35, 180], weight: 2 }),
    merchant({ names: ["Сільпо", "АТБ", "Novus", "Фора"], mcc: 5411, range: [60, 1100], weight: 3, receipt: 0.8 }),
    merchant({ names: ["М'ясна лавка", "Фрукти й овочі"], mcc: 5499, range: [60, 450], weight: 2 }),
    merchant({
      names: ["Пузата Хата", "Ресторан «Канапа»", "Сушия"],
      mcc: 5812,
      range: [250, 2400],
      weight: 1,
      receipt: 0.6,
    }),
    merchant({ names: ["McDonald's", "KFC"], mcc: 5814, range: [120, 480], weight: 2 }),
    merchant({ names: ["Uklon", "Bolt"], mcc: 4121, range: [90, 420], weight: 2 }),
    merchant({ names: ["WOG", "OKKO", "SOCAR"], mcc: 5541, range: [700, 2200], weight: 0.4, receipt: 0.5 }),
    merchant({ names: ["Аптека АНЦ", "Аптека Доброго Дня"], mcc: 5912, range: [70, 900], weight: 0.8 }),
    merchant({ names: ["EVA", "Watsons"], mcc: 5977, range: [120, 1100], weight: 0.5 }),
    merchant({ names: ["Intertop", "Answear"], mcc: 5651, range: [600, 3500], weight: 0.15 }),
    // Recategorized by monobank.
    merchant({ names: ["Rozetka", "Comfy"], mcc: 5732, originalMcc: 5964, range: [400, 9000], weight: 0.1 }),
    merchant({ names: ["Multiplex"], mcc: 7832, range: [180, 420], weight: 0.2 }),
    merchant({ names: ["Бар «Хвилинка»"], mcc: 5813, range: [150, 900], weight: 0.4 }),
    merchant({ names: ["MasterZoo"], mcc: 5995, range: [200, 1200], weight: 0.2 }),
    merchant({ names: ["App Store", "Google Play"], mcc: 5818, range: [0.99, 9.99], currency: USD, weight: 0.3 }),
    merchant({ names: ["Wizz Air"], mcc: 4511, range: [25, 90], currency: EUR, weight: 0.03 }),
    merchant({ names: ["Booking.com"], mcc: 7011, range: [60, 220], currency: EUR, weight: 0.03 }),
    merchant({
      names: friends,
      mcc: 4829,
      range: [100, 2000],
      weight: 0.6,
      transfer: true,
      whole: true,
      comments: ["За обід", "Борг", "На подарунок", "Квитки", "🍕"],
    }),
    merchant({
      names: ["На картку іншого банку"],
      mcc: 4829,
      range: [500, 5000],
      weight: 0.1,
      transfer: true,
      whole: true,
      commission: 0.005,
    }),
    merchant({ names: ["Банкомат ПриватБанку"], mcc: 6011, range: [500, 3000], weight: 0.1, whole: true }),
    merchant({
      names: friends.map((name) => `Від: ${name}`),
      mcc: 4829,
      range: [100, 1500],
      weight: 0.4,
      income: true,
      whole: true,
      comments: ["Повертаю", "За таксі", "Дякую!"],
    }),
  ],
  scheduled: (date) => {
    const ops: Op[] = [];
    const day = date.getDate();
    const employer = "Від: ТОВ «Альфа Діджитал»";
    if (day === 1)
      ops.push({ description: employer, mcc: 4829, amount: 98_000, comment: "Заробітна плата", at: 10 * HOUR });
    if (day === 15) ops.push({ description: employer, mcc: 4829, amount: 82_000, comment: "Аванс", at: 10 * HOUR });
    if (day === 2 || day === 16) {
      // An outgoing transfer never says which card receives it; the white card's statement has the other side.
      ops.push({ description: "Переказ на картку", mcc: 4829, amount: -WHITE_TOP_UP, at: 11 * HOUR });
    }
    if (day === 3) ops.push({ description: "Kyivstar", mcc: 4814, amount: -250, card: true, at: 9 * HOUR });
    if (day === 20)
      ops.push({ description: "Київстар Домашній інтернет", mcc: 4814, amount: -300, card: true, at: 9 * HOUR });
    // Subscriptions for "Show Subscriptions": two plans of one merchant, and one in USD on this UAH card.
    if (day === 9)
      ops.push({ description: "ChatGPT", mcc: 5734, amount: -20, currency: USD, card: true, at: 4 * HOUR });
    if (day === 14) {
      ops.push({ description: "Apple.com/bill", mcc: 5818, amount: -2.99, currency: USD, card: true, at: 5 * HOUR });
    }
    if (day === 22) {
      ops.push({ description: "Apple.com/bill", mcc: 5818, amount: -9.99, currency: USD, card: true, at: 5 * HOUR });
    }
    // Stops before its last expected charge (the 5th, plus 5 days of grace), so it shows as Possibly Cancelled.
    if (day === 5 && date < startOfMonthAgo(new Date().getDate() > 10 ? 0 : 1)) {
      ops.push({ description: "MEGOGO", mcc: 4899, amount: -199, card: true, at: 8 * HOUR });
    }
    // Jar top-ups show as Savings. monobank describes a manual one as "Поповнення «Title»" and an automatic one
    // (a regular top-up set up in the jar) as just the jar's title.
    if (date.getDay() === 0) {
      const vacation = getJarTopUp(MOCK_IDS.jarVacation, date, VACATION_TOP_UP);
      const laptop = getJarTopUp(MOCK_IDS.jarLaptop, date, LAPTOP_TOP_UP);
      ops.push({ description: "Поповнення «На відпустку»", mcc: 4829, amount: -vacation, at: 20 * HOUR });
      ops.push({ description: "Поповнення «Новий ноутбук»", mcc: 4829, amount: -laptop, at: 20 * HOUR + 60 });
    }
    if (day === 1 || day === 15) {
      const safety = getJarTopUp(MOCK_IDS.jarSafety, date, SAFETY_TOP_UP);
      ops.push({ description: "Подушка безпеки", mcc: 4829, amount: -safety, at: 12 * HOUR });
    }
    // Only mentions the "Долари" jar, so it stays a money transfer.
    if (day === 25) ops.push({ description: "Борг за долари", mcc: 4829, amount: -500, at: 13 * HOUR });
    // The other side of a withdrawal from the safety jar: money of the user's own, not income.
    const withdrawal = getSafetyWithdrawal(date);
    if (withdrawal) {
      ops.push({
        description: "Часткове зняття банки «Подушка безпеки»",
        mcc: 4829,
        amount: withdrawal.amount,
        at: withdrawal.at + 5,
      });
    }
    // A jar smashed since: it's not among the mock jars, so only its payout tells that its top-ups were Savings.
    if (isBefore(date, OLD_JAR_SMASHED)) {
      if (day === 8 || day === 24) {
        const amount = getJarTopUp("oldJar", date, OLD_JAR_TOP_UP);
        ops.push({ description: "Поповнення «Стара банка»", mcc: 4829, amount: -amount, at: 14 * HOUR });
      }
    } else if (date.getTime() === OLD_JAR_SMASHED.getTime()) {
      ops.push({ description: "Виплата банки «Стара банка»", mcc: 4829, amount: getOldJarPayout(), at: 15 * HOUR });
    }
    return ops;
  },
};

const white: Profile = {
  id: MOCK_IDS.white,
  currency: UAH,
  start: 12_000,
  perDay: 0.8,
  floor: 1_000,
  cashback: { 5411: 0.02 },
  merchants: [
    merchant({ names: ["Сільпо", "АТБ"], mcc: 5411, range: [150, 1600], weight: 4, receipt: 0.8 }),
    merchant({ names: ["Аптека АНЦ"], mcc: 5912, range: [80, 700], weight: 1 }),
    merchant({ names: ["Епіцентр"], mcc: 5200, range: [200, 3000], weight: 0.5 }),
    merchant({ names: ["Нова пошта"], mcc: 4215, range: [60, 250], weight: 0.8 }),
  ],
  scheduled: (date) => {
    const ops: Op[] = [];
    const day = date.getDate();
    if (day === 2 || day === 16) {
      ops.push({ description: "З чорної картки", mcc: 4829, amount: WHITE_TOP_UP, at: 11 * HOUR });
    }
    // Two subscriptions at the same price through Apple (e.g. iCloud and Telegram), told apart by their day.
    if (day === 12 || day === 21) {
      ops.push({ description: "Apple", mcc: 5818, amount: -2.99, currency: USD, card: true, at: 12 * HOUR + 21 * 60 });
    }
    // A new price charged once, on the last 13th: "Show Subscriptions" asks whether it's the new price.
    if (day === 13) {
      const priceChange = startOfMonthAgo(new Date().getDate() > 13 ? 0 : 1);
      const amount = date < priceChange ? -149 : -299;
      ops.push({ description: "YouTube", mcc: 5815, amount, card: true, at: 11 * HOUR + 14 * 60 });
    }
    if (day === 10) {
      ops.push({ description: "Київводоканал", mcc: 4900, amount: -getBill("water", date, [340, 520]), at: 12 * HOUR });
      ops.push({ description: "YASNO", mcc: 4900, amount: -getBill("power", date, [900, 1800]), at: 12 * HOUR + 120 });
      ops.push({ description: "Нафтогаз", mcc: 4900, amount: -getBill("gas", date, [200, 650]), at: 12 * HOUR + 240 });
    }
    return ops;
  },
};

const platinum: Profile = {
  id: MOCK_IDS.platinum,
  currency: USD,
  start: 2_400,
  perDay: 0.25,
  floor: 200,
  cashback: 0.01,
  merchants: [
    merchant({ names: ["Amazon"], mcc: 5964, range: [15, 120], weight: 2 }),
    merchant({ names: ["Steam"], mcc: 5818, range: [5, 60], weight: 1 }),
    merchant({ names: ["Booking.com"], mcc: 7011, range: [80, 300], currency: EUR, weight: 0.5 }),
    merchant({ names: ["Starbucks Warszawa"], mcc: 5814, range: [15, 40], currency: PLN, weight: 0.5 }),
  ],
  scheduled: (date) => {
    const ops: Op[] = [];
    const day = date.getDate();
    if (day === 7) {
      // A price change one charge before the last two, so the default 3 months of history show "was $15.49".
      const priceChange = startOfMonthAgo(new Date().getDate() > 7 ? 1 : 2);
      const amount = date < priceChange ? -15.49 : -17.99;
      ops.push({ description: "Netflix", mcc: 5815, amount, card: true, at: 6 * HOUR });
    }
    if (day === 12)
      ops.push({ description: "Spotify", mcc: 5815, amount: -10.99, currency: EUR, card: true, at: 6 * HOUR });
    if (day === 20) ops.push({ description: "Купівля валюти", mcc: 4829, amount: 600, at: 13 * HOUR });
    return ops;
  },
};

const iron: Profile = {
  id: MOCK_IDS.iron,
  currency: EUR,
  start: 850,
  perDay: 0.15,
  floor: 100,
  merchants: [
    merchant({ names: ["Lidl", "Biedronka"], mcc: 5411, range: [10, 80], weight: 2 }),
    merchant({ names: ["Wizz Air"], mcc: 4511, range: [30, 120], weight: 0.5 }),
    merchant({ names: ["Booking.com"], mcc: 7011, range: [60, 250], weight: 0.5 }),
    merchant({ names: ["Bolt"], mcc: 4121, range: [20, 60], currency: PLN, weight: 1 }),
  ],
  scheduled: (date) =>
    date.getDate() === 25 ? [{ description: "Купівля валюти", mcc: 4829, amount: 300, at: 13 * HOUR }] : [],
};

/** The IBAN of the black card, as in the mock accounts. */
const BLACK_IBAN = createIban(BANK_REQUISITES.mfo, "26200000000001");

const clients = [
  { name: "ТОВ «БЕТА СОФТ»", edrpou: "43210987", iban: createIban("305299", "26001234500001") },
  { name: "ТОВ «ГАММА ПРОДАКШН»", edrpou: "44556677", iban: createIban("380805", "26007700012345") },
  { name: "ПП «ДЕЛЬТА-СЕРВІС»", edrpou: "39876543", iban: createIban("300528", "26009988776655") },
];

function formatDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

const fop: Profile = {
  id: MOCK_IDS.fop,
  currency: UAH,
  start: 120_000,
  perDay: 0.4,
  floor: 5_000,
  merchants: [
    {
      weight: 3,
      build: (date, random) => {
        const client = random.pick(clients);
        const invoice = String(random.int(100, 999));
        return {
          description: `Оплата за послуги з розробки ПЗ згідно рахунку № ${invoice} від ${formatDate(date)}. Без ПДВ.`,
          mcc: 4829,
          amount: random.amount(8_000, 65_000, 0),
          counterName: client.name,
          counterEdrpou: client.edrpou,
          counterIban: client.iban,
          invoiceId: invoice,
        };
      },
    },
    // A FOP statement names the receiver, so the IBAN tells that the card is the user's own.
    {
      weight: 2,
      build: (_, random) => ({
        description: "Переказ на власну картку",
        mcc: 4829,
        amount: -random.amount(30_000, 60_000, 0),
        counterName: MOCK_OWNER.name,
        counterIban: BLACK_IBAN,
      }),
    },
  ],
  scheduled: (date) => {
    const ops: Op[] = [];
    const month = date.getMonth();
    if (date.getDate() === 18) {
      ops.push({ description: "ЄСВ", mcc: 9311, amount: -1902.34, comment: "Єдиний внесок", at: 11 * HOUR });
    }
    // The single tax for the quarter that just ended.
    if (date.getDate() === 20 && month % 3 === 0) {
      ops.push({ description: "Єдиний податок, 3 група", mcc: 9311, amount: -11_480, at: 11 * HOUR + 60 });
    }
    return ops;
  },
};

const yellow: Profile = {
  id: MOCK_IDS.yellow,
  currency: UAH,
  start: 800,
  perDay: 0.6,
  floor: 0,
  merchants: [
    merchant({ names: ["Сільпо", "АТБ"], mcc: 5411, range: [30, 250], weight: 2 }),
    merchant({ names: ["Кав'ярня «Зерно»"], mcc: 5814, range: [40, 120], weight: 1 }),
    merchant({ names: ["Київський метрополітен"], mcc: 4111, range: [8, 8], weight: 2 }),
    merchant({ names: ["Книгарня «Є»"], mcc: 5942, range: [150, 450], weight: 0.3 }),
  ],
  scheduled: (date) =>
    date.getDay() === 1
      ? [{ description: `Від: ${MOCK_OWNER.name}`, mcc: 4829, amount: 500, comment: "Кишенькові", at: 8 * HOUR }]
      : [],
};

const eAid: Profile = {
  id: MOCK_IDS.eAid,
  currency: UAH,
  start: 1_200,
  perDay: 0.04,
  floor: 0,
  merchants: [
    merchant({ names: ["Аптека АНЦ"], mcc: 5912, range: [80, 400], weight: 1 }),
    merchant({ names: ["Книгарня «Є»"], mcc: 5942, range: [150, 450], weight: 1 }),
  ],
  scheduled: (date, random) =>
    date.getDate() === 15
      ? [{ description: "Національний кешбек", mcc: 4829, amount: random.amount(80, 600), at: 9 * HOUR }]
      : [],
};

function jarTopUps(jarId: string, range: [number, number]) {
  return (date: Date): Op[] =>
    date.getDay() === 0
      ? [{ description: "З чорної картки", mcc: 4829, amount: getJarTopUp(jarId, date, range), at: 20 * HOUR + 30 }]
      : [];
}

const jarVacation: Profile = {
  id: MOCK_IDS.jarVacation,
  currency: UAH,
  start: 7_000,
  perDay: 0.03,
  floor: 0,
  merchants: [
    merchant({
      names: friends.map((name) => `Від: ${name}`),
      mcc: 4829,
      range: [100, 1000],
      weight: 1,
      income: true,
      whole: true,
    }),
  ],
  scheduled: jarTopUps(MOCK_IDS.jarVacation, VACATION_TOP_UP),
};

const jarLaptop: Profile = {
  id: MOCK_IDS.jarLaptop,
  currency: UAH,
  start: 40_000,
  perDay: 0,
  floor: 0,
  merchants: [],
  scheduled: jarTopUps(MOCK_IDS.jarLaptop, LAPTOP_TOP_UP),
};

const jarSafety: Profile = {
  id: MOCK_IDS.jarSafety,
  currency: UAH,
  start: 25_000,
  perDay: 0,
  floor: 0,
  merchants: [],
  scheduled: (date) => {
    const ops: Op[] = [];
    if (date.getDate() === 1 || date.getDate() === 15) {
      const amount = getJarTopUp(MOCK_IDS.jarSafety, date, SAFETY_TOP_UP);
      ops.push({ description: "З чорної картки", mcc: 4829, amount, at: 12 * HOUR });
    }
    const withdrawal = getSafetyWithdrawal(date);
    if (withdrawal) {
      ops.push({ description: "На чорну картку", mcc: 4829, amount: -withdrawal.amount, at: withdrawal.at });
    }
    return ops;
  },
};

const jarUsd: Profile = {
  id: MOCK_IDS.jarUsd,
  currency: USD,
  start: 300,
  perDay: 0,
  floor: 0,
  merchants: [],
  scheduled: (date, random) =>
    date.getDay() === 6
      ? [{ description: "З платинової картки", mcc: 4829, amount: random.amount(15, 45, 0), at: 18 * HOUR }]
      : [],
};

const profiles = [black, white, platinum, iron, fop, yellow, eAid, jarVacation, jarLaptop, jarSafety, jarUsd];

interface Generated {
  /** Oldest first, including today's transactions that haven't happened yet. */
  items: StatementItemResponse[];
  /** Ids of card purchases, which are holds for their first days. */
  cards: Set<string>;
  /** In minor units, after the last item. */
  balance: number;
  /** The first day (counted from `EPOCH`) not generated yet. */
  nextDay: number;
}

const generated = new Map<string, Generated>();

function getDate(day: number) {
  return new Date(EPOCH.getFullYear(), EPOCH.getMonth(), EPOCH.getDate() + day);
}

function getDayNumber(time: number) {
  const date = new Date(time);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // Rounded, since a day with a DST change is 23 or 25 hours long.
  return Math.round((day.getTime() - EPOCH.getTime()) / 86_400_000);
}

function toMinor(amount: number) {
  return Math.round(amount * 100);
}

/** Appends the transactions of `day`. Each day is seeded by the account and the day, so it never changes. */
function generateDay(profile: Profile, state: Generated, day: number) {
  const date = getDate(day);
  const random = createRandom(`${profile.id}:${day}`);
  const ops = [...(profile.scheduled?.(date, random) ?? [])];

  if (profile.merchants.length) {
    const count = Math.floor(profile.perDay * (0.7 + random.next() * 0.6) + random.next());
    for (let i = 0; i < count; i++) {
      ops.push(random.weighted(profile.merchants).build(date, random));
    }
  }

  const timed = ops
    .map((op) => ({ op, at: op.at ?? random.int(7 * HOUR, 23 * HOUR + 30 * 60) }))
    .sort((a, b) => a.at - b.at);
  const floor = toMinor(profile.floor);
  let lastTime = 0;

  const push = (item: Omit<StatementItemResponse, "id" | "balance" | "hold">, seed: string, card = false) => {
    const id = createId(seed);
    state.balance += item.amount;
    lastTime = item.time;
    state.items.push({ id, ...item, hold: false, balance: state.balance });
    if (card) state.cards.add(id);
  };

  timed.forEach(({ op, at }, index) => {
    const time = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, at).getTime() / 1000);
    const currency = op.currency ?? profile.currency;
    const operationAmount = toMinor(op.amount);
    const converted =
      currency === profile.currency
        ? operationAmount
        : Math.round(
            (operationAmount * getMockUahRate(currency, time * 1000)) / getMockUahRate(profile.currency, time * 1000),
          );
    const commission = toMinor(op.commission ?? 0);
    const amount = converted - commission;

    if (amount < 0 && state.balance + amount < floor) {
      if (!profile.topUp) return;
      const topUp = toMinor(profile.topUp.amount);
      push(
        {
          time: Math.max(lastTime, time - 60),
          description: profile.topUp.description,
          mcc: 4829,
          originalMcc: 4829,
          amount: topUp,
          operationAmount: topUp,
          currencyCode: profile.currency,
          commissionRate: 0,
          cashbackAmount: 0,
        },
        `${profile.id}:${day}:${index}:topUp`,
      );
    }

    const cashbackRate = !op.card
      ? 0
      : typeof profile.cashback === "number"
        ? profile.cashback
        : (profile.cashback?.[op.mcc] ?? 0);

    push(
      {
        time,
        description: op.description,
        mcc: op.mcc,
        originalMcc: op.originalMcc ?? op.mcc,
        amount,
        operationAmount,
        currencyCode: currency,
        commissionRate: commission,
        cashbackAmount: amount < 0 ? Math.round(-converted * cashbackRate) : 0,
        comment: op.comment,
        receiptId: op.receiptId,
        invoiceId: op.invoiceId,
        counterEdrpou: op.counterEdrpou,
        counterIban: op.counterIban,
        counterName: op.counterName,
      },
      `${profile.id}:${day}:${index}`,
      op.card,
    );
  });
}

/** Every transaction of the account until the end of `now`'s day, oldest first. Memoized. */
function generate(profile: Profile, now: number): Generated {
  const state = generated.get(profile.id) ?? {
    items: [],
    cards: new Set<string>(),
    balance: toMinor(profile.start),
    nextDay: 0,
  };
  const lastDay = getDayNumber(now);

  for (let day = state.nextDay; day <= lastDay; day++) {
    generateDay(profile, state, day);
  }

  state.nextDay = Math.max(state.nextDay, lastDay + 1);
  generated.set(profile.id, state);
  return state;
}

function getProfile(accountId: string) {
  return profiles.find((profile) => profile.id === accountId);
}

/** The balance of an account or jar at `now` (unix ms), in minor units. Undefined for an unknown id. */
export function getMockBalance(accountId: string, now: number) {
  const profile = getProfile(accountId);
  if (!profile) return undefined;

  const { items } = generate(profile, now);
  const nowSeconds = Math.floor(now / 1000);
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].time <= nowSeconds) return items[i].balance;
  }
  return toMinor(profile.start);
}

/**
 * `GET /personal/statement/{account}/{from}/{to}` at `now` (unix ms): the transactions in `[from, to]`
 * (unix seconds; `to` defaults to now), newest first, at most `STATEMENT_PAGE_SIZE`. Card purchases of the last
 * two days are holds. Undefined for an unknown account.
 */
export function getMockStatement(
  accountId: string,
  from: number,
  to: number | undefined,
  now: number,
): StatementItemResponse[] | undefined {
  return collect(accountId, from, to, now, STATEMENT_PAGE_SIZE);
}

/**
 * Every transaction of the account or jar from `from` (unix seconds) until `now` (unix ms), newest first, without
 * the page limit of `getMockStatement`. For `MOCK_CONFIG.prefillStatements`. Undefined for an unknown account.
 */
export function getMockHistory(accountId: string, from: number, now: number) {
  return collect(accountId, from, undefined, now, Infinity);
}

/** The transactions in `[from, to]`, newest first, at most `limit`. Card purchases of the last two days are holds. */
function collect(accountId: string, from: number, to: number | undefined, now: number, limit: number) {
  const profile = getProfile(accountId);
  if (!profile) return undefined;

  const { items, cards } = generate(profile, now);
  const nowSeconds = Math.floor(now / 1000);
  const end = Math.min(to ?? nowSeconds, nowSeconds);
  const result: StatementItemResponse[] = [];

  for (let i = items.length - 1; i >= 0 && result.length < limit; i--) {
    const item = items[i];
    if (item.time > end) continue;
    if (item.time < from) break;
    result.push({ ...item, hold: cards.has(item.id) && nowSeconds - item.time < HOLD_PERIOD });
  }

  return result;
}
