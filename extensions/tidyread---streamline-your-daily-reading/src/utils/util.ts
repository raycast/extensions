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
      reject(new Error(`Operation timed out after ${timeoutMs} ms`));
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

export function retry<T>(fn: () => Promise<T>, retries = 3, delay = 0, err = null): Promise<T> {
  if (!retries) {
    return Promise.reject(err);
  }
  return fn().catch((error: any) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(retry(fn, retries - 1, delay, error)), delay);
    });
  });
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function filterByShownStatus<T extends { show: boolean }>(items: T[]): Omit<T, "show">[] {
  return items.filter((item) => item.show).map((item) => omit(item, "show"));
}
