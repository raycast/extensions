import { formatJalaliDateTime, toPersianDigits } from "./jalali";
import { parseTaskText, type ParsedTaskText } from "./parse";
import { parseNote, type Priority } from "./tags";
import type { AnyDoList } from "./types";

/**
 * Turns one line of free-form Persian into a full task: title, itemised note, tags, priority and the
 * right list. Everything here is deterministic and unit-tested; the optional Raycast AI pass lives in
 * `ai-analyze.ts` and only ever *proposes* values that this module has already validated.
 */
export interface AnalysisContext {
  lists: AnyDoList[];
  knownTags?: string[];
  now?: Date;
  /** List name from preferences, used when nothing else matches. */
  defaultListName?: string | null;
}

export interface AnalysisItem {
  quantity: string;
  unit: string | null;
  noun: string;
  emoji: string;
}

export interface TaskAnalysis {
  title: string;
  /** Markdown body: one line per item, optional extra text. */
  note: string;
  tags: string[];
  priority: Priority;
  listId: string | null;
  listTitle: string | null;
  date: Date | null;
  hasTime: boolean;
  /** `ai` when the Raycast AI refined the deterministic result. */
  source: "rules" | "ai";
  /** One-line Persian explanation shown in the preview. */
  reason: string;
  items: AnalysisItem[];
}

