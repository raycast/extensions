/**
 * 与 portreaper-cli 的进程边界。
 *
 * 这个文件是扩展里唯一知道「引擎长什么样」的地方 —— 判定逻辑、白名单规则、
 * PID 复用防护统统在 Rust 侧，扩展只负责调用与展示。**任何时候都不要在 TS 里
 * 重新实现一条判定规则**：那正是这次架构拆分要根除的东西。
 */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";

import { installedCliPath } from "./install";

const execFileAsync = promisify(execFile);

/** CLI 的 JSON 契约主版本。不匹配时停下并提示升级，绝不照着渲染错乱的行。 */
export const EXPECTED_SCHEMA_VERSION = 1;

/** 与 src/model.ts 的 ProcessEntry 同形（CLI 输出全字段 snake_case，刻意保持一致）。 */
export type ParentRef = {
  pid: number;
  label: string;
  category: string;
  exe_path: string;
};

export type Confidence = "none" | "possible" | "likely" | "confirmed";

export type ProcessEntry = {
  pid: number;
  ppid: number;
  ports: number[];
  command: string;
  full_command: string;
  exe_path: string;
  app_label: string;
  app_category: string;
  parent_chain: ParentRef[];
  launcher_label: string;
  user: string;
  tty: string;
  elapsed_secs: number;
  start_unix: number | null;
  cpu_percent: number;
  cpu_percent_tree: number;
  mem_mb: number;
  state: string;
  is_zombie_suspect: boolean;
  confidence: Confidence;
  zombie_reasons: string[];
  is_whitelisted: boolean;
  /** 白名单键，由引擎产出 —— 见下方 whitelistKey 的注释，不要自己推。 */
  whitelist_key: string;
  duplicate_of: number | null;
};

export type ScanReport = {
  schema_version: number;
  scanned_at: number;
  platform: string;
  entries: ProcessEntry[];
};

/** 找不到二进制时抛出它 —— UI 据此渲染引导页而不是一条干巴巴的报错。 */
export class CliNotFoundError extends Error {
  constructor(
    readonly searched: string[],
    options?: ErrorOptions,
  ) {
    super("portreaper-cli not found", options);
    this.name = "CliNotFoundError";
  }
}

export class SchemaMismatchError extends Error {
  constructor(
    readonly got: number,
    readonly expected: number,
  ) {
    super(`Unsupported schema version ${got} (this extension speaks ${expected})`);
    this.name = "SchemaMismatchError";
  }
}

/**
 * 二进制发现阶梯，顺序即优先级：
 *
 * 1. 用户在扩展偏好里显式指定的路径 —— 永远最高，用于非常规安装位置
 *    （含开发者在本仓库 `cargo build` 出的产物）；
 * 2. 扩展自己下载并校验过的副本（supportPath）—— 常规用户走的就是这条；
 * 3. 已安装的桌面版 `.app` 内 —— 打包尚未落地，路径先留着，补上即生效；
 * 4. `cargo install` 的产物。
 *
 * **不查 `PATH`**：这里只对固定路径逐个 `existsSync`。想用 PATH 上的某一份，
 * 在扩展偏好里写出它的绝对路径。
 *
 * 唯一的候选构造点 —— `resolveCliPath` 与 `searchedLocations` 都从这里取，
 * 否则引导页会告诉用户「我找过 A、B、C」而实际找的是 A、B、C、D（曾经如此：
 * 两处各写一份，部分候选只存在于其中一处）。
 */
function cliCandidates(preferredPath: string | undefined, supportPath?: string): string[] {
  const candidates: string[] = [];
  if (preferredPath && preferredPath.trim() !== "") {
    candidates.push(preferredPath.trim());
  }
  if (supportPath) {
    candidates.push(installedCliPath(supportPath));
  }
  candidates.push("/Applications/Portreaper.app/Contents/MacOS/portreaper-cli");
  candidates.push(`${homedir()}/.cargo/bin/portreaper-cli`);
  return candidates;
}

/**
 * 阶梯上第一个真实存在的路径。全部落空时返回 null，由调用方触发自动安装
 * （Raycast Store 不允许把安装工作丢给用户，见 install.ts 的说明）。
 */
export function resolveCliPath(
  preferredPath: string | undefined,
  supportPath?: string,
): string | null {
  for (const c of cliCandidates(preferredPath, supportPath)) {
    if (existsSync(c)) return c;
  }
  return null;
}

/** 候选位置的人类可读清单 —— 引导页据此说清「我找过哪儿」。 */
export function searchedLocations(
  preferredPath: string | undefined,
  supportPath?: string,
): string[] {
  const candidates = cliCandidates(preferredPath, supportPath);
  // 未配置的两项在清单里要说明「为什么这条没出现」，而不是静静少一行
  if (!preferredPath || preferredPath.trim() === "") candidates.unshift("(preference not set)");
  if (!supportPath) candidates.unshift("(extension support path)");
  return candidates;
}

