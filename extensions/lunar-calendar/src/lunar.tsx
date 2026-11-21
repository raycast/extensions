import { Detail, ActionPanel, Action, LocalStorage, environment } from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { Solar, HolidayUtil } from "lunar-javascript";

// API 返回的节假日类型定义
interface HolidayItem {
  holiday: boolean; // true 为放假，false 为调休上班
  name: string; // 节假日名称
  wage?: number;
  date?: string;
  rest?: number;
}

interface HolidayMap {
  [dateStr: string]: HolidayItem; // Key 格式: YYYY-MM-DD
}

// holiday-cn 接口返回的节假日类型定义
interface HolidayCNItem {
  name: string;
  date: string; // 格式: YYYY-MM-DD
  isOffDay: boolean; // true 为放假，false 为调休上班
}

interface CalendarCell {
  day: number;
  isCurrentMonth: boolean;
  solar: Solar;
  dateStr: string;
  lunarText: string;
  holidayStatus: { isHoliday?: boolean; isWork?: boolean };
  isToday: boolean;
  isWeekend: boolean;
}

// 缓存结构定义（带探测时间戳）
interface CachedHolidayWrapper {
  timestamp: number;
  holidays: HolidayMap;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// 全局请求去重锁，避免同一年份在并发时重复下载
const inFlightRequests: { [year: number]: Promise<HolidayMap> } = {};

// 辅助函数：按年份清理并替换节假日数据，防止官方修改/删除假期时残留旧徽标
function updateYearHolidays(prev: HolidayMap, targetYear: number, newMap: HolidayMap): HolidayMap {
  const next = { ...prev };
  const prefix = `${targetYear}-`;
  for (const key of Object.keys(next)) {
    if (key.startsWith(prefix)) {
      delete next[key];
    }
  }
  return { ...next, ...newMap };
}

export default function Command() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [holidays, setHolidays] = useState<HolidayMap>({});

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // 1. 动态加载节假日数据（带完整的英文缓存与网络请求日志）
  useEffect(() => {
    let isMounted = true;

    // 通用获取指定年份数据的异步函数（含去重锁）
    async function fetchYearHolidays(targetYear: number, isPreload = false): Promise<HolidayMap> {
      if (targetYear in inFlightRequests) {
        return inFlightRequests[targetYear];
      }

      inFlightRequests[targetYear] = (async () => {
        const cacheKey = `holidays_${targetYear}`;
        const attemptKey = `last_attempt_${targetYear}`;
        const prefix = isPreload ? `[Lunar Preload ${targetYear}]` : `[Lunar Load ${targetYear}]`;

        console.log(`${prefix} ----------------------------------------`);
        console.log(`${prefix} Starting to load target year: ${targetYear}`);

        const [cachedString, lastAttemptString] = await Promise.all([
          LocalStorage.getItem<string>(cacheKey),
          LocalStorage.getItem<string>(attemptKey),
        ]);

        let cachedWrapper: CachedHolidayWrapper | null = null;
        if (cachedString) {
          try {
            cachedWrapper = JSON.parse(cachedString);
            console.log(`${prefix} Cache hit, items count: ${Object.keys(cachedWrapper!.holidays || {}).length}`);
          } catch (e) {
            console.error(`${prefix} Failed to parse local cache`, e);
          }
        } else {
          console.log(`${prefix} Cache miss (no local cache found)`);
        }

        // 如果有缓存，先渲染保证秒开（按年份清理旧状态合并）
        if (cachedWrapper && cachedWrapper.holidays && isMounted) {
          console.log(`${prefix} Rendering UI using local cache`);
          setHolidays((prev) => updateYearHolidays(prev, targetYear, cachedWrapper!.holidays));
        }

        const realNow = new Date();
        const realCurrentYear = realNow.getFullYear();
        const realCurrentMonth = realNow.getMonth() + 1;

        // 判定是否需要发起网络请求：
        // 1. 如果没有缓存，或者缓存里的数据是空的
        // 2. 如果是未来年份或年底预热期，且距离上次探测超过 24 小时，允许每天探测 1 次
        const hasEmptyCache =
          !cachedWrapper || !cachedWrapper.holidays || Object.keys(cachedWrapper.holidays).length === 0;
        const isFutureOrPreloadYear =
          targetYear > realCurrentYear || (targetYear === realCurrentYear && realCurrentMonth >= 11);

        const now = Date.now();
        const lastAttemptTime = lastAttemptString ? parseInt(lastAttemptString, 10) : 0;
        const attemptAge = now - lastAttemptTime;

        // 核心修复逻辑：
        // 对于未来年份或年底预热期，即使有旧缓存，也允许每 24 小时自动刷新一次以获取最新官方调整
        const needsFetch = hasEmptyCache || (isFutureOrPreloadYear && attemptAge > ONE_DAY_MS);

        console.log(`${prefix} Status Check -> Real Year: ${realCurrentYear}, Real Month: ${realCurrentMonth}`);
        console.log(`${prefix} Status Check -> Has Empty Cache (hasEmptyCache): ${hasEmptyCache}`);
        console.log(
          `${prefix} Status Check -> Is Future Or Preload Year (isFutureOrPreloadYear): ${isFutureOrPreloadYear}`
        );
        console.log(
          `${prefix} Status Check -> Last attempt age (hours): ${(attemptAge / (1000 * 60 * 60)).toFixed(2)}`
        );
        console.log(`${prefix} Status Check -> Needs Fetch (needsFetch): ${needsFetch}`);

        if (!needsFetch) {
          console.log(`${prefix} Conclusion: Valid cache exists or within 24h retry limit, skipping network request.`);
          return cachedWrapper ? cachedWrapper.holidays : {};
        }

        console.log(
          `${prefix} Conclusion: Fetching from API -> https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${targetYear}.json`
        );

        // 记录本次尝试请求的时间戳（无论成功与否，24小时内不再频繁重试）
        await LocalStorage.setItem(attemptKey, now.toString());

        try {
          const response = await fetch(`https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${targetYear}.json`);
          if (!response.ok) {
            console.log(`${prefix} Holiday data not published yet (HTTP ${response.status}), skip this time.`);
            return cachedWrapper ? cachedWrapper.holidays : {};
          }
          const json = (await response.json()) as {
            year?: number;
            days?: HolidayCNItem[];
          };

          console.log(`${prefix} API Response year: ${json.year}, days count: ${json.days?.length ?? 0}`);

          // 严格校验：必须 days 为数组且确实有内容
          if (Array.isArray(json.days) && json.days.length > 0) {
            const normalized: HolidayMap = {};
            for (const item of json.days) {
              if (!item.date) continue;
              normalized[item.date] = {
                holiday: item.isOffDay,
                name: item.name,
                date: item.date,
              };
            }

            console.log(`${prefix} API request success, valid holiday items count: ${Object.keys(normalized).length}`);

            // 写入带最新时间戳的有效缓存
            const newWrapper: CachedHolidayWrapper = {
              timestamp: Date.now(),
              holidays: normalized,
            };
            await LocalStorage.setItem(cacheKey, JSON.stringify(newWrapper));
            console.log(`${prefix} New data successfully written to LocalStorage cache`);

            // 更新状态（按年份精准清理旧条目并替换）
            if (isMounted) {
              setHolidays((prev) => updateYearHolidays(prev, targetYear, normalized));
            }
            return normalized;
          } else {
            console.log(`${prefix} Official holiday data not yet published or empty.`);
          }
        } catch (error) {
          console.error(`${prefix} Network error fetching holiday data:`, error);
        }
        return cachedWrapper ? cachedWrapper.holidays : {};
      })();

      try {
        return await inFlightRequests[targetYear];
      } finally {
        delete inFlightRequests[targetYear];
      }
    }

    // A. 加载当前选中的年份数据，同时根据月份并发独立加载相邻年份（解决跨月显示与等待串行慢的问题）
    async function loadAllRequiredYears() {
      const promises: Promise<HolidayMap>[] = [fetchYearHolidays(year, false)];

      // 如果当前是 1 月，并发把前一年的数据拉取合并
      if (month === 1) {
        promises.push(fetchYearHolidays(year - 1, true));
      }
      // 如果当前是 12 月，并发把后一年的数据拉取合并
      else if (month === 12) {
        promises.push(fetchYearHolidays(year + 1, true));
      }

      await Promise.all(promises);
    }

    loadAllRequiredYears();

    // B. 如果当前真实时间是 11 月或 12 月，在后台静默预热加载下一年
    const realNow = new Date();
    const realCurrentYear = realNow.getFullYear();
    const realCurrentMonth = realNow.getMonth() + 1;
    if (realCurrentMonth >= 11 && year === realCurrentYear) {
      fetchYearHolidays(realCurrentYear + 1, true);
    }

    return () => {
      isMounted = false;
    };
  }, [year, month]);

