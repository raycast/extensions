const HEBREW_MONTHS: Record<string, string> = {
  Nisan: "ניסן",
  Iyar: "אייר",
  Sivan: "סיון",
  Tamuz: "תמוז",
  Tammuz: "תמוז",
  Av: "אב",
  Elul: "אלול",
  Tishri: "תשרי",
  Heshvan: "חשון",
  Kislev: "כסלו",
  Tevet: "טבת",
  Shevat: "שבט",
  Adar: "אדר",
  "Adar I": "אדר א'",
  "Adar II": "אדר ב'",
};

const HEBREW_LETTERS = [
  [400, "ת"],
  [300, "ש"],
  [200, "ר"],
  [100, "ק"],
  [90, "צ"],
  [80, "פ"],
  [70, "ע"],
  [60, "ס"],
  [50, "נ"],
  [40, "מ"],
  [30, "ל"],
  [20, "כ"],
  [10, "י"],
  [9, "ט"],
  [8, "ח"],
  [7, "ז"],
  [6, "ו"],
  [5, "ה"],
  [4, "ד"],
  [3, "ג"],
  [2, "ב"],
  [1, "א"],
] as const;

function formatHebrewNumber(input: number): string {
  let value = input >= 1000 ? input % 1000 : input;
  let letters = "";

  while (value > 0) {
    if (value === 15) {
      letters += "טו";
      break;
    }

    if (value === 16) {
      letters += "טז";
      break;
    }

    const [amount, letter] = HEBREW_LETTERS.find(([amount]) => value >= amount)!;
    letters += letter;
    value -= amount;
  }

  return letters.length === 1 ? `${letters}'` : `${letters.slice(0, -1)}"${letters.slice(-1)}`;
}

export function getHebrewDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-u-ca-hebrew", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(date);

  const day = Number(parts.find((part) => part.type === "day")?.value);
  const month = parts.find((part) => part.type === "month")?.value;
  const year = Number(parts.find((part) => part.type === "year")?.value);

  if (!day || !month || !year || !HEBREW_MONTHS[month]) {
    throw new Error("Unable to format Hebrew date");
  }

  return [formatHebrewNumber(day), HEBREW_MONTHS[month], formatHebrewNumber(year)].join(" ");
}

export function getHebrewDateAfterShkia(date = new Date()): string {
  const afterShkiaDate = new Date(date);
  afterShkiaDate.setDate(afterShkiaDate.getDate() + 1);

  return getHebrewDate(afterShkiaDate);
}
