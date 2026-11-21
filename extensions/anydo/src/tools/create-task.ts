import { makeClient } from "../anydo/auth";
import { toLocalIso } from "../anydo/format";
import { listTitleOf, normalizeForSearch } from "../anydo/match";
import { describeParse, parseTaskText } from "../anydo/parse";

type Input = {
  /**
   * متن تسک به زبان طبیعی. تاریخ شمسی/میلادی و ساعت‌هایی مثل «۱۹:۰۰»، «۹ شب» و عبارت‌های
   * «فردا»، «پس‌فردا»، «دوشنبه» و «۲۵ آبان» پشتیبانی می‌شوند.
   * مثال: «طراحی سایت رامتین ترابر در تاریخ ۱۴۰۵/۰۸/۱۵ در ساعت ۱۹:۰۰»
   */
  text: string;
  /** عنوان لیست مقصد (اختیاری؛ پیش‌فرض اولین لیست) */
  list?: string;
  /** نوت دلخواه برای تسک (اختیاری) */
  note?: string;
};

/** Confirms the side effect before the task is created. */
export const confirmation = (input: Input) => {
  const parsed = parseTaskText(input.text);
  return {
    message: `تسک «${parsed.title}» در Any.do ساخته شود؟`,
    info: [
      { name: "زمان", value: describeParse(parsed) },
      { name: "لیست", value: input.list ?? "لیست پیش‌فرض" },
    ],
  };
};

/** Creates an Any.do task out of free-form Persian text. */
export default async function tool({ text, list, note }: Input) {
  const client = makeClient();
  const lists = await client.getLists();
  if (lists.length === 0)
    throw new Error("هیچ لیست Any.do وجود ندارد؛ اول یک لیست بساز.");

  const parsed = parseTaskText(text);
  if (!parsed.title.trim())
    throw new Error("عنوان تسک خالی است؛ متن را واضح‌تر بفرست.");

  const target =
    (list
      ? lists.find((entry) =>
          normalizeForSearch(entry.title).includes(normalizeForSearch(list)),
        )
      : undefined) ?? lists[0];

  const created = await client.createTask({
    listId: target.list_id,
    title: parsed.title,
    note: note ?? null,
    datetime: parsed.date ? toLocalIso(parsed.date) : null,
  });

  return {
    created: true,
    id: created.task_id,
    title: created.title,
    list: listTitleOf(lists, created.list_id),
    due: describeParse(parsed),
    interpretedAs: parsed.notes,
  };
}
