import { LocalStorage } from "@raycast/api";
import { publicEncrypt, constants } from "crypto";
import type { AttendanceResponse, WorkHourStats, DailyAttendance } from "../types";

const COOKIE_STORAGE_KEY = "tt_work_hour_cookie";
const PERIOD_START_DATE = 26; // 每月26日为考勤周期开始
const TARGET_CARD_HOUR = 10; // 目标打卡时间：10点

// iTalent RSA 公钥
const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCCAGUAYFFTqlMwndAkJbO6GoOi
PTPMreeYJ6JfWbx5rliI4PevlmMZNISOtmZm6Sv44wlA4l+1y1wqAE31jPhH2bZ2
qqbJdiPB7VXpR5nQeSZGcNCSCK7N62A5b8ssEjbWd5jMBiqD/erLkc87/jQ0iqd3
42Oixc9y4LFn//ABWwIDAQAB
-----END PUBLIC KEY-----`;

/**
 * 使用 RSA 公钥加密密码
 */
export function encryptPassword(password: string): string {
  const buffer = Buffer.from(password, "utf8");
  const encrypted = publicEncrypt(
    {
      key: RSA_PUBLIC_KEY,
      padding: constants.RSA_PKCS1_PADDING,
    },
    buffer,
  );
  return encrypted.toString("base64");
}

/**
 * 从本地存储读取 Cookie
 */
export async function readCookie(): Promise<string | null> {
  const data = await LocalStorage.getItem<string>(COOKIE_STORAGE_KEY);
  return data || null;
}

/**
 * 保存 Cookie 到本地存储
 */
export async function saveCookie(cookie: string): Promise<void> {
  await LocalStorage.setItem(COOKIE_STORAGE_KEY, cookie);
}

/**
 * 清除本地存储的 Cookie
 */
export async function clearCookie(): Promise<void> {
  await LocalStorage.removeItem(COOKIE_STORAGE_KEY);
}

/**
 * 获取当前考勤周期
 * 每月26日到下月25日为一个周期
 */
export function getCurrentPeriod(): string {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 1, PERIOD_START_DATE);

  if (today.getDate() >= PERIOD_START_DATE) {
    start.setMonth(start.getMonth() + 1);
  }

  const end = new Date(start);
  end.setMonth(start.getMonth() + 1, 25);

  return `${formatDate(start)}-${formatDate(end)}`;
}

/**
 * 格式化日期为 yyyy/MM/dd
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}/${month}/${day}`;
}

/**
 * 计算平均工时和统计信息
 */
export function calculateWorkHour(response: AttendanceResponse, targetHour: number): WorkHourStats {
  let totalHour = 0;
  let totalNum = 0;
  let lateCount = 0;
  const today = formatDate(new Date());

  response.biz_data.forEach((item) => {
    const hour = Number(item.WorkPeriod.text);

    // 如果工时小于8.5，且为当天，则暂不计入平均工时
    if (hour < 8.5 && today === item.SwipingCardDate.value) {
      console.log(`当天数据暂不计入: ${hour}小时, 日期: ${item.SwipingCardDate.value}`);
      return;
    }

    if (hour > 0) {
      totalHour += hour;
      totalNum++;
    }

    // 统计迟到次数
    if (item.ActualForFirstCard) {
      const firstCardTime = new Date(item.ActualForFirstCard.value);
      const targetCardTime = new Date(firstCardTime);
      targetCardTime.setHours(TARGET_CARD_HOUR, 0, 0, 0);

      if (firstCardTime > targetCardTime) {
        lateCount++;
      }
    }
  });

  const avg = totalNum > 0 ? totalHour / totalNum : 0;
  const delta = totalHour - targetHour * totalNum;

  return {
    avg,
    delta,
    lateCount,
  };
}

/**
 * 格式化工时统计信息为显示文本
 */
export function formatWorkHourStats(stats: WorkHourStats): string {
  const messages: string[] = [];

  messages.push(`🕓 平均工时: ${stats.avg.toFixed(2)}小时`);

  if (stats.delta >= 0) {
    messages.push(`🐟 超出目标: ${stats.delta.toFixed(2)}小时`);
  } else {
    messages.push(`😭 不足目标: ${Math.abs(stats.delta).toFixed(2)}小时`);
  }

  if (stats.lateCount > 0) {
    messages.push(`🫵 迟到${stats.lateCount}次`);
  }

  return messages.join("  ");
}

/**
 * 解析每日考勤数据
 */
export function parseDailyAttendance(response: AttendanceResponse): DailyAttendance[] {
  return response.biz_data.map((item) => {
    const workHours = Number(item.WorkPeriod.text);
    const date = item.SwipingCardDate.value;
    const firstCard = item.ActualForFirstCard?.value;
    const lastCard = item.ActualForLastCard?.value;

    // 判断是否迟到
    let isLate = false;
    if (firstCard) {
      const firstCardTime = new Date(firstCard);
      const targetCardTime = new Date(firstCardTime);
      targetCardTime.setHours(TARGET_CARD_HOUR, 0, 0, 0);
      isLate = firstCardTime > targetCardTime;
    }

    return {
      date,
      workHours,
      firstCard,
      lastCard,
      isLate,
    };
  });
}

/**
 * 格式化时间为 HH:mm
 */
export function formatTime(dateString?: string): string {
  if (!dateString) return "--:--";
  const date = new Date(dateString);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * 获取星期几
 */
export function getWeekday(dateString: string): string {
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const date = new Date(dateString);
  return weekdays[date.getDay()] || "";
}

/**
 * 格式化日期为 MM月DD日（周X），使用空格对齐
 */
export function formatDateWithWeekday(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = getWeekday(dateString);

  // 格式化月份和日期，个位数前面加空格
  const monthStr = month < 10 ? ` ${month}` : `${month}`;
  const dayStr = day < 10 ? ` ${day}` : `${day}`;

  return `${monthStr}月${dayStr}日（${weekday}）`;
}
