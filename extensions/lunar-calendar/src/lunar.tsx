import { Detail, environment } from "@raycast/api";
import { Solar, Lunar, HolidayUtil } from "lunar-javascript";

interface CalendarDay {
  solarDate: Date;
  solarDay: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  lunarDay: string;
  lunarMonth: string;
  solarTerm: string;
  holidayName: string;
  isWorkday: boolean;
  isRestday: boolean;
}

export default function Command() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // 1. 获取当月日历网格数据
  const days = getCalendarGrid(year, month);

  // 2. 生成包含当月天干地支/生肖/节气的 SVG 图像
  const svgDataUrl = generateMonthSvg(year, month, days);

  // 3. 构建 Markdown 内容展示
  const markdown = `![Lunar Calendar](${svgDataUrl})`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="公历" value={`${year} 年 ${month} 月`} />
          <Detail.Metadata.Label
            title="农历"
            value={`${Lunar.fromDate(today).getYearInGanZhi()}年 (${Lunar.fromDate(today).getYearShengXiao()}年)`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="系统语言" value={getLanguage()} />
        </Detail.Metadata>
      }
    />
  );
}

function getLanguage(): string {
  // 兼容 Raycast 不同版本的 localization 属性读取
  const env = environment as unknown as { localization?: { language?: string } };
  return env.localization?.language || "zh-CN";
}

function getCalendarGrid(year: number, month: number): CalendarDay[] {
  const today = new Date();
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);

  const startDayOfWeek = firstDayOfMonth.getDay();
  const totalDays = lastDayOfMonth.getDate();

  const days: CalendarDay[] = [];

  // 补充上个月末尾天数
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 2, prevMonthLastDay - i);
    days.push(createCalendarDay(date, false, today));
  }

  // 当月天数
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month - 1, day);
    days.push(createCalendarDay(date, true, today));
  }

  // 补充下个月开头天数至满 35 或 42 格
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(year, month, i);
    days.push(createCalendarDay(date, false, today));
  }

  return days;
}

function createCalendarDay(date: Date, isCurrentMonth: boolean, today: Date): CalendarDay {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();

  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  let holidayName = "";
  let isWorkday = false;
  let isRestday = false;

  const holiday = HolidayUtil.getHoliday(date.getFullYear(), date.getMonth() + 1, date.getDate());
  if (holiday) {
    holidayName = holiday.getName();
    isWorkday = holiday.isWork();
    isRestday = !holiday.isWork();
  }

  const jieQi = lunar.getJieQi();

  return {
    solarDate: date,
    solarDay: date.getDate(),
    isCurrentMonth,
    isToday,
    lunarDay: lunar.getDayInChinese(),
    lunarMonth: lunar.getMonthInChinese(),
    solarTerm: jieQi || "",
    holidayName,
    isWorkday,
    isRestday,
  };
}

function generateMonthSvg(year: number, month: number, days: CalendarDay[]): string {
  const cellW = 80;
  const cellH = 65;
  const cols = 7;
  const headerH = 40;
  const rows = Math.ceil(days.length / cols);

  const totalWidth = cellW * cols;
  const totalHeight = headerH + rows * cellH;

  const weekHeaders = ["日", "一", "二", "三", "四", "五", "六"];
  let headersSvg = "";
  weekHeaders.forEach((day, index) => {
    const x = index * cellW + cellW / 2;
    const isWeekend = index === 0 || index === 6;
    const color = isWeekend ? "#FF453A" : "#8E8E93";
    headersSvg += `<text x="${x}" y="25" font-size="14" font-weight="bold" fill="${color}" text-anchor="middle">${day}</text>`;
  });

  let cellsSvg = "";
  days.forEach((day, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;

    const x = col * cellW;
    const y = headerH + row * cellH;
    const centerX = x + cellW / 2;

    const rectColor = day.isToday ? "#2C2C2E" : "transparent";
    const strokeColor = day.isToday ? "#0A84FF" : "#3A3A3C";

    let rectSvg = `<rect x="${x + 2}" y="${y + 2}" width="${cellW - 4}" height="${
      cellH - 4
    }" rx="8" fill="${rectColor}" stroke="${strokeColor}" stroke-width="${day.isToday ? 2 : 1}"/>`;

    let badgeSvg = "";
    if (day.holidayName) {
      const badgeColor = day.isWorkday ? "#FF9F0A" : "#FF453A";
      const badgeText = day.isWorkday ? "班" : "休";
      const bX = x + cellW - 22;
      const bY = y + 6;
      badgeSvg = `
        <rect x="${bX}" y="${bY}" width="16" height="16" rx="4" fill="${badgeColor}"/>
        <text x="${bX + 8}" y="${bY + 12}" font-size="10" fill="#FFFFFF" font-weight="bold" text-anchor="middle">${badgeText}</text>
      `;
    }

    const solarColor = !day.isCurrentMonth ? "#48484A" : day.isToday ? "#0A84FF" : "#FFFFFF";

    let lunarText = day.solarTerm || (day.lunarDay === "初一" ? `${day.lunarMonth}月` : day.lunarDay);
    if (day.holidayName && !day.solarTerm) {
      lunarText = day.holidayName;
    }

    const lunarColor = day.solarTerm ? "#30D158" : day.holidayName ? "#FF9F0A" : "#8E8E93";

    cellsSvg += `
      <g>
        ${rectSvg}
        ${badgeSvg}
        <text x="${centerX}" y="${y + 28}" font-size="20" font-weight="600" fill="${solarColor}" text-anchor="middle">${day.solarDay}</text>
        <text x="${centerX}" y="${y + 48}" font-size="11" fill="${lunarColor}" text-anchor="middle">${lunarText}</text>
      </g>
    `;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}">
    ${headersSvg}
    ${cellsSvg}
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}