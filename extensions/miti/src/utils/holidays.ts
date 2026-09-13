/**
 * Nepali Public Holidays
 *
 * Contains major public holidays for BS 2083 (April 2026 – April 2027).
 * Holidays with bsYear undefined are recurring fixed-date holidays.
 */

import {
  BsDate,
  differenceInBsDays,
  getTodayBs,
  getBsMonthName,
  bsToAd,
  formatAdDate,
} from "./nepali-date";

export type HolidayType = "public" | "cultural" | "religious";

export interface Holiday {
  name: string;
  nameNp: string;
  bsMonth: number;
  bsDay: number;
  bsYear?: number; // undefined = recurring every year
  type: HolidayType;
  description: string;
}

// ─── Holiday Dataset (BS 2083 + recurring) ──────────────────────────────────

export const HOLIDAYS: Holiday[] = [
  // Recurring fixed-date holidays
  {
    name: "Nepali New Year",
    nameNp: "नयाँ वर्ष",
    bsMonth: 1,
    bsDay: 1,
    type: "public",
    description: "First day of Baishakh — beginning of the Bikram Sambat year",
  },
  {
    name: "Labour Day",
    nameNp: "श्रमिक दिवस",
    bsMonth: 1,
    bsDay: 18,
    type: "public",
    description: "International Workers' Day",
  },
  {
    name: "Constitution Day",
    nameNp: "संविधान दिवस",
    bsMonth: 6,
    bsDay: 3,
    type: "public",
    description: "Anniversary of the Constitution of Nepal (2072 BS)",
  },
  {
    name: "Prithvi Jayanti",
    nameNp: "पृथ्वी जयन्ती",
    bsMonth: 9,
    bsDay: 27,
    type: "public",
    description:
      "National Unity Day — birth anniversary of Prithvi Narayan Shah",
  },
  {
    name: "Martyrs' Day",
    nameNp: "शहीद दिवस",
    bsMonth: 10,
    bsDay: 16,
    type: "public",
    description: "In memory of martyrs who fought for democracy",
  },
  {
    name: "Democracy Day",
    nameNp: "प्रजातन्त्र दिवस",
    bsMonth: 11,
    bsDay: 7,
    type: "public",
    description: "Celebration of the establishment of democracy in Nepal",
  },
  {
    name: "Int'l Women's Day",
    nameNp: "अन्तर्राष्ट्रिय महिला दिवस",
    bsMonth: 11,
    bsDay: 24,
    type: "public",
    description: "International Women's Day",
  },

  // BS 2083-specific festivals
  {
    name: "Buddha Jayanti",
    nameNp: "बुद्ध जयन्ती",
    bsMonth: 1,
    bsDay: 18,
    bsYear: 2083,
    type: "religious",
    description: "Birth anniversary of Gautam Buddha — Lumbini celebrations",
  },
  {
    name: "Republic Day",
    nameNp: "गणतन्त्र दिवस",
    bsMonth: 2,
    bsDay: 15,
    bsYear: 2083,
    type: "public",
    description: "Anniversary of the Federal Democratic Republic of Nepal",
  },
  {
    name: "Ghatasthapana",
    nameNp: "घटस्थापना",
    bsMonth: 6,
    bsDay: 25,
    bsYear: 2083,
    type: "religious",
    description: "Beginning of Dashain — planting of Jamara",
  },
  {
    name: "Phulpati",
    nameNp: "फूलपाती",
    bsMonth: 7,
    bsDay: 1,
    bsYear: 2083,
    type: "public",
    description:
      "Seventh day of Dashain — sacred flowers brought to Dashain Ghar",
  },
  {
    name: "Maha Ashtami",
    nameNp: "महाअष्टमी",
    bsMonth: 7,
    bsDay: 2,
    bsYear: 2083,
    type: "public",
    description: "Eighth day of Dashain — sacrificial offerings to Durga",
  },
  {
    name: "Maha Navami",
    nameNp: "महानवमी",
    bsMonth: 7,
    bsDay: 3,
    bsYear: 2083,
    type: "public",
    description: "Ninth day of Dashain — worship of tools and vehicles",
  },
  {
    name: "Vijaya Dashami",
    nameNp: "विजया दशमी",
    bsMonth: 7,
    bsDay: 4,
    bsYear: 2083,
    type: "public",
    description:
      "Victory of good over evil — receiving Tika and Jamara from elders",
  },
  {
    name: "Laxmi Puja",
    nameNp: "लक्ष्मी पूजा",
    bsMonth: 7,
    bsDay: 22,
    bsYear: 2083,
    type: "religious",
    description: "Tihar — worship of Goddess Laxmi for wealth and prosperity",
  },
  {
    name: "Gai Tihar / Mha Puja",
    nameNp: "गाई तिहार / म्ह पूजा",
    bsMonth: 7,
    bsDay: 24,
    bsYear: 2083,
    type: "cultural",
    description: "Worship of cows (Gai Tihar) and self (Mha Puja for Newars)",
  },
  {
    name: "Bhai Tika",
    nameNp: "भाई टीका",
    bsMonth: 7,
    bsDay: 25,
    bsYear: 2083,
    type: "public",
    description:
      "Sisters apply Tika to brothers — the most important day of Tihar",
  },
  {
    name: "Chhath Parba",
    nameNp: "छठ पर्व",
    bsMonth: 7,
    bsDay: 29,
    bsYear: 2083,
    type: "cultural",
    description: "Worship of Sun God — primarily celebrated in Terai",
  },
  {
    name: "Tamu Losar",
    nameNp: "तमु ल्होसार",
    bsMonth: 9,
    bsDay: 15,
    bsYear: 2083,
    type: "cultural",
    description: "Gurung New Year celebration",
  },
  {
    name: "Christmas Day",
    nameNp: "क्रिसमस",
    bsMonth: 9,
    bsDay: 10,
    bsYear: 2083,
    type: "cultural",
    description: "Celebration of the birth of Jesus Christ",
  },
  {
    name: "Maghe Sankranti",
    nameNp: "माघे संक्रान्ति",
    bsMonth: 10,
    bsDay: 1,
    bsYear: 2083,
    type: "public",
    description:
      "Harvest festival marking the beginning of Magh — Ghee, Til, and Yam",
  },
  {
    name: "Sonam Losar",
    nameNp: "सोनम ल्होसार",
    bsMonth: 10,
    bsDay: 24,
    bsYear: 2083,
    type: "cultural",
    description: "Tamang New Year celebration",
  },
  {
    name: "Maha Shivaratri",
    nameNp: "महा शिवरात्री",
    bsMonth: 11,
    bsDay: 22,
    bsYear: 2083,
    type: "religious",
    description: "Great night of Lord Shiva — celebrated at Pashupatinath",
  },
  {
    name: "Gyalpo Losar",
    nameNp: "ग्याल्पो ल्होसार",
    bsMonth: 11,
    bsDay: 25,
    bsYear: 2083,
    type: "cultural",
    description: "Sherpa and Tibetan New Year celebration",
  },
];