const EMOJI: { words: string[]; emoji: string }[] = [
  { words: ["شیر"], emoji: "🥛" },
  { words: ["نان"], emoji: "🍞" },
  { words: ["خرما"], emoji: "🌴" },
  { words: ["پنیر"], emoji: "🧀" },
  { words: ["تخم مرغ", "تخممرغ", "تخم"], emoji: "🥚" },
  { words: ["گوشت", "استیک"], emoji: "🥩" },
  { words: ["مرغ", "جوجه"], emoji: "🍗" },
  { words: ["ماهی", "میگو"], emoji: "🐟" },
  { words: ["برنج"], emoji: "🍚" },
  { words: ["ماکارونی", "پاستا", "رشته"], emoji: "🍝" },
  { words: ["روغن"], emoji: "🫗" },
  { words: ["نمک", "ادویه", "فلفل"], emoji: "🧂" },
  { words: ["قند", "شکر", "شکلات"], emoji: "🍫" },
  { words: ["چای"], emoji: "🍵" },
  { words: ["قهوه"], emoji: "☕" },
  { words: ["آب معدنی", "آبمیوه", "نوشابه", "آب"], emoji: "💧" },
  {
    words: ["میوه", "سیب", "پرتقال", "انگور", "هندوانه", "طالبی"],
    emoji: "🍎",
  },
  { words: ["موز"], emoji: "🍌" },
  { words: ["خیار", "گوجه", "کاهو", "سبزی", "اسفناج"], emoji: "🥬" },
  { words: ["سیب زمینی", "سیبزمینی", "پیاز", "سیر", "هویج"], emoji: "🥕" },
  { words: ["بادمجان", "کدو"], emoji: "🍆" },
  { words: ["ذرت", "قارچ", "کلم"], emoji: "🌽" },
  { words: ["گردو", "بادام", "پسته", "مغز"], emoji: "🥜" },
  { words: ["عسل", "مربا"], emoji: "🍯" },
  { words: ["ماست", "دوغ"], emoji: "🥣" },
  { words: ["کره"], emoji: "🧈" },
  { words: ["بستنی", "دسر"], emoji: "🍦" },
  { words: ["کیک", "شیرینی", "بیسکویت", "نان شیرینی"], emoji: "🍰" },
  { words: ["صابون", "مایع", "شوینده"], emoji: "🧼" },
  { words: ["دستمال", "کاغذ"], emoji: "🧻" },
  { words: ["شامپو", "کرم", "ژل"], emoji: "🧴" },
  { words: ["مسواک", "خمیر دندان", "خمیردندان"], emoji: "🪥" },
  { words: ["لباس", "پیراهن", "شلوار", "تیشرت"], emoji: "👕" },
  { words: ["کفش", "صندل"], emoji: "👟" },
  { words: ["کتاب", "مجله"], emoji: "📚" },
  { words: ["دفتر", "خودکار", "مداد", "لوازم تحریر"], emoji: "📓" },
  { words: ["لپ تاپ", "لپتاپ", "کامپیوتر", "مانیتور", "کیبورد"], emoji: "💻" },
  { words: ["موبایل", "گوشی", "تبلت"], emoji: "📱" },
  { words: ["شارژر", "کابل", "باتری"], emoji: "🔌" },
  { words: ["هدفون", "هندزفری", "اسپیکر"], emoji: "🎧" },
  { words: ["بلیط", "بلیت", "پرواز", "قطار", "اتوبوس"], emoji: "🎫" },
  {
    words: ["هتل", "اقامت", "رزرو", "سفر", "چمدان", "پاسپورت", "ویزا"],
    emoji: "🧳",
  },
  { words: ["تاکسی", "اسنپ", "ماشین", "بنزین", "سرویس"], emoji: "🚗" },
  { words: ["دکتر", "پزشک", "دندان", "نوبت", "بیمارستان"], emoji: "🩺" },
  { words: ["دارو", "قرص", "آمپول", "ویتامین", "آزمایش"], emoji: "💊" },
  {
    words: ["ورزش", "باشگاه", "تمرین", "پیاده روی", "پیادهروی", "دویدن", "شنا"],
    emoji: "🏋️",
  },
  { words: ["خواب", "استراحت", "مدیتیشن"], emoji: "😴" },
  { words: ["جلسه", "میتینگ", "قرار", "ملاقات"], emoji: "📅" },
  { words: ["تماس", "زنگ", "تلفن", "تماست"], emoji: "📞" },
  { words: ["ایمیل", "میل", "پیام", "چت"], emoji: "📧" },
  { words: ["قرارداد", "سند", "فرم", "نامه"], emoji: "📄" },
  { words: ["فاکتور", "صورتحساب", "قبض", "رسید"], emoji: "🧾" },
  { words: ["گزارش", "ریپورت", "آمار"], emoji: "📊" },
  {
    words: [
      "پرداخت",
      "پول",
      "کارت",
      "قسط",
      "وام",
      "اجاره",
      "حقوق",
      "بیمه",
      "مالیات",
    ],
    emoji: "💳",
  },
  { words: ["بانک"], emoji: "🏦" },
  {
    words: ["کد", "برنامه", "دیباگ", "باگ", "اسکریپت", "دیتابیس"],
    emoji: "🧑‍💻",
  },
  { words: ["طراحی", "دیزاین", "لوگو", "بنر"], emoji: "🎨" },
  { words: ["سرور", "بکاپ", "پشتیبان", "شبکه", "روتر"], emoji: "🖥️" },
  { words: ["سایت", "وب", "دامنه", "هاست"], emoji: "🌐" },
  {
    words: [
      "دوره",
      "آموزش",
      "کلاس",
      "درس",
      "امتحان",
      "زبان",
      "مطالعه",
      "یادگیری",
    ],
    emoji: "🎓",
  },
  { words: ["پروژه", "تحویل", "ددلاین", "مشتری"], emoji: "🚀" },
  { words: ["خرید", "بازار", "سوپرمارکت", "فروشگاه"], emoji: "🛒" },
  { words: ["گل", "باغ", "گیاه"], emoji: "🌱" },
  { words: ["گربه", "سگ", "حیوان", "ماهیگیری"], emoji: "🐾" },
  { words: ["هدیه", "کادو"], emoji: "🎁" },
  { words: ["تولد", "جشن", "مراسم", "مهمانی"], emoji: "🎂" },
];

interface Group {
  key: string;
  /** List-title fragments that make this group a candidate. */
  listHints: string[];
  tag: string;
  words: string[];
}

