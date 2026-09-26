/* 永不结束的进程判定。

   ponytail: 不逐个进程跑 codesign 判断 SIP。真正决定「能不能结束」的是进程属主：
   ps 的 uid 列比任何路径/签名启发式都便宜且准确（SIP 系统进程全部是 root/系统账户所有）。
   若将来要连 root 也要能杀，升级路径是给 child_process 走 osascript 提权。 */

/** 名字兜底：PID 复用后属主可能变，关键进程名再拦一层。 */
const CRITICAL_NAMES = new Set(["kernel_task", "launchd", "WindowServer", "loginwindow"]);

/** 当前用户 uid；非 POSIX 平台取不到时退化为「不按属主判定」。 */
const currentUid: number | undefined = process.getuid?.();

/** pid 0/1 = PID 0–1；系统关键进程 = system process；非当前用户所有 = another user。 */
export function protectedReason(input: { pid: number; name?: string; uid?: number }): string | undefined {
  if (input.pid <= 1) return "PID 0–1";
  if (input.name && CRITICAL_NAMES.has(input.name)) return "system process";
  if (currentUid !== undefined && input.uid !== undefined && input.uid !== currentUid) return "another user";
  return undefined;
}

/** pid 0/1 = 内核/launchd；系统关键进程名；非当前用户所有（无提权杀不动）。 */
export function isProtected(input: { pid: number; name?: string; uid?: number }): boolean {
  return protectedReason(input) !== undefined;
}

export const PROTECTED_ERROR = "Protected process: critical system process or permission denied";
