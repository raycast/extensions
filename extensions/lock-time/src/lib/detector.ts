import { execSync } from "child_process";
import { LockState } from "./types";

/**
 * 被视为锁屏状态的前台进程名称列表（用于 AppleScript 备用检测）
 */
const LOCKED_PROCESSES = ["loginwindow", "ScreenSaverEngine"];

/**
 * Swift 脚本：通过 CoreGraphics CGSessionCopyCurrentDictionary 检测锁屏状态
 *
 * 在 macOS 26 (Tahoe) 上，JXA 的 ObjC bridge 无法正确桥接 CFDictionary，
 * 导致 CGSSessionScreenIsLocked 键丢失。Swift 原生支持 CFDictionary→Dictionary 转换，
 * 因此使用 Swift 作为主要检测方法。
 *
 * 输出格式：JSON，包含 state 和字典所有键（用于诊断）
 */
const SWIFT_DETECT_SCRIPT = `
import CoreGraphics
import Foundation

if let cfDict = CGSessionCopyCurrentDictionary(),
   let dict = cfDict as? [String: Any] {
    let locked = dict["CGSSessionScreenIsLocked"] as? Bool ?? false
    let state = locked ? "locked" : "unlocked"
    let keys = Array(dict.keys)
    let info: [String: Any] = ["state": state, "keys": keys]
    if let jsonData = try? JSONSerialization.data(withJSONObject: info),
       let jsonStr = String(data: jsonData, encoding: .utf8) {
        print(jsonStr)
    } else {
        print("{\\"state\\":\\"\\(state)\\",\\"keys\\":[]}")
    }
} else {
    print("{\\"state\\":\\"error\\",\\"keys\\":[]}")
}
`;

/**
 * 检测方法类型
 */
type DetectMethod = "swift-cgsession" | "applescript" | "fallback";

/**
 * 检测结果缓存（用于短时间内避免重复执行 Swift 脚本）
 */
let cachedResult: { result: DetectResult; timestamp: number } | null = null;
const CACHE_DURATION_MS = 5000; // 5 秒缓存

/**
 * 检测结果（包含诊断信息）
 */
export interface DetectResult {
  state: LockState;
  /** 使用的检测方法 */
  method: DetectMethod;
  /** 检测详情 */
  detail: string;
  /** 是否检测成功 */
  success: boolean;
  /** 错误信息（如有） */
  error?: string;
}

/**
 * 方法 1（推荐）：通过 Swift + CoreGraphics 检测锁屏状态
 *
 * 原理：调用 CGSessionCopyCurrentDictionary() 获取当前会话信息，
 * 检查 CGSSessionScreenIsLocked 字段。
 *
 * 使用 Swift 而非 JXA 的原因：macOS 26 的 JXA ObjC bridge 无法
 * 正确桥接 CFDictionary，但 Swift 的原生 CoreFoundation→Swift 桥接正常。
 *
 * @returns 检测结果，或 null 表示此方法不可用
 */
function detectViaSwiftCGSession(): DetectResult | null {
  try {
    const rawOutput = execSync("swift -", {
      input: SWIFT_DETECT_SCRIPT,
      timeout: 10000,
      encoding: "utf-8",
    }).trim();

    let parsed: { state: string; keys: string[] };
    try {
      parsed = JSON.parse(rawOutput);
    } catch {
      return null;
    }

    if (parsed.state === "error") {
      return null;
    }

    // 验证返回了有意义的键（防止 macOS 版本差异导致空字典）
    if (parsed.keys.length <= 1) {
      return null;
    }

    return {
      state: parsed.state === "locked" ? "locked" : "unlocked",
      method: "swift-cgsession",
      detail: `Swift CGSession: ${parsed.state} (${parsed.keys.length} keys)`,
      success: true,
    };
  } catch {
    return null;
  }
}

/**
 * 方法 2（备用）：通过 AppleScript 检测前台进程判断锁屏状态
 *
 * 原理：获取当前前台进程名称，如果是 loginwindow 或 ScreenSaverEngine 则视为锁屏。
 *
 * 注意：需要 Raycast 的 Automation 权限（System Events），
 * 在锁屏期间可能无法执行。
 *
 * @returns 检测结果，或 null 表示此方法不可用
 */
function detectViaAppleScript(): DetectResult | null {
  try {
    const script =
      'tell application "System Events" to get name of first application process whose frontmost is true';
    const result = execSync(`osascript -e '${script}'`, {
      timeout: 5000,
      encoding: "utf-8",
    }).trim();

    const isLocked = LOCKED_PROCESSES.includes(result);
    return {
      state: isLocked ? "locked" : "unlocked",
      method: "applescript",
      detail: `Frontmost process: ${result}`,
      success: true,
    };
  } catch {
    return null;
  }
}

/**
 * 检测当前 Mac 是否处于锁屏状态（带诊断信息）
 *
 * 使用多级检测策略：
 * 1. 优先使用 Swift + CGSessionCopyCurrentDictionary（macOS 26 上最可靠）
 * 2. 回退到 AppleScript 检测前台进程（需要 Automation 权限）
 * 3. 全部失败时标记为检测失败（让调用方决定如何处理）
 *
 * 性能优化：5 秒内重复调用会返回缓存结果，避免频繁执行 Swift 脚本
 *
 * @param skipCache - 是否跳过缓存（默认 false）
 * @returns 检测结果，包含状态、方法、详情和是否成功
 */
export function detectLockStateWithInfo(skipCache = false): DetectResult {
  // 检查缓存（5 秒内直接返回）
  if (!skipCache && cachedResult) {
    const age = Date.now() - cachedResult.timestamp;
    if (age < CACHE_DURATION_MS) {
      return cachedResult.result;
    }
  }

  // 方法 1: Swift CGSession (macOS 26 上最可靠)
  const swiftResult = detectViaSwiftCGSession();
  if (swiftResult) {
    cachedResult = { result: swiftResult, timestamp: Date.now() };
    return swiftResult;
  }

  // 方法 2: AppleScript (备用)
  const asResult = detectViaAppleScript();
  if (asResult) {
    cachedResult = { result: asResult, timestamp: Date.now() };
    return asResult;
  }

  // 全部失败
  const fallbackResult: DetectResult = {
    state: "unlocked",
    method: "fallback",
    detail: "All detection methods failed",
    success: false,
    error: "Swift CGSession and AppleScript detection both failed.",
  };

  // 失败结果不缓存（下次重试）
  return fallbackResult;
}

/**
 * 简单版本：仅返回锁屏状态（向后兼容）
 */
export function detectLockState(): LockState {
  return detectLockStateWithInfo().state;
}