const GROUPS: Group[] = [
  {
    key: "work",
    listHints: ["کاری", "کار"],
    tag: "کاری",
    words: [
      "جلسه",
      "میتینگ",
      "مشتری",
      "پروژه",
      "قرارداد",
      "فاکتور",
      "ایمیل",
      "گزارش",
      "کد",
      "سرور",
      "دیباگ",
      "باگ",
      "طراحی",
      "سایت",
      "تیم",
      "تحویل",
      "ددلاین",
      "مصاحبه",
      "فیچر",
      "نسخه",
      "استقرار",
      "دیتابیس",
      "اسکریپت",
      "پروپوزال",
    ],
  },
  {
    key: "shopping",
    listHints: ["خرید", "منزل", "خانه", "بازار"],
    tag: "خرید",
    words: [
      "خرید",
      "بازار",
      "سوپرمارکت",
      "فروشگاه",
      "نان",
      "شیر",
      "پنیر",
      "خرما",
      "میوه",
      "سبزی",
      "گوشت",
      "مرغ",
      "برنج",
      "تخم مرغ",
      "ماست",
      "دستمال",
      "صابون",
      "شامپو",
      "یخچال",
      "مواد",
      "خواربار",
    ],
  },
  {
    key: "money",
    listHints: ["مالی", "پرداخت", "قبض"],
    tag: "مالی",
    words: [
      "پرداخت",
      "قبض",
      "برق",
      "گاز",
      "شارژ",
      "بانک",
      "وام",
      "قسط",
      "مالیات",
      "بیمه",
      "پول",
      "کارت",
      "حقوق",
      "اجاره",
      "تسهیلات",
      "انتقال",
    ],
  },
  {
    key: "health",
    listHints: ["سلامتی", "پزشک", "درمان"],
    tag: "سلامتی",
    words: [
      "دکتر",
      "پزشک",
      "دارو",
      "قرص",
      "آزمایش",
      "دندان",
      "ورزش",
      "باشگاه",
      "پیاده روی",
      "خواب",
      "ویتامین",
      "نوبت",
      "درمان",
      "بیمارستان",
      "رژیم",
    ],
  },
  {
    key: "learn",
    listHints: ["یادگیری", "آموزش", "مطالعه"],
    tag: "یادگیری",
    words: [
      "یادگیری",
      "کتاب",
      "دوره",
      "آموزش",
      "تمرین",
      "درس",
      "امتحان",
      "زبان",
      "کلاس",
      "مطالعه",
      "مقاله",
    ],
  },
  {
    key: "family",
    listHints: ["خانواده", "شخصی"],
    tag: "خانواده",
    words: [
      "خانواده",
      "مامان",
      "بابا",
      "مادر",
      "پدر",
      "بچه",
      "خواهر",
      "برادر",
      "همسر",
      "مهمانی",
      "تولد",
    ],
  },
  {
    key: "travel",
    listHints: ["سفر"],
    tag: "سفر",
    words: [
      "سفر",
      "بلیط",
      "بلیت",
      "هتل",
      "پرواز",
      "قطار",
      "پاسپورت",
      "ویزا",
      "چمدان",
      "رزرو",
    ],
  },
  {
    key: "personal",
    listHints: ["شخصی", "من"],
    tag: "شخصی",
    words: ["خودم", "شخصی", "آرایشگاه", "ناخن", "لباس", "کیف", "کفش"],
  },
];

const PRIORITY_3 = [
  "فوری",
  "فورى",
  "اورژانسی",
  "خیلی مهم",
  "حیاتی",
  "بحرانی",
  "همین حالا",
  "هرچه زودتر",
  "asap",
  "ضروری فوری",
];
const PRIORITY_2 = ["مهم", "ضروری", "حتما", "واجب", "زودتر", "زود", "خیلی زود"];
const PRIORITY_1 = ["معمولی", "کم اهمیت", "کماهمیت", "بعدا", "وقت شد"];

const UNITS = [
  "بسته",
  "عدد",
  "عددى",
  "تا",
  "کیلیو",
  "کیلو",
  "کیلوگرم",
  "گرم",
  "لیتر",
  "بطری",
  "شانه",
  "جعبه",
  "قرص",
  "حبه",
  "واحد",
  "قوطی",
  "کارتن",
  "دست",
  "کیلوی",
];
const TIME_UNITS = [
  "دقیقه",
  "دقیقه‌ی",
  "ساعت",
  "روز",
  "هفته",
  "ماه",
  "سال",
  "ثانیه",
];
const STOP = new Set([
  "و",
  "واسه",
  "برای",
  "در",
  "با",
  "از",
  "به",
  "تا",
  "بصورت",
  "فوری",
  "امروز",
  "فردا",
  "پس",
  "فردا",
  "دیگه",
  "دیگر",
  "بعد",
  "آینده",
  "بعدتر",
  "صبح",
  "ظهر",
  "عصر",
  "شب",
  "الان",
  "حتما",
  "مهم",
  "ضروری",
  "معمولی",
  "بعدا",
  "ساعت",
  "دقیقه",
  "تاریخ",
  "روز",
]);
const VERBS = new Set([
  "خرید",
  "بخر",
  "بخرم",
  "بخرید",
  "بگیر",
  "برو",
  "انجام",
  "بده",
  "تماس",
  "زنگ",
  "پیگیری",
  "چک",
  "بفرست",
  "ارسال",
  "بیار",
  "بپز",
  "درست",
  "کن",
  "بزن",
  "بنویس",
]);
const WORD_NUMBERS: Record<string, string> = {
  یک: "1",
  دو: "2",
  سه: "3",
  چهار: "4",
  پنج: "5",
  شش: "6",
  هفت: "7",
  هشت: "8",
  نه: "9",
  ده: "10",
};

