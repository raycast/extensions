import { exec } from "child_process";
import dayjs from "dayjs";
import { omit } from "lodash";
import validator from "validator";

export function isURL(str?: string): boolean {
  return str ? validator.isURL(str) : false;
}

export async function shell(cmd: string): Promise<object> {
  return new Promise(function (resolve, reject) {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error(
          `Operation timed out after ${timeoutMs} ms, you could try to set "Http Proxy" in "Extensions Settings Page" and try again`,
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}

export function isXML(str: string) {
  return /^\s*<[\s\S]*>/.test(str);
}

export const isToday = (date: Date, day: string) => {
  const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return weekDays[date.getDay()] === day;
};

export function normalizeUrlForMarkdown(url: string) {
  const encodedUrl = url.replace(/\(/g, "%28").replace(/\)/g, "%29");
  return encodedUrl;
}

/**
 * 将日期转化为易读的格式
 * @param date
 * @returns
 */
export default function formatDate(date: string | number | Date) {
  const time = dayjs(date);
  const now = dayjs();
  const diffInMinutes = now.diff(time, "minute");
  // 若不用startOf，昨天的内容可能会算出来为0
  const diffInDays = now.startOf("day").diff(time.startOf("day"), "day");

  if (diffInMinutes < 1) {
    return "just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute ago`;
  } else if (diffInDays === 0) {
    return `Today at ${time.format("HH:mm")}`;
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago at ${time.format("HH:mm")}`;
  } else if (time.year() !== now.year()) {
    return time.format("YYYY-MM-DD HH:mm");
  } else {
    return time.format("MM-DD HH:mm");
  }
}

export function formatSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}min ${remainingSeconds}s`;
  }
}

export function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 0,
  stopOnError: (error: Error) => boolean = () => false, // 新增参数，判断是否是特定错误
): Promise<T> {
  return fn().catch((error: any) => {
    // 检查是否遇到了特定错误
    if (stopOnError(error)) {
      return Promise.reject(error);
    }

    // 当重试次数用完时，返回错误
    if (retries <= 0) {
      return Promise.reject(error);
    }

    // 如果不是特定错误，继续重试
    return new Promise((resolve) => {
      setTimeout(() => resolve(retry(fn, retries - 1, delay, stopOnError)), delay);
    });
  });
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function filterByShownStatus<T extends { show: boolean }>(items: T[]): Omit<T, "show">[] {
  return items.filter((item) => item.show).map((item) => omit(item, "show"));
}

export function reflect<T, P>(
  promise: Promise<T>,
  payload?: P,
): Promise<{ payload?: P; status: "fulfilled" | "rejected"; value?: T; reason?: any }> {
  return promise
    .then((value) => ({ payload, status: "fulfilled" as const, value }))
    .catch((reason) => Promise.reject({ payload, status: "rejected", reason }));
}

export function extractDomain(urlString: string) {
  const parsedUrl = new URL(urlString);
  const hostname = parsedUrl.hostname; // 获取完整主机名，例如 "www.baidu.com"

  // 分割主机名并提取域名部分
  const parts = hostname.split(".");
  const domain = parts.length > 2 ? parts[parts.length - 2] : parts[0];

  return domain;
}

/**
 * 执行一个函数并在出错时返回null。跟lodash attempt类似，不过失败是返回null
 *
 * @param fn 要执行的函数。
 * @returns 函数的返回值或null（如果执行失败）。
 */
export const silent = <T>(fn: () => T): T | null => {
  try {
    return fn();
  } catch (error) {
    return null;
  }
};

/**
 * 修复 Error: Cannot parse render tree JSON: Missing low code point in surrogate pair
 */
export function fixSurrogatePairs(str: string): string {
  // 使用正则表达式查找孤立的高代理项（D800-DFFF之间但后面没有低代理项）
  // 或孤立的低代理项（后面没有高代理项）
  return str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|([^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g, (_, lowSurrogate) => {
    // 如果找到孤立的低代理项，则将其移除，否则替换高代理项为�（代表无法解析的字符）
    return lowSurrogate ? "" : "�";
  });
}
