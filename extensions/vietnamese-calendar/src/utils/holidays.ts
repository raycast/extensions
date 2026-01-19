import { getDay, eachDayOfInterval, startOfYear, endOfYear } from "date-fns";
import { SolarDate } from "lunar-date-vn";

const LUNAR_HOLIDAYS: Record<string, string> = {
  "1/1": "🧨 Nguyên đán",
  "15/1": "🏮 Nguyên Tiêu",
  "3/3": "🍡 Hàn thực",
  "10/3": "👑 Giỗ tổ",
  "15/4": "🙏 Phật Đản",
  "5/5": "🐛 Đoan ngọ",
  "7/7": "💞 Thất tịch",
  "15/7": "👻 Vu Lan",
  "15/8": "🥮 Trung thu",
  "9/9": "⛰️ Trùng cửu",
  "10/10": "🌾 Trùng thập",
  "15/10": "🍚 Hạ Nguyên",
  "23/12": "🐡 Ông táo",
};

interface HolidayInfo {
  name: string;
  startYear?: number;
}

const SOLAR_HOLIDAYS: Record<string, HolidayInfo | string> = {
  "1/1": "🎆 Tết Dương",
  "9/1": { name: "🎓 HSSV", startYear: 1950 },
  "3/2": { name: "🇻🇳 Đảng CSVN", startYear: 1930 },
  "14/2": "💝 Valentine",
  "27/2": { name: "🩺 Thầy thuốc", startYear: 1955 },
  "8/3": "🌹 Phụ nữ",
  "20/3": "😊 Hạnh phúc",
  "26/3": { name: "👕 Đoàn TNCS", startYear: 1931 },
  "1/4": "🐟 Cá tháng Tư",
  "30/4": { name: "⭐️ Giải phóng", startYear: 1975 },
  "1/5": "👷 Lao động",
  "7/5": { name: "💣 ĐBP", startYear: 1954 },
  // 13/5 Mother's day dynamic
  "15/5": { name: "👕 Đội TNTP", startYear: 1941 },
  "19/5": { name: "🎂 SN Bác", startYear: 1890 },
  "1/6": "🎈 Thiếu nhi",
  // 17/6 Father's day dynamic
  "21/6": { name: "📰 Báo chí", startYear: 1925 },
  "28/6": { name: "👨‍👩‍👧‍👦 Gia đình", startYear: 2001 },
  "11/7": "🌍 Dân số",
  "27/7": { name: "🕯️ TBLS", startYear: 1947 },
  "28/7": { name: "👷 Công đoàn", startYear: 1929 },
  "19/8": { name: "⭐️ CMT8", startYear: 1945 },
  "2/9": { name: "🇻🇳 Quốc Khánh", startYear: 1945 },
  "10/9": { name: "🤝 MTTQVN", startYear: 1955 },
  "1/10": "👵 Cao tuổi",
  "10/10": { name: "🌉 Thủ đô", startYear: 1954 },
  "13/10": { name: "💼 Doanh nhân", startYear: 2004 },
  "20/10": { name: "💐 Phụ nữ", startYear: 1930 },
  "31/10": "🎃 Halloween",
  "9/11": { name: "⚖️ Pháp luật", startYear: 2013 },
  "19/11": "👨 Nam giới",
  "20/11": { name: "👩 Nhà giáo", startYear: 1982 },
  "23/11": { name: "🏥 Chữ thập đỏ", startYear: 1946 },
  "1/12": "🎗️ AIDS",
  "19/12": { name: "🔫 Kháng chiến", startYear: 1946 },
  "24/12": "🎄 Giáng sinh",
  "22/12": { name: "🎖️ QĐNDVN", startYear: 1944 },
};