function normalize(input: string): string {
  return input
    .replace(/\u200c/g, " ")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[،؛]/g, " ")
    .replace(/[()«»"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isQuantity(token: string): boolean {
  const ascii = token.replace(/[۰-۹]/g, (digit) =>
    String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
  );
  return /^\d{1,3}$/.test(ascii) || token in WORD_NUMBERS;
}

function quantityText(token: string): string {
  const ascii = token.replace(/[۰-۹]/g, (digit) =>
    String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
  );
  if (/^\d{1,3}$/.test(ascii)) return ascii;
  return WORD_NUMBERS[token] ?? token;
}

function emojiFor(text: string): string {
  for (const entry of EMOJI) {
    if (entry.words.some((word) => text.includes(word))) return entry.emoji;
  }
  return "🔹";
}

function groupHits(text: string): Map<string, number> {
  const hits = new Map<string, number>();
  for (const group of GROUPS) {
    let score = 0;
    for (const word of group.words) if (text.includes(word)) score += 2;
    for (const hint of group.listHints) if (text.includes(hint)) score += 1;
    if (score > 0) hits.set(group.key, score);
  }
  return hits;
}

/**
 * Pulls the "2 بسته پنیر" style items out of the sentence. The noun may come before the quantity
 * («شیر ۱ بسته خرما ۲ بسته») or after it («۲ بسته شیر») — both are handled.
 */
function extractItems(raw: string): { items: AnalysisItem[]; spans: string[] } {
  const tokens = raw.split(/\s+/).filter(Boolean);
  const used = new Set<number>();
  const items: AnalysisItem[] = [];
  const usable = (token: string | undefined): boolean =>
    Boolean(token) &&
    (token as string).length > 1 &&
    !isQuantity(token as string) &&
    !STOP.has(token as string) &&
    !VERBS.has(token as string);

  // Does this sentence put the noun after the quantity («۲ بسته شیر») or before it
  // («شیر ۱ بسته خرما ۲ بسته»)? The decision is taken once, from the first quantity.
  const firstQuantity = tokens.findIndex((token, index) => {
    if (!isQuantity(token)) return false;
    const next = tokens[index + 1] ?? "";
    return !TIME_UNITS.includes(next);
  });
  const nounFirst = firstQuantity > 0 && usable(tokens[firstQuantity - 1]);

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (!isQuantity(token)) continue;

    const next = tokens[index + 1] ?? "";
    const unit = UNITS.includes(next) ? next : null;
    if (TIME_UNITS.includes(next)) continue; // «۵ دقیقه دیگر» is a date, not an item

    const nounAfterIndex = index + (unit ? 2 : 1);
    const nounAfter = tokens[nounAfterIndex] ?? "";
    const before = index > 0 ? tokens[index - 1] : "";

    let noun = "";
    if (nounFirst && usable(before)) {
      noun = before;
      used.add(index - 1);
    } else if (usable(nounAfter)) {
      noun = nounAfter;
      used.add(nounAfterIndex);
    }
    used.add(index);
    if (unit) used.add(index + 1);

    items.push({
      quantity: quantityText(token),
      unit,
      noun,
      emoji: noun ? emojiFor(noun) : "🔹",
    });
  }

  return { items, spans: [...used].map((index) => tokens[index]) };
}

function itemLines(items: AnalysisItem[]): string {
  return items
    .filter((item) => item.noun || item.unit)
    .map(
      (item) =>
        `- ${item.emoji} ${toPersianDigits(item.quantity)}${
          item.unit ? ` ${item.unit}` : ""
        }${item.noun ? ` ${item.noun}` : ""}`,
    )
    .join("\n");
}

function stripWords(text: string, words: string[]): string {
  let result = text;
  for (const word of words) {
    result = result.replace(
      new RegExp(
        `(^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`,
        "g",
      ),
      " ",
    );
  }
  return result.replace(/\s+/g, " ").trim();
}

