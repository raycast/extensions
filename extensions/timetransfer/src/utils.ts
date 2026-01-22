/**
 * 格式化日期对象为 "YYYY-MM-DD HH:mm:ss"
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export type ConvertResult = {
  type: "timestamp" | "date";
  result: string;
  original: string;
};

/**
 * 尝试解析输入并返回转换结果
 * @param input 时间戳或日期字符串
 * @returns 转换结果或 null (无法转换)
 */
export async function tryConvert(input: string): Promise<ConvertResult | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. 尝试作为时间戳处理 (纯数字)
  if (/^\d+$/.test(trimmed)) {
    let num = parseFloat(trimmed);
    // 简单的判定：如果位数较少(<=10位)，视为秒，转毫秒
    if (trimmed.length <= 10) {
      num *= 1000;
    }
    const date = new Date(num);
    if (!isNaN(date.getTime())) {
      return {
        type: "timestamp",
        original: trimmed,
        result: formatDate(date),
      };
    }
  }

  // 2. 尝试作为日期字符串处理
  // 支持格式: yyyy-MM-dd, yyyy/MM/dd, yyyyMMdd等
  // 简单的正则匹配常见格式，或者直接交给 Date.parse / new Date
  // 为了支持 yyyyMMdd 这种紧凑格式，可能需要手动处理一下
  let dateToParse = trimmed;

  // 处理 yyyyMMdd (8位且纯数字) - 在上面纯数字判断里可能已经被当做时间戳处理了？
  // 实际上 20230101 (8位) 作为毫秒是 1970年，作为秒是 1970年
  // 所以对于 8 位数字，优先当做日期 yyyyMMdd 处理可能更符合直觉？
  // 或者用户就是想转这个秒数。
  // 策略：如果解析出来的 Date 年份在 1970-1971 之间（即数值较小），以此判断可能不是用户原本想要的“近代时间戳”
  // 但这样有歧义。
  // 让我们遵循“显式大于隐式”的原则，通常时间戳由机器生成，日期由人输入。
  // 8位数字 20231010 -> 2023-10-10 是更常见的需求。
  if (/^\d{8}$/.test(trimmed)) {
    const y = trimmed.slice(0, 4);
    const m = trimmed.slice(4, 6);
    const d = trimmed.slice(6, 8);
    dateToParse = `${y}-${m}-${d}`;
  }

  const date = new Date(dateToParse);
  if (!isNaN(date.getTime())) {
    return {
      type: "date",
      original: trimmed,
      result: date.getTime().toString(),
    };
  }

  return null;
}
