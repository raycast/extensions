import { appendFileSync, existsSync, statSync, readFileSync, writeFileSync } from "fs";
import { environment } from "@raycast/api";
import { join } from "path";
import { LockState } from "./types";

const LOG_PATH = join(environment.supportPath, "lock-time-events.log");
const MAX_LOG_SIZE = 500 * 1024; // 500KB

/**
 * 事件日志条目
 */
export interface LogEntry {
  /** 事件时间戳（Unix ms） */
  timestamp: number;
  /** ISO 8601 时间字符串（便于阅读） */
  iso: string;
  /** 事件类型 */
  action: "state_change" | "detection_failed" | "gap_detected" | "anomaly" | "poll";
  /** 上一次状态 */
  prevState: LockState;
  /** 当前状态 */
  currentState: LockState;
  /** 经过的时间（ms） */
  elapsed: number;
  /** 检测方法 */
  method: string;
  /** 累计今日锁屏时长（ms） */
  todayLockedMs: number;
  /** 额外详情 */
  detail?: string;
}

/**
 * 记录事件到日志文件
 *
 * 使用同步 I/O 以确保在 no-view 命令退出前写入完成。
 * 每条日志为一行 JSON 对象。
 *
 * @param entry - 日志条目
 */
export function logEvent(entry: Omit<LogEntry, "iso">): void {
  try {
    // 轮转检查（每次写入前检查）
    rotateIfNeeded();

    const fullEntry: LogEntry = {
      ...entry,
      iso: new Date(entry.timestamp).toISOString(),
    };

    const line = JSON.stringify(fullEntry) + "\n";
    appendFileSync(LOG_PATH, line, "utf-8");
  } catch {
    // 日志失败不应阻塞主流程，静默忽略
    // 在生产环境中可以考虑将错误写入系统日志
  }
}

/**
 * 读取最近的 N 条日志
 *
 * @param n - 读取条数（默认 20）
 * @returns 日志条目数组（按时间倒序）
 */
export function readRecentLogs(n = 20): LogEntry[] {
  try {
    if (!existsSync(LOG_PATH)) {
      return [];
    }

    const content = readFileSync(LOG_PATH, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    // 取最后 n 行并反序（最新的在前）
    const recentLines = lines.slice(-n).reverse();

    return recentLines
      .map((line) => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is LogEntry => entry !== null);
  } catch {
    return [];
  }
}

/**
 * 日志轮转：如果文件超过 MAX_LOG_SIZE，截断保留最近的一半
 */
export function rotateIfNeeded(): void {
  try {
    if (!existsSync(LOG_PATH)) {
      return;
    }

    const stats = statSync(LOG_PATH);
    if (stats.size < MAX_LOG_SIZE) {
      return;
    }

    // 读取所有行，保留最近的一半
    const content = readFileSync(LOG_PATH, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    const keepLines = lines.slice(-Math.floor(lines.length / 2));

    writeFileSync(LOG_PATH, keepLines.join("\n") + "\n", "utf-8");
  } catch {
    // 轮转失败不阻塞，下次再试
  }
}

/**
 * 获取日志文件大小（字节），用于诊断显示
 */
export function getLogFileSize(): number {
  try {
    if (!existsSync(LOG_PATH)) {
      return 0;
    }
    return statSync(LOG_PATH).size;
  } catch {
    return 0;
  }
}

/**
 * 获取日志文件路径（用于调试）
 */
export function getLogFilePath(): string {
  return LOG_PATH;
}