function getMothersDay(year: number): string {
  // 2nd Sunday of May
  const firstDay = new Date(year, 4, 1); // Month is 0-indexed, 4 is May
  const dayOfWeek = getDay(firstDay); // 0 (Sun) - 6 (Sat)
  // Logic:
  // If starts on Sunday (0), 1st Sunday is 1st. 2nd Sunday is 8th.
  // If starts on Monday (1), 1st Sunday is 7th. 2nd Sunday is 14th.
  // Offset to reach first Sunday: (7 - dayOfWeek) % 7
  // Date of 1st Sunday: 1 + (7 - dayOfWeek) % 7
  // Date of 2nd Sunday: 1 + (7 - dayOfWeek) % 7 + 7
  const date = 1 + ((7 - dayOfWeek) % 7) + 7;
  return `${date}/5`;
}

function getFathersDay(year: number): string {
  // 3rd Sunday of June
  const firstDay = new Date(year, 5, 1); // Month is 0-indexed, 5 is June
  const dayOfWeek = getDay(firstDay);
  // Date of 1st Sunday: 1 + (7 - dayOfWeek) % 7
  // Date of 3rd Sunday: 1 + (7 - dayOfWeek) % 7 + 14
  const date = 1 + ((7 - dayOfWeek) % 7) + 14;
  return `${date}/6`;
}

export function getHoliday(
  solarDate: Date,
  lunarDay: number,
  lunarMonth: number,
  mode: "short" | "full" = "full",
): string | null {
  const solarDay = solarDate.getDate();
  const solarMonth = solarDate.getMonth() + 1; // 0-indexed
  const solarYear = solarDate.getFullYear();
  const solarKey = `${solarDay}/${solarMonth}`;
  const lunarKey = `${lunarDay}/${lunarMonth}`;

  // Check Solar Holidays
  if (SOLAR_HOLIDAYS[solarKey]) {
    const holiday = SOLAR_HOLIDAYS[solarKey];
    if (typeof holiday === "string") {
      return holiday;
    } else {
      if (
        mode === "full" &&
        holiday.startYear &&
        solarYear >= holiday.startYear
      ) {
        const diff = solarYear - holiday.startYear;
        if (diff > 0) {
          // Check if it is birthday
          if (holiday.name.includes("Sinh nhật")) {
            return `${holiday.name} (${diff} tuổi)`;
          }
          return `${holiday.name} (${diff} năm)`;
        }
      }
      return holiday.name;
    }
  }

  // Check Dynamic Solar Holidays
  if (solarKey === getMothersDay(solarYear)) {
    return "🤱 Mẹ";
  }
  if (solarKey === getFathersDay(solarYear)) {
    return "👨 Cha";
  }

  // Check Lunar Holidays
  if (LUNAR_HOLIDAYS[lunarKey]) {
    return LUNAR_HOLIDAYS[lunarKey];
  }

  return null;
}

export function isOfficialHoliday(
  date: Date,
  lunarDay: number,
  lunarMonth: number,
): boolean {
  const solarDay = date.getDate();
  const solarMonth = date.getMonth() + 1;
  const solarKey = `${solarDay}/${solarMonth}`;
  const lunarKey = `${lunarDay}/${lunarMonth}`;

  // Solar Holidays: 1/1, 30/4, 1/5, 2/9
  if (["1/1", "30/4", "1/5", "2/9"].includes(solarKey)) {
    return true;
  }

  // Lunar Holidays: 10/3, 1/1, 2/1, 3/1
  if (["10/3", "1/1", "2/1", "3/1"].includes(lunarKey)) {
    return true;
  }

  // Lunar Year End (Last day of Lunar Year)
  // Check if tomorrow is Lunar 1/1
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const solarTomorrow = new SolarDate(tomorrow);
  const lunarTomorrow = solarTomorrow.toLunarDate();
  if (lunarTomorrow) {
    const lunarInfo = lunarTomorrow.get();
    if (lunarInfo.day === 1 && lunarInfo.month === 1) {
      return true;
    }
  }

  return false;
}

export interface CalendarEvent {
  date: Date;
  name: string;
  type: "solar" | "lunar";
  lunarDate?: string;
}

