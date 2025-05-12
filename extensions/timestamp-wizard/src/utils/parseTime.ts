import { isValid, fromUnixTime, parse, parseISO } from "date-fns";
import { TIME_FORMATS } from "../constants/timeFormats";

/**
 * 尝试解析时间戳（毫秒或秒）
 * @param input 输入的时间戳字符串
 * @returns 解析后的Date对象，解析失败则返回null
 */
export const parseTimestamp = (input: string): Date | null => {
  // 尝试解析为整数
  const num = parseInt(input.trim(), 10);
  if (isNaN(num)) return null;

  // 判断是毫秒还是秒级时间戳
  const date =
    num > 10000000000
      ? new Date(num) // 毫秒级时间戳
      : fromUnixTime(num); // 秒级时间戳

  return isValid(date) ? date : null;
};

/**
 * 尝试解析时间字符串
 * @param input 输入的时间字符串
 * @returns 解析后的Date对象，解析失败则返回null
 */
export const parseTimeString = (input: string): Date | null => {
  input = input.trim();

  // 尝试作为ISO日期解析
  try {
    const isoDate = parseISO(input);
    if (isValid(isoDate)) return isoDate;
  } catch (_) {
    /* empty */
  }

  // 尝试各种日期格式
  for (const formatStr of TIME_FORMATS.filter((f) => f !== "ISO")) {
    try {
      const date = parse(input, formatStr, new Date());
      if (isValid(date)) return date;
    } catch (_) {
      /* empty */
    }
  }

  // 如果是yyyy-MM-dd格式，添加时间部分再试
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(input)) {
    try {
      const date = parse(`${input} 00:00:00`, "yyyy-MM-dd HH:mm:ss", new Date());
      if (isValid(date)) return date;
    } catch (_) {
      /* empty */
    }
  }

  return null;
};

/**
 * 判断输入是否为时间戳格式
 * @param input 输入字符串
 * @returns 如果是纯数字则返回true
 */
export const isTimestamp = (input: string): boolean => {
  return /^\d+$/.test(input.trim());
};