/** 路径存在 ≠ 能跑（架构不符、文件损坏、缺执行位）——用一次 --version 确认。 */
export async function verifyCli(cliPath: string, searched: string[]): Promise<void> {
  try {
    await execFileAsync(cliPath, ["--version"], { timeout: 5000 });
  } catch (e) {
    // 保留 cause：引导页只展示「找过哪些位置」，但真正的原因（Exec format error
    // / Permission denied / 超时）只在这个被吞掉的异常里
    throw new CliNotFoundError(searched, { cause: e });
  }
}

export type ScanOptions = {
  /** Windows 上 CPU 需要采样区间；跳过则该列恒为 0%（见 core 的 CpuSampling）。 */
  cpuSamplingMs?: number | "skip";
};

export async function scan(cliPath: string, opts: ScanOptions = {}): Promise<ScanReport> {
  const args = ["scan", "--json"];
  const cpu = opts.cpuSamplingMs ?? 200;
  args.push(cpu === "skip" ? "--cpu=skip" : `--cpu=${cpu}`);

  // maxBuffer：一台开发机几百个进程的 JSON 可以到几百 KB，Node 默认 1MB 够用，
  // 但给到 8MB 以免在极端机器上被静默截断成半个 JSON。
  const { stdout } = await execFileAsync(cliPath, args, {
    timeout: 20_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  const report = JSON.parse(stdout) as ScanReport;
  if (report.schema_version !== EXPECTED_SCHEMA_VERSION) {
    throw new SchemaMismatchError(report.schema_version, EXPECTED_SCHEMA_VERSION);
  }
  return report;
}

/**
 * 终止进程。`start_unix` 是扫描时捕获的身份令牌 —— 引擎据此核对进程身份，
 * 防止 scan 与点击之间 PID 被复用导致误杀。**没有令牌的行不该提供终止入口**
 * （引擎会 fail-closed 拒绝，但让按钮先消失体验更好）。
 *
 * 失败时 CLI 把 `{"code":"…"}` 写到 stderr —— 按 code 分支，不解析人类文案。
 */
export async function kill(
  cliPath: string,
  pid: number,
  startUnix: number,
  force: boolean,
): Promise<void> {
  const args = ["kill", String(pid), "--start-unix", String(startUnix)];
  if (force) args.push("--force");
  try {
    await execFileAsync(cliPath, args, { timeout: 15_000 });
  } catch (e) {
    throw new Error(killErrorMessage(e));
  }
}

/** 把 CLI 的结构化 stderr 翻成一句人话。认不出的一律透传原文，绝不吞掉。 */
export function killErrorMessage(e: unknown): string {
  const stderr = typeof e === "object" && e !== null && "stderr" in e ? String(e.stderr) : "";
  const firstLine = stderr.split("\n")[0]?.trim() ?? "";
  let code = "";
  try {
    code = (JSON.parse(firstLine) as { code?: string }).code ?? "";
  } catch {
    /* 不是 JSON：走原文透传 */
  }
  switch (code) {
    case "pid_reused":
      return "PID was reused — the process you saw is gone. Refresh and try again.";
    case "process_gone":
      return "That process no longer exists.";
    case "access_denied":
      return "Not permitted to terminate this process (protected by the system?).";
    case "identity_unknown":
      return "Missing identity token — refresh the list and try again.";
    default:
      return stderr.trim() || (e instanceof Error ? e.message : String(e));
  }
}

export async function whitelist(
  cliPath: string,
  action: "add" | "remove",
  key: string,
): Promise<void> {
  await execFileAsync(cliPath, ["whitelist", action, key], { timeout: 10_000 });
}

/**
 * 白名单键 —— **直接读引擎给的字段，绝不在 TS 里重推**。
 *
 * 推导规则有个反直觉的分支（`exe_path` 仅在含路径分隔符时可用，否则回退全命令行：
 * `ps -o comm=` 对 PATH 解析出的裸解释器名只返回 `node`，拿它当键会把全机同名
 * 监听者一起加白）。这个函数最初真的在这里重写了一遍那条规则 —— 而「每个前端各自
 * 实现一遍判定」正是这次架构拆分要根除的东西。改为由 `ProcessEntry.whitelist_key`
 * 承载后，「在 Raycast 加的星标桌面版认不出来」这类 bug 从结构上不可能发生。
 */
export function whitelistKey(e: ProcessEntry): string {
  return e.whitelist_key;
}