  // 2. 构建当月日历数据
  const calendarData = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const firstDay = new Date(year, month - 1, 1);
    let firstDayOfWeek = firstDay.getDay() - 1;
    if (firstDayOfWeek === -1) firstDayOfWeek = 6;

    const totalDays = new Date(year, month, 0).getDate();
    const cells: CalendarCell[] = [];

    // 上月补齐
    const prevMonthTotalDays = new Date(year, month - 1, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const m = month === 1 ? 12 : month - 1;
      const y = month === 1 ? year - 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const solar = Solar.fromYmd(y, m, d);
      const dayOfWeek = new Date(y, m - 1, d).getDay();

      cells.push({
        day: d,
        isCurrentMonth: false,
        solar,
        dateStr,
        lunarText: getLunarText(solar),
        holidayStatus: getHolidayStatus(solar, holidays[dateStr]),
        isToday: dateStr === todayStr,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    // 当月天数
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const solar = Solar.fromYmd(year, month, d);
      const dayOfWeek = new Date(year, month - 1, d).getDay();

      cells.push({
        day: d,
        isCurrentMonth: true,
        solar,
        dateStr,
        lunarText: getLunarText(solar),
        holidayStatus: getHolidayStatus(solar, holidays[dateStr]),
        isToday: dateStr === todayStr,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    // 下月补齐
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const m = month === 12 ? 1 : month + 1;
        const y = month === 12 ? year + 1 : year;
        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const solar = Solar.fromYmd(y, m, d);
        const dayOfWeek = new Date(y, m - 1, d).getDay();

        cells.push({
          day: d,
          isCurrentMonth: false,
          solar,
          dateStr,
          lunarText: getLunarText(solar),
          holidayStatus: getHolidayStatus(solar, holidays[dateStr]),
          isToday: dateStr === todayStr,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        });
      }
    }

    return cells;
  }, [year, month, holidays]);

  // 每次渲染都读取当前外观（light / dark），使用 appearance 而非旧字段 theme
  const appearance = environment.appearance;

  const markdown = useMemo(() => {
    const isDark = appearance === "dark";
    const fullCalendarSvg = generateFullCalendarSvg(calendarData, isDark);

    // Markdown 标题格式改为中文：xxxx 年 x 月
    const titleText = `${year} 年 ${month} 月`;

    return `# ${titleText}\n\n![Calendar](${fullCalendarSvg})`;
  }, [year, month, calendarData, appearance]);

  // 使用准确的相对月份加减，规避构造函数越界偏差
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const resetToday = () => setCurrentDate(new Date());

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Next Month"
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "arrowRight" },
              Windows: { modifiers: ["ctrl"], key: "arrowRight" },
            }}
            onAction={nextMonth}
          />
          <Action
            title="Previous Month"
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "arrowLeft" },
              Windows: { modifiers: ["ctrl"], key: "arrowLeft" },
            }}
            onAction={prevMonth}
          />
          <Action
            title="Reset to Today"
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "t" },
              Windows: { modifiers: ["ctrl"], key: "t" },
            }}
            onAction={resetToday}
          />
        </ActionPanel>
      }
    />
  );
}