function scoreLists(
  text: string,
  lists: AnyDoList[],
): { list: AnyDoList | null; score: number } {
  let best: AnyDoList | null = null;
  let bestScore = 0;
  for (const list of lists) {
    let score = 0;
    const title = list.title.trim();
    if (title && text.includes(title)) score += 6;
    for (const group of GROUPS) {
      if (group.listHints.some((hint) => title.includes(hint))) {
        for (const word of group.words) if (text.includes(word)) score += 2;
        for (const hint of group.listHints) if (text.includes(hint)) score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = list;
    }
  }
  return { list: best, score: bestScore };
}

/** Deterministic analysis — always available, even without Raycast AI. */
export function heuristicAnalysis(
  input: string,
  ctx: AnalysisContext,
): TaskAnalysis {
  const now = ctx.now ?? new Date();
  const lists = ctx.lists ?? [];
  const raw = normalize(input);
  const parsed: ParsedTaskText = parseTaskText(raw, now);
  const noteMeta = parseNote(raw);

  const { items } = extractItems(raw);
  const hits = groupHits(raw);
  const ranked = [...hits.entries()].sort((left, right) => right[1] - left[1]);
  const topGroups = ranked.map(([key]) => key);

  // --- title -----------------------------------------------------------------
  let title = parsed.title || raw;
  for (const item of items) {
    const parts = [`${item.quantity}`, item.unit ?? "", item.noun].filter(
      Boolean,
    );
    for (const part of parts) title = stripWords(title, [part]);
  }
  title = stripWords(title, [
    ...PRIORITY_3,
    ...PRIORITY_2,
    ...PRIORITY_1,
    ...noteMeta.tags,
  ]);
  title = title
    .replace(/\s+/g, " ")
    .replace(/^[-–,.\s]+|[-–,.\s]+$/g, "")
    .trim();
  const titleWords = title.split(/\s+/).filter(Boolean);
  if (titleWords.length > 8) title = titleWords.slice(0, 8).join(" ");

  // «خرید خانه شیر …» — an explicit shopping intent takes the name of the shopping list
  const shoppingList = lists.find((list) => /خرید|بازار|سوپر/.test(list.title));
  const shoppingIntent = /(خرید|بازار|سوپرمارکت|فروشگاه)/.test(raw);
  if (shoppingIntent && shoppingList && title.length <= 24)
    title = shoppingList.title;
  if (!title.trim()) {
    title =
      items.find((item) => item.noun)?.noun ??
      raw.split(/\s+/).slice(0, 5).join(" ");
  }

  // --- note ------------------------------------------------------------------
  const lines: string[] = [];
  const itemBlock = itemLines(items);
  if (itemBlock) lines.push(itemBlock);
  const leftover = stripWords(
    stripWords(
      raw,
      title.split(/\s+/).filter((word) => word.length > 1),
    ),
    [
      ...items.map((item) => item.noun).filter(Boolean),
      ...PRIORITY_1,
      ...PRIORITY_2,
      ...PRIORITY_3,
    ],
  );
  if (!itemBlock && leftover.length > 3 && leftover !== title)
    lines.push(leftover);
  const note = lines.join("\n");

  // --- tags -----------------------------------------------------------------
  const tags = [
    ...new Set([
      ...noteMeta.tags,
      ...topGroups
        .slice(0, 2)
        .map((key) => GROUPS.find((group) => group.key === key)?.tag ?? ""),
    ]),
  ]
    .filter(Boolean)
    .slice(0, 3);

  // --- priority --------------------------------------------------------------
  let priority: Priority = noteMeta.priority;
  if (priority === 0) {
    if (PRIORITY_3.some((word) => raw.includes(word))) priority = 3;
    else if (PRIORITY_2.some((word) => raw.includes(word))) priority = 2;
    else if (PRIORITY_1.some((word) => raw.includes(word))) priority = 1;
  }
  if (parsed.date && parsed.hasTime) {
    const minutesAway = (parsed.date.getTime() - now.getTime()) / 60_000;
    if (minutesAway <= 60) priority = 3 as Priority;
    else if (minutesAway <= 6 * 60 && priority < 2) priority = 2 as Priority;
  }

  // --- list ------------------------------------------------------------------
  const scored = scoreLists(raw, lists);
  let list: AnyDoList | null = scored.list;
  if (!list) {
    const preferred = ctx.defaultListName
      ? lists.find(
          (candidate) => candidate.title.trim() === ctx.defaultListName,
        )
      : undefined;
    list = preferred ?? lists[0] ?? null;
  }
  if (!list && topGroups.length > 0) {
    const tag = GROUPS.find((group) => group.key === topGroups[0])?.tag;
    list =
      lists.find((candidate) => candidate.title.includes(tag ?? "")) ?? null;
  }

  const reasonParts = [
    parsed.date
      ? `${formatJalaliDateTime(parsed.date, parsed.hasTime)}`
      : "بدون تاریخ",
    items.length > 0 ? `${toPersianDigits(items.length)} قلم` : "",
    priority > 0 ? `اولویت ${toPersianDigits(priority)}` : "",
    list ? list.title : "",
  ].filter(Boolean);

  return {
    title: title.trim(),
    note,
    tags,
    priority,
    listId: list?.list_id ?? null,
    listTitle: list?.title ?? null,
    date: parsed.date,
    hasTime: parsed.hasTime,
    source: "rules",
    reason: reasonParts.join(" · "),
    items,
  };
}

export interface AiSuggestion {
  title?: string;
  note?: string;
  tags?: string[];
  priority?: number;
  list?: string;
  reason?: string;
}

/**
 * Merges an AI suggestion into a deterministic analysis. Anything that does not look sane is thrown
 * away — the AI can never introduce a list that does not exist, an impossible priority, or a note
 * that is not plain text. The date always comes from the deterministic parser.
 */
export function mergeSuggestion(
  base: TaskAnalysis,
  suggestion: AiSuggestion | null,
  ctx: AnalysisContext,
): TaskAnalysis {
  if (!suggestion) return base;
  const lists = ctx.lists ?? [];
  const merged: TaskAnalysis = { ...base, source: "ai" };

  const title = (suggestion.title ?? "").replace(/\s+/g, " ").trim();
  if (title.length >= 2 && title.length <= 120) merged.title = title;

  const note = (suggestion.note ?? "").trim();
  if (note.length > 0 && note.length <= 600 && !/[<>]/.test(note))
    merged.note = note;

  const tags = (suggestion.tags ?? [])
    .map((tag) => String(tag).replace(/^#/, "").replace(/\s+/g, " ").trim())
    .filter((tag) => tag.length > 0 && tag.length <= 24)
    .slice(0, 3);
  if (tags.length > 0)
    merged.tags = [...new Set([...base.tags, ...tags])].slice(0, 3);

  const priority = Number(suggestion.priority);
  if (Number.isFinite(priority) && priority >= 0 && priority <= 3) {
    merged.priority = Math.round(priority) as Priority;
  }

  const wanted = (suggestion.list ?? "").trim();
  if (wanted) {
    const match = lists.find((list) => list.title.trim() === wanted);
    if (match) {
      merged.listId = match.list_id;
      merged.listTitle = match.title;
    }
  }

  if (suggestion.reason && suggestion.reason.trim().length > 0) {
    merged.reason = suggestion.reason.trim().slice(0, 80);
  }
  return merged;
}

/** Builds the prompt for the Raycast AI pass. */
export function buildPrompt(input: string, ctx: AnalysisContext): string {
  const listNames = (ctx.lists ?? []).map((list) => list.title).join("، ");
  const knownTags = (ctx.knownTags ?? []).join("، ");
  return [
    "تو دستیار تسک فارسی هستی. متن کاربر را تحلیل کن و فقط یک شیء JSON برگردان؛ هیچ توضیح اضافه‌ای ننویس.",
    'قالب: {"title":"…","note":"- 😀 ۱ بسته شیر\\n- 😀 ۲ بسته خرما","tags":["خرید"],"priority":0,"list":"نام لیست","reason":"کوتاه"}',
    "قواعد:",
    "۱) title حداکثر ۸ کلمه، طبیعی و بدون تاریخ/ساعت/کلمه‌ی اولویت/واژه‌های اضافی مثل «واسه».",
    "۲) note: اگر متن اقلام دارد (مثل «۱ بسته شیر») هر قلم را در یک خط جدا با ایموجی مناسب و با «- » بنویس؛ اگر توضیح دیگری بود همان را مرتب کن.",
    "۳) tags: حداکثر ۳ برچسب کوتاه فارسی مرتبط با کلیت متن.",
    "۴) priority: عدد صحیح ۰ (معمولی) ۱ (کم) ۲ (مهم) ۳ (فوری). اگر در متن «فوری/ضروری» بود ۳.",
    `۵) list: فقط و فقط یکی از این نام‌ها: ${listNames}`,
    knownTags
      ? `برچسب‌های موجود کاربر: ${knownTags} (اگر مناسب بود از همین‌ها استفاده کن)`
      : "",
    "۶) اگر مقدار مطمئنی برای فیلدی نداری، همان را خالی بگذار.",
    `متن کاربر: «${input}»`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Pulls the first JSON object out of an AI answer. */
export function extractJson(answer: string): AiSuggestion | null {
  const start = answer.indexOf("{");
  const end = answer.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(answer.slice(start, end + 1)) as AiSuggestion;
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}
