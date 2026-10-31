/**
 * Unit tests for the Persian date/time parser and the Jalali <-> Gregorian layer.
 *
 *   npm run test:parser
 */
import { dateToJalaali, formatJalaliDate, jalaaliToDate, toAsciiDigits, toPersianDigits } from "../src/anydo/jalali.ts";
import { parseTaskText } from "../src/anydo/parse.ts";
import { composeNote, normalizeTags, parseNote, priorityLabel } from "../src/anydo/tags.ts";

let failures = 0;
let checks = 0;

function check(label: string, actual: unknown, expected: unknown) {
  checks++;
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  if (same) {
    console.log(`ok   ${label}`);
  } else {
    failures++;
    console.log(`FAIL ${label}\n     expected: ${JSON.stringify(expected)}\n     actual:   ${JSON.stringify(actual)}`);
  }
}

const iso = (date: Date | null) =>
  date
    ? `${date.getFullYear().toString().padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate(),
      ).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
    : null;

console.log("== Jalali <-> Gregorian (known anchors) ==");
check("1405/08/15", iso(jalaaliToDate(1405, 8, 15)), "2026-11-06T00:00");
check("1357/11/22 (انقلاب)", iso(jalaaliToDate(1357, 11, 22)), "1979-02-11T00:00");
check("1400/01/01", iso(jalaaliToDate(1400, 1, 1)), "2021-03-21T00:00");
check("1403/01/01", iso(jalaaliToDate(1403, 1, 1)), "2024-03-20T00:00");
check("1399/01/01", iso(jalaaliToDate(1399, 1, 1)), "2020-03-20T00:00");
check("1405/08/15 reverse", (() => {
  const { jy, jm, jd } = dateToJalaali(new Date(2026, 10, 6));
  return `${jy}/${jm}/${jd}`;
})(), "1405/8/15");
check("format 2026-11-06", formatJalaliDate(new Date(2026, 10, 6)), "۱۵ آبان ۱۴۰۵");

console.log("== digits ==");
check("toAsciiDigits(۱۲۳)", toAsciiDigits("۱۲۳"), "123");
check("toAsciiDigits(١٢٣)", toAsciiDigits("١٢٣"), "123");
check("toPersianDigits(09)", toPersianDigits("09"), "۰۹");

console.log("== free text parsing ==");
const saturday = new Date(2026, 9, 31, 12, 0, 0); // 2026-10-31 (شنبه) 12:00

const main = parseTaskText("( طراحی سایت رامتین ترابر در تاریخ 05/11/2026 در ساعت 19:00 )", saturday);
check("main example · title", main.title, "طراحی سایت رامتین ترابر");
check("main example · date", iso(main.date), "2026-11-05T19:00");

const tomorrow = parseTaskText("جلسه با تیم فردا ساعت ۱۰ صبح", saturday);
check("فردا · title", tomorrow.title, "جلسه با تیم");
check("فردا · date", iso(tomorrow.date), "2026-11-01T10:00");

const aban = parseTaskText("۲۵ آبان خرید هدیه", saturday);
check("۲۵ آبان · title", aban.title, "خرید هدیه");
check("۲۵ آبان · date", iso(aban.date), "2026-11-16T09:00");

const jalaliNumeric = parseTaskText("۱۴۰۵/۰۸/۱۵ یادآوری قبض", saturday);
check("۱۴۰۵/۰۸/۱۵ · title", jalaliNumeric.title, "یادآوری قبض");
check("۱۴۰۵/۰۸/۱۵ · date", iso(jalaliNumeric.date), "2026-11-06T09:00");

const isoStyle = parseTaskText("گزارش هفتگی 2026-11-05 14:00", saturday);
check("ISO 2026-11-05 · title", isoStyle.title, "گزارش هفتگی");
check("ISO 2026-11-05 · date", iso(isoStyle.date), "2026-11-05T14:00");

const monday = parseTaskText("دوشنبه ساعت ۹ تماس با مشتری", saturday);
check("دوشنبه · title", monday.title, "تماس با مشتری");
check("دوشنبه · date", iso(monday.date), "2026-11-02T09:00");

const afterTomorrow = parseTaskText("پس فردا ساعت ۱۴:۳۰ جلسه فروش", saturday);
check("پس فردا · title", afterTomorrow.title, "جلسه فروش");
check("پس فردا · date", iso(afterTomorrow.date), "2026-11-02T14:30");

const threeDays = parseTaskText("۳ روز دیگر گزارش بفرست", saturday);
check("۳ روز دیگر · date", iso(threeDays.date), "2026-11-03T09:00");

const tonight = parseTaskText("امشب ساعت ۱۰ فیلم", saturday);
check("امشب · date", iso(tonight.date), "2026-10-31T22:00");

const nowruzCheck = parseTaskText("نوروز 1405/01/01", saturday);
check("نوروز ۱۴۰۵ · date", iso(nowruzCheck.date), "2026-03-21T09:00");

const noDate = parseTaskText("خرید نان", saturday);
check("بدون تاریخ · title", noDate.title, "خرید نان");
check("بدون تاریخ · date", noDate.date, null);

const past = parseTaskText("ساعت ۹ صبح ورزش", new Date(2026, 9, 31, 15, 0, 0));
check("ساعت گذشته → فردا", iso(past.date), "2026-11-01T09:00");

const evening = parseTaskText("۹ شب شام با خانواده", saturday);
check("۹ شب · date", iso(evening.date), "2026-10-31T21:00");

console.log("== tags & priority (simulated in the note) ==");
const tagged = parseNote("!! #منزل #کار خرید نان");
check("parse tags", tagged.tags, ["منزل", "کار"]);
check("parse priority", tagged.priority, 2);
check("parse text", tagged.text, "خرید نان");
check("compose", composeNote("خرید نان", ["منزل", "#کار"], 2), "!! #منزل #کار خرید نان");
check("round trip", parseNote(composeNote("جلسه با تیم", ["work"], 3)), {
  tags: ["work"],
  priority: 3,
  text: "جلسه با تیم",
});
check("single mark", parseNote("وظیفه مهم!").priority, 1);
check("empty note", parseNote(null), { tags: [], priority: 0, text: "" });
check("normalizeTags", normalizeTags("#منزل, کار  #شخصی"), ["منزل", "کار", "شخصی"]);
check("priorityLabel(3)", priorityLabel(3), "فوری");
check("text with only markers", parseNote("!!! #کار").text, "");

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.log(`PARSER TESTS FAILED (${failures})`);
  process.exit(1);
}
console.log("PARSER TESTS OK");