// 判断是否有休假/补班状态
function getHolidayStatus(solar: Solar, holidayItem?: HolidayItem): { isHoliday?: boolean; isWork?: boolean } {
  if (holidayItem) {
    return {
      isHoliday: holidayItem.holiday,
      isWork: !holidayItem.holiday,
    };
  }

  const h = HolidayUtil.getHoliday(solar.getYear(), solar.getMonth(), solar.getDay());
  if (h) {
    return {
      isHoliday: !h.isWork(),
      isWork: h.isWork(),
    };
  }

  return { isHoliday: false, isWork: false };
}

// 获取农历或节日文本（完全基于农历库与传统节日，不再受 API 文本覆盖）
function getLunarText(solar: Solar): string {
  const mainSolarFestivals = [
    "元旦",
    "妇女节",
    "植树节",
    "劳动节",
    "青年节",
    "儿童节",
    "建党节",
    "建军节",
    "教师节",
    "国庆节",
  ];
  const solarFestivals = solar.getFestivals();
  for (const f of solarFestivals) {
    if (mainSolarFestivals.some((m) => f.includes(m))) {
      if (f.includes("国庆")) return "国庆节";
      if (f.includes("元旦")) return "元旦";
      if (f.includes("劳动")) return "劳动节";
      if (f.includes("教师")) return "教师节";
      if (f.includes("儿童")) return "儿童节";
      if (f.includes("妇女")) return "妇女节";
      return f;
    }
  }

  const lunar = solar.getLunar();

  const jieQi = lunar.getJieQi();
  if (jieQi) return jieQi;

  const mainLunarFestivals = ["除夕", "春节", "元宵节", "端午节", "七夕节", "中秋节", "重阳节", "腊八节"];
  const lunarFestivals = lunar.getFestivals();
  for (const f of lunarFestivals) {
    if (mainLunarFestivals.includes(f)) {
      return f;
    }
  }

  const lunarDay = lunar.getDayInChinese();
  if (lunarDay === "初一") {
    return `${lunar.getMonthInChinese()}月`;
  }

  return lunarDay || "";
}

