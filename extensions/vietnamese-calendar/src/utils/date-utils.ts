import {
  differenceInCalendarDays,
  format,
  getISOWeek,
  getDayOfYear,
} from "date-fns";
import { SolarDate, LunarDate } from "lunar-date-vn";

export function getDateDiff(date: Date): string {
  const today = new Date();
  const diff = differenceInCalendarDays(date, today);

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 0) return `In ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

// Ten Heavenly Stems
const CAN = [
  "Giáp",
  "Ất",
  "Bính",
  "Đinh",
  "Mậu",
  "Kỷ",
  "Canh",
  "Tân",
  "Nhâm",
  "Quý",
];
// Twelve Earthly Branches
const CHI = [
  "Tý",
  "Sửu",
  "Dần",
  "Mão",
  "Thìn",
  "Tỵ",
  "Ngọ",
  "Mùi",
  "Thân",
  "Dậu",
  "Tuất",
  "Hợi",
];

const CHI_EMOJI = [
  "🐭", // Tý (Rat)
  "🐮", // Sửu (Ox)
  "🐯", // Dần (Tiger)
  "😺", // Mão (Cat - Vietnam) / Rabbit
  "🐲", // Thìn (Dragon)
  "🐍", // Tỵ (Snake)
  "🐴", // Ngọ (Horse)
  "🐐", // Mùi (Goat)
  "🐵", // Thân (Monkey)
  "🐔", // Dậu (Rooster)
  "🐶", // Tuất (Dog)
  "🐷", // Hợi (Pig)
];

export interface CanChiInfo {
  year: string;
  month: string;
  day: string;
}

export function getCanChi(date: Date): CanChiInfo {
  const solar = new SolarDate(date);
  const lunar = solar.toLunarDate();
  if (!lunar || !lunar.get) {
    return {
      year: format(date, "yyyy"),
      month: format(date, "MM"),
      day: format(date, "dd"),
    };
  }
  const lunarInfo = lunar.get();

  // 1. Year Can Chi (Using library provided if available, else calc)
  const yearName = lunarInfo.year_name;

  // 2. Month Can Chi
  // Month Can depends on Year Can.
  // Year Can Index: (Year number + 6) % 10.
  // 0: Canh, 1: Tân, 2: Nhâm, 3: Quý, 4: Giáp, 5: Ất, 6: Bính, 7: Đinh, 8: Mậu, 9: Kỷ
  // Wait, standard mapping usually: 0=Giáp ... 9=Quý.
  // Formula for Year Can: (Year - 3) % 10 (if 0-indexed with Giap=0) or similar.
  // Let's rely on a standard formula for Month Can based on Year Can.

  // Can index (0=Giap...9=Quy):
  // "Giap" corresponds to 0.
  // Year Can derives from Last digit of year? No.
  // Let's reverse engineer Year Can from name if possible, or calculate from year index.
  const yearCanIndex = (lunarInfo.year - 4) % 10; // 0=Giap (for 1984), 1=At, etc.

  // Month 1 starts with:
  // Year starts with Giap (0) or Ky (5) -> Month 1 is Binh (2)
  // Year starts with At (1) or Canh (6) -> Month 1 is Mau (4)
  // Year starts with Binh (2) or Tan (7) -> Month 1 is Canh (6)
  // Year starts with Dinh (3) or Nham (8) -> Month 1 is Nham (8)
  // Year starts with Mau (4) or Quy (9) -> Month 1 is Giap (0)

  // Formula: (YearCanIndex % 5 + 1) * 2 % 10 = First Month Can Index
  const firstMonthCan = ((yearCanIndex % 5) + 1) * 2;
  const monthCanIndex = (firstMonthCan + (lunarInfo.month - 1)) % 10;

  const monthChiIndex = (lunarInfo.month + 1) % 12; // Month 1 is usually Dan (Tiger) -> Index 2

  const monthName = `${CAN[monthCanIndex]} ${CHI[monthChiIndex]} ${CHI_EMOJI[monthChiIndex]}`;

  // 3. Day Can Chi
  // Requires Julian Day.
  const jd = lunarInfo.julian || 0;
  // Day Can: (jd + 9) % 10
  const dayCanIndex = (jd + 9) % 10;
  // Day Chi: (jd + 1) % 12
  const dayChiIndex = (jd + 1) % 12;

  const dayName = `${CAN[dayCanIndex]} ${CHI[dayChiIndex]} ${CHI_EMOJI[dayChiIndex]}`;

  // Calculate Year Emoji as well
  // Year Chi is not explicitly calculated above (library gives name), but we can derive index
  // Year Can Index = (Year - 4) % 10
  // Year Chi Index = (Year - 4) % 12
  const yearChiIndex = (lunarInfo.year - 4) % 12;
  const yearNameWithEmoji = `${yearName} ${CHI_EMOJI[yearChiIndex]}`;

  return {
    year: yearNameWithEmoji,
    month: monthName,
    day: dayName,
  };
}

export function getFullDetail(date: Date) {
  const canChi = getCanChi(date);
  const weekOfYear = getISOWeek(date);
  const dayOfYear = getDayOfYear(date);
  const dayOfWeek = format(date, "EEEE");

  return {
    canChi,
    weekOfYear,
    dayOfYear,
    dayOfWeek,
  };
}

export function getDayOccurrences(
  inputDate: Date,
  startOffset: number = -5,
  endOffset: number = 5,
): Date[] {
  const currentYear = inputDate.getFullYear();
  const dates: Date[] = [];

  // We want the same day/month in [startOffset, endOffset] years relative to current.
  const targetMonth = inputDate.getMonth();
  const targetDate = inputDate.getDate();

  for (let i = startOffset; i <= endOffset; i++) {
    const y = currentYear + i;
    // Check if date exists
    // Construct date
    const d = new Date(y, targetMonth, targetDate);
    // Verify it's the same month (in case of Feb 29 -> Mar 1 rollover in JS)
    if (d.getMonth() === targetMonth) {
      dates.push(d);
    } else {
      // It rolled over (Feb 29 on non-leap year).
      // Let's push 0th day of next month (last day of current month)
      dates.push(new Date(y, targetMonth + 1, 0));
    }
  }
  return dates;
}

export function getLunarDayOccurrences(
  inputDate: Date,
  startOffset: number = -5,
  endOffset: number = 5,
): Date[] {
  const solar = new SolarDate(inputDate);
  const lunar = solar.toLunarDate();
  if (!lunar) return [inputDate];

  const { day, month, year } = lunar.get();
  const dates: Date[] = [];

  for (let i = startOffset; i <= endOffset; i++) {
    const targetLunarYear = year + i;
    try {
      const l = new LunarDate({
        day,
        month,
        year: targetLunarYear,
        hour: 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lAny = l as any;
      if (typeof lAny.init === "function") {
        lAny.init();
      }
      const targetSolar = l.toSolarDate();
      if (targetSolar) {
        dates.push(targetSolar.toDate());
      }
    } catch (e) {
      console.error(
        `Error calculating lunar occurrence for ${day}/${month}/${targetLunarYear}`,
        e,
      );
    }
  }
  return dates;
}

export function getWeekMonthOccurrences(
  inputDate: Date,
  startOffset: number = -5,
  endOffset: number = 5,
): Date[] {
  const currentYear = inputDate.getFullYear();
  const dates: Date[] = [];
  const targetDayOfWeek = inputDate.getDay(); // 0 (Sun) - 6 (Sat)
  const targetMonth = inputDate.getMonth();

  // Determine which occurrence of the weekday implementationDate is (e.g., 2nd Sunday)
  // We iterate from day 1 of month until we hit our date
  // Actually simpler: ceil(dayOfMonth / 7) ??
  // No, that gives week of month roughly.
  // Precise way: count how many times this weekday appeared before or on this date.
  let occurrence = 0;
  for (let d = 1; d <= inputDate.getDate(); d++) {
    const temp = new Date(currentYear, targetMonth, d);
    if (temp.getDay() === targetDayOfWeek) {
      occurrence++;
    }
  }

  for (let i = startOffset; i <= endOffset; i++) {
    const y = currentYear + i;
    // Find the Nth occurrence of targetDayOfWeek in month targetMonth of year y
    let count = 0;
    // Maximum days in month is 31
    for (let d = 1; d <= 31; d++) {
      const temp = new Date(y, targetMonth, d);
      // Check if we rolled over to next month (for months with < 31 days)
      if (temp.getMonth() !== targetMonth) break;

      if (temp.getDay() === targetDayOfWeek) {
        count++;
        if (count === occurrence) {
          dates.push(temp);
          break;
        }
      }
    }
  }

  return dates;
}

const SOLAR_TERM_EMOJIS: Record<string, string> = {
  "xuân phân": "🌸",
  "thanh minh": "🌿",
  "cốc vũ": "🌧️",
  "lập hạ": "☀️",
  "tiểu mãn": "🌾",
  "mang chủng": "🌱",
  "hạ chí": "🏖️",
  "tiểu thử": "🌡️",
  "đại thử": "🔥",
  "lập thu": "🍂",
  "xử thử": "🌬️",
  "bạch lộ": "💧",
  "thu phân": "🍁",
  "hàn lộ": "🌫️",
  "sương giáng": "❄️",
  "lập đông": "🍃",
  "tiểu tuyết": "🌨️",
  "đại tuyết": "❄️",
  "đông chí": "☃️",
  "tiểu hàn": "🥶",
  "đại hàn": "🌬️",
  "lập xuân": "🌱",
  "vũ thủy": "🌂",
  "kinh trập": "🐛",
};

export function getSolarTerm(
  date: Date,
): { name: string; emoji: string; day: number } | null {
  const s = new SolarDate(date);
  const l = s.toLunarDate();
  if (!l) return null;
  const termName = l.getSolarTerm();
  if (!termName) return null;

  // Step backward to find the start of this term
  const temp = new Date(date);
  temp.setHours(12, 0, 0, 0); // avoid timezone/DST issues

  let days = 0;
  while (days < 31) {
    const sTemp = new SolarDate(temp);
    const lTemp = sTemp.toLunarDate();
    if (!lTemp || lTemp.getSolarTerm() !== termName) {
      break;
    }
    days++;
    temp.setDate(temp.getDate() - 1);
  }

  const formattedName = termName
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const emoji = SOLAR_TERM_EMOJIS[termName.toLowerCase()] || "📅";

  return { name: formattedName, emoji, day: days };
}