export function getEventsForYear(year: number): CalendarEvent[] {
  const startDate = startOfYear(new Date(year, 0, 1));
  const endDate = endOfYear(new Date(year, 0, 1));
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const events: CalendarEvent[] = [];

  days.forEach((day) => {
    const solar = new SolarDate(day);
    const lunar = solar.toLunarDate();
    const lunarInfo = lunar ? lunar.get() : { day: 0, month: 0 };
    const lunarDateString = `${lunarInfo.day}/${lunarInfo.month}`;

    const solarDay = day.getDate();
    const solarMonth = day.getMonth() + 1;
    const solarKey = `${solarDay}/${solarMonth}`;
    const solarYear = day.getFullYear();

    // 1. Check Solar Holidays (Fixed)
    const solarHoliday = getHoliday(day, lunarInfo.day, lunarInfo.month);
    // Reuse getHoliday to get the formatted name
    if (SOLAR_HOLIDAYS[solarKey]) {
      // getHoliday checks Solar key first, so it's safe if it returns something
      if (
        solarHoliday &&
        !LUNAR_HOLIDAYS[`${lunarInfo.day}/${lunarInfo.month}`]
      ) {
        // Need to double check we aren't picking up a Lunar Holiday by accident if logic overlaps?
        // Actually getHoliday checks Solar first.
        // But we used to iterate.
        events.push({
          date: day,
          name: solarHoliday,
          type: "solar",
          lunarDate: lunarDateString,
        });
      }
    }

    // 2. Check Dynamic Solar Holidays
    // Logic inside getHoliday covers this, but we need to list them explicitly to separate types if desired.
    // However, the previous logic duplicated checks.
    // Let's rely on getHoliday but we need to know if it's Solar or Lunar for the "type".

    // Simpler:
    // Check Solar Key in Map
    if (SOLAR_HOLIDAYS[solarKey]) {
      // already handled above
    } else if (solarKey === getMothersDay(solarYear)) {
      events.push({
        date: day,
        name: "🤱 Ngày của mẹ",
        type: "solar",
        lunarDate: lunarDateString,
      });
    } else if (solarKey === getFathersDay(solarYear)) {
      events.push({
        date: day,
        name: "👨‍👧‍👦 Ngày của cha",
        type: "solar",
        lunarDate: lunarDateString,
      });
    } else {
      // Check Lunar
      const lunarKey = `${lunarInfo.day}/${lunarInfo.month}`;
      if (LUNAR_HOLIDAYS[lunarKey]) {
        events.push({
          date: day,
          name: LUNAR_HOLIDAYS[lunarKey],
          type: "lunar",
          lunarDate: lunarDateString,
        });
      } else {
        // Generic Lunar
        if (lunarInfo.day === 1) {
          events.push({
            date: day,
            name: `🌑 Mùng 1 tháng ${lunarInfo.month}`,
            type: "lunar",
            lunarDate: lunarDateString,
          });
        } else if (lunarInfo.day === 15) {
          events.push({
            date: day,
            name: `🌕 Rằm tháng ${lunarInfo.month}`,
            type: "lunar",
            lunarDate: lunarDateString,
          });
        }
      }
    }
  });

  return events;
}

export function isLunarEvent(date: Date): boolean {
  const solar = new SolarDate(date);
  const lunar = solar.toLunarDate();
  if (!lunar) return false;

  const { day, month } = lunar.get();
  const lunarKey = `${day}/${month}`;

  // 1. Check if it's a known major lunar holiday in our map
  if (LUNAR_HOLIDAYS[lunarKey]) return true;

  // 2. Check for other days of Tet (Mung 2, Mung 3)
  if (month === 1 && (day === 2 || day === 3)) return true;

  // 3. Check for Lunar Year End (Giao Thua) - might be 29th or 30th
  // We check if tomorrow is 1/1
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const solarTomorrow = new SolarDate(tomorrow);
  const lunarTomorrow = solarTomorrow.toLunarDate();
  if (lunarTomorrow) {
    const tInfo = lunarTomorrow.get();
    if (tInfo.day === 1 && tInfo.month === 1) return true;
  }

  // 4. Default lunar significance: 1st or 15th
  return day === 1 || day === 15;
}