// 渲染整张完整月历 SVG（自动根据 isDark 切换配色）
function generateFullCalendarSvg(calendarData: CalendarCell[], isDark: boolean) {
  const fontFamily = "system-ui, sans-serif";
  const colWidth = 100;
  const rowHeight = 85;
  const headerHeight = 40;

  const totalWidth = colWidth * 7;
  const rowCount = Math.ceil(calendarData.length / 7);
  const totalHeight = headerHeight + rowCount * rowHeight;

  // 主题配色字典（定义 Light 与 Dark 差异，角标与高亮红/蓝保持统一）
  const theme = {
    weekdayHeader: isDark ? "#A0AEC0" : "#718096",
    weekendHeader: isDark ? "#FF4D4F" : "#EB3434",

    // 公历数字文本
    currentMonthText: isDark ? "#FFFFFF" : "#1a202c",
    otherMonthText: isDark ? "#4A5568" : "rgba(0, 0, 0, 0.35)",
    weekendText: isDark ? "#FF4D4F" : "#EB3434",

    // 农历文本
    currentMonthLunar: isDark ? "#A0AEC0" : "#718096",
    otherMonthLunar: isDark ? "#4A5568" : "rgba(0, 0, 0, 0.25)",
    weekendLunar: isDark ? "#FF4D4F" : "#EB3434",

    // 调休（班）日文本
    workText: isDark ? "#CBD5E0" : "#4E5877",
    workLunar: isDark ? "#A0AEC0" : "#4E5877",

    // 休假背景
    holidayBg: isDark ? "#FA52521F" : "#FA52520A",
  };

  // 表头
  const headers = [
    { text: "一", color: theme.weekdayHeader },
    { text: "二", color: theme.weekdayHeader },
    { text: "三", color: theme.weekdayHeader },
    { text: "四", color: theme.weekdayHeader },
    { text: "五", color: theme.weekdayHeader },
    { text: "六", color: theme.weekendHeader },
    { text: "日", color: theme.weekendHeader },
  ];

  const headerSvg = headers
    .map((h, i) => {
      const centerX = i * colWidth + colWidth / 2;
      return `<text x="${centerX}" y="24" font-size="16" font-weight="600" fill="${h.color}" text-anchor="middle" font-family="${fontFamily}">${h.text}</text>`;
    })
    .join("");

  const cardW = 60;
  const cardH = 60;

  const badgeW = 18;
  const badgeH = 18;

  // 渲染日期网格
  const cellsSvg = calendarData
    .map((item, idx) => {
      const col = idx % 7;
      const row = Math.floor(idx / 7);

      const startX = col * colWidth;
      const startY = headerHeight + row * rowHeight;

      const centerX = startX + colWidth / 2;
      const centerY = startY + rowHeight / 2;

      const rectX = centerX - cardW / 2;
      const rectY = centerY - cardH / 2;

      let rectSvg = "";
      let textColor = item.isCurrentMonth ? theme.currentMonthText : theme.otherMonthText;
      let lunarColor = item.isCurrentMonth ? theme.currentMonthLunar : theme.otherMonthLunar;

      // 收集并构建角标对象，以便统一按优先级在右上角从上到下排列
      const rawBadges: { type: string; svg: string; priority: number }[] = [];

      // 当月周末
      if (item.isCurrentMonth && item.isWeekend) {
        textColor = theme.weekendText;
        lunarColor = theme.weekendLunar;
      }

      // 1. 调休（班）：优先级设高一点，使其排在上方
      if (item.holidayStatus.isWork) {
        textColor = theme.workText;
        lunarColor = theme.workLunar;
        const bX = rectX + cardW - badgeW / 2;
        rawBadges.push({
          type: "work",
          priority: 1, // 优先级更高，排在上方
          svg: `
            <rect x="${bX}" y="0" width="${badgeW}" height="${badgeH}" rx="4" fill="#4E5877"/>
            <text x="${bX + badgeW / 2}" y="13" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="${fontFamily}">班</text>
          `,
        });
      }
      // 2. 放假（休）：优先级设高一点，使其排在上方
      else if (item.holidayStatus.isHoliday) {
        rectSvg = `<rect x="${rectX}" y="${rectY}" width="${cardW}" height="${cardH}" rx="10" fill="${theme.holidayBg}"/>`;
        textColor = isDark ? "#FF4D4F" : "#EB3434";
        lunarColor = isDark ? "#FF4D4F" : "#EB3434";
        const bX = rectX + cardW - badgeW / 2;
        rawBadges.push({
          type: "holiday",
          priority: 1, // 优先级更高，排在上方
          svg: `
            <rect x="${bX}" y="0" width="${badgeW}" height="${badgeH}" rx="4" fill="#EB3434"/>
            <text x="${bX + badgeW / 2}" y="13" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="${fontFamily}">休</text>
          `,
        });
      }

      // 3. 今天（今）：蓝色高亮框，优先级设低一点，使其排在下方
      if (item.isToday) {
        rectSvg = `<rect x="${rectX}" y="${rectY}" width="${cardW}" height="${cardH}" rx="10" fill="none" stroke="#4E6EF2" stroke-width="2"/>`;
        textColor = "#4E6EF2";
        lunarColor = "#4E6EF2";

        const bX = rectX + cardW - badgeW / 2;
        rawBadges.push({
          type: "today",
          priority: 2, // 优先级较低，“今”排在下方
          svg: `
            <rect x="${bX}" y="0" width="${badgeW}" height="${badgeH}" rx="4" fill="#4E6EF2"/>
            <text x="${bX + badgeW / 2}" y="13" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="${fontFamily}">今</text>
          `,
        });
      }

      // 按照优先级排序，数字小的排在最上方
      rawBadges.sort((a, b) => a.priority - b.priority);

      const badgeSvg = rawBadges
        .map((b, bIdx) => {
          // 每个角标垂直向下错开 20px (badgeH 18 + 间距 2)
          const offsetY = rectY - badgeH / 2 + bIdx * 20;
          return `<g transform="translate(0, ${offsetY})">${b.svg}</g>`;
        })
        .join("");

      return `
        <g>
          ${rectSvg}
          ${badgeSvg}
          <text x="${centerX}" y="${centerY - 5}" font-size="24" font-weight="600" fill="${textColor}" text-anchor="middle" dominant-baseline="middle" font-family="${fontFamily}">${item.day}</text>
          <text x="${centerX}" y="${centerY + 16}" font-size="12" font-weight="500" fill="${lunarColor}" text-anchor="middle" font-family="${fontFamily}">${item.lunarText}</text>
        </g>
      `;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" data-theme="${isDark ? "dark" : "light"}">
    ${headerSvg}
    ${cellsSvg}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