/**
 * Get upcoming holidays from today's BS date.
 * Returns holidays sorted by proximity, limited to `limit`.
 */
export function getUpcomingHolidays(
  limit = 8,
): (Holiday & { daysUntil: number; bsDate: BsDate; adDate: Date })[] {
  const today = getTodayBs();
  const currentYear = today.year;

  const candidates: (Holiday & {
    daysUntil: number;
    bsDate: BsDate;
    adDate: Date;
  })[] = [];

  for (const h of HOLIDAYS) {
    // Use specific year if set, otherwise current year
    const year = h.bsYear ?? currentYear;
    const bsDate: BsDate = { year, month: h.bsMonth, day: h.bsDay };

    try {
      const daysUntil = differenceInBsDays(today, bsDate);
      if (daysUntil >= 0) {
        const adDate = bsToAd(bsDate.year, bsDate.month, bsDate.day);
        candidates.push({ ...h, daysUntil, bsDate, adDate });
      }
    } catch {
      // Skip holidays with invalid dates for this year
    }
  }

  // Also check recurring holidays for next year if we're near year-end
  if (today.month >= 10) {
    for (const h of HOLIDAYS) {
      if (h.bsYear) continue; // Skip year-specific ones
      const nextYear = currentYear + 1;
      const bsDate: BsDate = { year: nextYear, month: h.bsMonth, day: h.bsDay };
      try {
        const daysUntil = differenceInBsDays(today, bsDate);
        if (daysUntil >= 0) {
          const adDate = bsToAd(bsDate.year, bsDate.month, bsDate.day);
          candidates.push({ ...h, daysUntil, bsDate, adDate });
        }
      } catch {
        // Skip
      }
    }
  }

  candidates.sort((a, b) => a.daysUntil - b.daysUntil);
  return candidates.slice(0, limit);
}

/**
 * Check if a given BS date is a public holiday.
 * Returns the holiday if found, null otherwise.
 */
export function getHolidayOnDate(bsDate: BsDate): Holiday | null {
  return (
    HOLIDAYS.find((h) => {
      const yearMatch = !h.bsYear || h.bsYear === bsDate.year;
      return yearMatch && h.bsMonth === bsDate.month && h.bsDay === bsDate.day;
    }) ?? null
  );
}

/** Format holiday info string for detail views. */
export function formatHolidayDetail(
  h: Holiday & { bsDate: BsDate; adDate: Date; daysUntil: number },
): string {
  const bsStr = `${h.bsDay} ${getBsMonthName(h.bsMonth)} ${h.bsDate.year}`;
  const adStr = formatAdDate(h.adDate);
  return `## ${h.name}\n\n**${h.nameNp}**\n\n${h.description}\n\n---\n\n- 📅 BS: **${bsStr}**\n- 📅 AD: **${adStr}**\n- ⏳ **${h.daysUntil === 0 ? "Today!" : h.daysUntil + " days away"}**\n- 🏷️ Type: ${h.type}`;
}
