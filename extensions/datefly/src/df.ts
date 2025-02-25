import { showHUD, Clipboard, LaunchProps } from "@raycast/api";

// 将日期格式化为 YYYY？MM？DD
// ？为分隔符，默认为空，又delimiter参数控制
function formatDate(date: Date, delimiter: string): string {
  const year: number = date.getFullYear(); // 获取年份
  const month: string = String(date.getMonth() + 1).padStart(2, "0"); // 获取月份，并补零
  const day: string = String(date.getDate()).padStart(2, "0"); // 获取日期，并补零
  return `${year}${delimiter}${month}${delimiter}${day}`; // 返回格式化后的字符串
}

// 解析用户输入的日期描述，返回 Date 对象
function parseDateDescription(flyto: string): Date {
  const today = new Date();
  /* 将tomorrow，today, yesterday, 
    the day after tomorrow，the day before yesterday, 
    next week, last week,
    next month, last month,
    next year, last year
    等转换为对应的日期
  */
  if (flyto === "today") {
    return today;
  } else if (flyto === "tomorrow") {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  } else if (flyto === "yesterday") {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  } else if (flyto === "the day after tomorrow") {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
  } else if (flyto === "the day before yesterday") {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2);
  } else if (flyto === "next week") {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
  } else if (flyto === "last week") {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
  } else if (flyto === "next month") {
    return new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  } else if (flyto === "last month") {
    return new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  } else if (flyto === "next year") {
    return new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  } else if (flyto === "last year") {
    return new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  }
  /* 用正则表达式匹配next n days 或 last n days的自然语言描述，提取n转换为数字，再加上today的日期等转换为对应的日期
   */
  const regex = /^(next|last) (\d+)( days?)$/;
  const match = flyto.match(regex);
  if (match) {
    const direction = match[1] === "next" ? 1 : -1;
    const n = parseInt(match[2]);
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + direction * n);
  }
  /* 将next mon, last mon,
    next tues, last tues,
    next wed, last wed,
    next thur, last thur,
    next fri, last fri,
    next sat, last sat,
    next sun, last sun,
    等转换为对应的日期
  */
  const regex1 = /^(next|last) (mon|tues|wed|thur|fri|sat|sun)($| days?)$/;
  const match1 = flyto.match(regex1);
  if (match1) {
    const todayOfWeek = today.getDay();
    const direction = match1[1] === "next" ? 1 : -1;

    // Map weekdays to their numbers (0-6), aligned with JavaScript's getDay()
    const dayOfWeek = {
      sun: 0,
      mon: 1,
      tues: 2,
      wed: 3,
      thur: 4,
      fri: 5,
      sat: 6,
    };

    const dayofweekStr = match1[2].toString() as keyof typeof dayOfWeek;
    const targetDay = dayOfWeek[dayofweekStr];

    // Calculate days until next occurrence
    let diff = targetDay - todayOfWeek;

    // Adjust the difference based on direction and current position
    if (direction === 1) {
      // For "next", if targetDay is Sunday, add 14 to get next week
      diff = targetDay == 0 ? diff + 14 : diff + 7;
    } else {
      // For "last", if diff >= 0, add 7 to get to previous week
      diff = diff >= 0 ? diff - 7 : diff;
    }

    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
  }
  /* 将 this mon, this tues, this wed, this thur, this fri, this sat, this sun 转换为对应的日期
   */
  const regex2 = /^(this) (mon|tues|wed|thur|fri|sat|sun)($| days?)$/;
  const match2 = flyto.match(regex2);
  if (match2) {
    // 获取今天是星期几
    let todayOfWeek = today.getDay();
    if (todayOfWeek === 0) {
      todayOfWeek = 7;
    }
    const dayOfWeek = {
      mon: 1,
      tues: 2,
      wed: 3,
      thur: 4,
      fri: 5,
      sat: 6,
      sun: 7,
    };
    // match2[2]转换为对应的string
    const dayofweekStr = match2[2].toString() as keyof typeof dayOfWeek;
    const n = dayOfWeek[dayofweekStr] - todayOfWeek;
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + n);
  }
  // 默认返回today
  return today;
}

export default async function main(props: LaunchProps) {
  const {
    arguments: { flyto, delimiter },
  } = props;
  // 解析用户输入的日期描述
  const date = parseDateDescription(flyto);

  // 使用传入的格式或默认格式
  const dateString = formatDate(date, delimiter);

  await Clipboard.copy(dateString);
  await showHUD("Copied date to clipboard");
}
