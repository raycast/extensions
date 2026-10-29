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

/**
 * 判断「两次扫描里的这一行是不是同一个进程」时，`start_unix` 允许的偏差（秒）。
 *
 * **绝不能用 `===`**：macOS 的 `start_unix` 由 `now - etime` 推导，而 `etime` 只有
 * 秒级粒度 —— 同一个进程在连续扫描里读到的值会 ±1s 抖动（实测 14 轮采样，13 个
 * 进程全部出现 1 秒极差）。严格相等会把「进程还在」随机读成「进程已消失」，
 * 终止后的存活确认就形同虚设。
 *
 * 取值与引擎 `platform.rs` 的 `START_TOLERANCE_SECS` 一致：被复用的 PID 其创建
 * 时间必然晚于扫描时刻，远超这个容差，不会被误认成同一个进程。
 */
export const START_MATCH_TOLERANCE_SECS = 5;

/** 两次扫描里的行是否指向同一个进程（PID + 创建时间，带容差）。 */
export function isSameProcess(e: ProcessEntry, pid: number, startUnix: number | null): boolean {
  if (e.pid !== pid) return false;
  if (startUnix == null || e.start_unix == null) return true; // 没有令牌可比，只能认 PID
  return Math.abs(e.start_unix - startUnix) <= START_MATCH_TOLERANCE_SECS;
}

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

/**
 * CLI 的 `platform_name()`（crates/portreaper-cli/src/main.rs）只会产出这三个值。
 * 收窄成字面量联合，好让「破坏性动作按平台取舍」的判断能被 tsc 兜住 ——
 * 写成 string 时 `platform !== "windows"` 看着无害，却把 unknown 也放行了。
 */
export type Platform = "macos" | "windows" | "unknown";

export type ScanReport = {
  schema_version: number;
  scanned_at: number;
  platform: Platform;
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
 * 路径上的程序跑起来了，但吐的不是 portreaper-cli 的 JSON。
 *
 * `verifyCli` 只跑 `--version`，任何能应答它的二进制都能过关 —— 用户在偏好里指到
 * 别的工具时，裸 `JSON.parse` 抛的是 `Unexpected token … in JSON at position 0`，
 * 对「我该改哪里」毫无指向性。归一成本类型，UI 才能说清「这条路径上的程序
 * 不像 portreaper-cli」。
 */
export class CliOutputError extends Error {
  constructor(
    readonly cliPath: string,
    readonly sample: string,
    options?: ErrorOptions,
  ) {
    super(`${cliPath} did not return a Portreaper scan report`, options);
    this.name = "CliOutputError";
  }
}

/**
 * `portreaper-cli scan` 没能跑完：超时、非零退出、maxBuffer 超限，或托管副本过旧
 * 到认不出 `--cpu` 参数（`verifyCli` 只跑 `--version`，拦不住这种）。
 *
 * 它存在的唯一理由是**别把原始 stderr 甩到界面上**。CLI 的 stderr 有十几处是中文
 * （`crates/portreaper-cli/src/main.rs` 的 eprintln!），而 Node 的 execFile 异常
 * message 形如 `Command failed: <二进制绝对路径> scan --json --cpu=200\n<中文用法>`。
 * 这是英文单语的 Store 扩展，kill / whitelist 两条路径早就按这条纪律包装过了，
 * 唯独 scan 一路裸奔（评审发现）。原文进 `cause` 与 console，报 issue 时仍拿得到。
 */
export class ScanFailedError extends Error {
  constructor(options?: ErrorOptions) {
    super("Could not run portreaper-cli", options);
    this.name = "ScanFailedError";
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
  // 但给到 8MB 以免在极端机器上撞上限 —— 超限时 Node 会**杀掉子进程并报
  // ERR_CHILD_PROCESS_STDIO_MAXBUFFER**，不是静默截断，但那条报错同样不可行动。
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(cliPath, args, {
      timeout: 20_000,
      maxBuffer: 8 * 1024 * 1024,
    }));
  } catch (e) {
    // 与 kill / whitelist 同形：原文只进控制台，界面拿一句英文（见 ScanFailedError）
    console.error("portreaper-cli scan failed:", e);
    throw new ScanFailedError({ cause: e });
  }
  return parseScanReport(stdout, cliPath);
}

/**
 * stdout → `ScanReport`。两道检查的顺序是有讲究的：
 *
 * 1. **先确认这是不是我们的输出**（能否解析 + `schema_version` 是不是数字）。
 *    跳过这步的话，一个返回 `{}` 的程序会因 `undefined !== 1` 被报成
 *    SchemaMismatch，把用户导向「升级扩展」这条完全错误的指引；
 * 2. 再比版本。
 */
export function parseScanReport(stdout: string, cliPath: string): ScanReport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (e) {
    throw new CliOutputError(cliPath, stdout.slice(0, 200), { cause: e });
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as ScanReport).schema_version !== "number" ||
    !Array.isArray((parsed as ScanReport).entries)
  ) {
    throw new CliOutputError(cliPath, stdout.slice(0, 200));
  }
  const report = parsed as ScanReport;
  if (report.schema_version !== EXPECTED_SCHEMA_VERSION) {
    throw new SchemaMismatchError(report.schema_version, EXPECTED_SCHEMA_VERSION);
  }
  // 认不出的 platform 一律降级为 unknown，由消费端走保守分支：这个字段决定
  // 破坏性动作的可见性，缺失/陌生值必须失败关闭，而不是被当成「反正不是 windows」。
  return { ...report, platform: normalizePlatform(report.platform) };
}

function normalizePlatform(value: unknown): Platform {
  return value === "macos" || value === "windows" ? value : "unknown";
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
    throw new KillFailedError(killErrorCode(e), killErrorMessage(e), { cause: e });
  }
}

/** 引擎 `KillError` 的 serde 镜像（`crates/portreaper-core/src/platform.rs`）。
 *  桌面版的对应物是 `src/model.ts` 的 `KillError` 联合 —— 新增变体时两处都要加，
 *  CLAUDE.md 把这条写成了硬要求（`os` 当初就是在这一处漏掉的）。 */
export type KillErrorCode =
  | "identity_unknown"
  | "process_gone"
  | "pid_reused"
  | "access_denied"
  | "os";

/**
 * 带语义码的终止失败。调用方据 `code` 分叉 UI —— 例如「进程仍在」时提供
 * Force Kill，而 `process_gone` / `pid_reused` 绝不提供（对着已消失或已被复用
 * 的 PID 劝人再用力杀一次是错误引导）。**永远不要对 message 做子串匹配**，
 * 那正是 v0.9.0 删掉 `ERR_*:` 前缀契约时要根除的东西。
 */
export class KillFailedError extends Error {
  constructor(
    readonly code: KillErrorCode | null,
    message: string,
    options?: ErrorOptions,
  ) {
    // 保留 cause：翻译成人话之后，原始的 execFile 异常（含 stderr、退出码）
    // 只剩这一条线索，报 issue 时还用得上
    super(message, options);
    this.name = "KillFailedError";
  }
}

/** CLI 结构化 stderr 的第一行 → `{code, message}`；不是我们的形态时 null。 */
function parseKillError(e: unknown): { code: KillErrorCode; message: string } | null {
  const stderr = typeof e === "object" && e !== null && "stderr" in e ? String(e.stderr) : "";
  const firstLine = stderr.split("\n")[0]?.trim() ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(firstLine);
  } catch {
    return null; // 用法错误（exit 2）等路径的 stderr 不是 JSON
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { code, message } = parsed as { code?: unknown; message?: unknown };
  switch (code) {
    case "identity_unknown":
    case "process_gone":
    case "pid_reused":
    case "access_denied":
    case "os":
      return { code, message: typeof message === "string" ? message : "" };
    default:
      return null;
  }
}

/** 供 UI 分叉用的语义码；认不出时 null。 */
export function killErrorCode(e: unknown): KillErrorCode | null {
  return parseKillError(e)?.code ?? null;
}

/**
 * 把 CLI 的结构化 stderr 翻成一句英文人话。
 *
 * **绝不整段回显 stderr**：CLI 失败时往 stderr 写两行（`{json}` + 一句中文日志），
 * 用法错误更是整段中文；本扩展是英文单语的 Store 扩展，把这些原样甩进 toast
 * 既不合规也帮不上忙。
 *
 * 认不出的形态也**不能**退回 `e.message`：Node 的 execFile 会把
 * `Command failed: <二进制绝对路径> kill …` 连同整段 stderr 一起塞进 message ——
 * 那既泄露安装路径又把中文带进来，等于绕一圈违反了上面这条。统一给一句英文，
 * 原文只进 `console.error`（Raycast 的开发者日志里仍查得到）。
 */
// 下面这个 switch 刻意**没有 default**：`KillErrorCode` 加一个变体时，
// 漏改这里会让函数出现「没有返回值的路径」，tsc 直接报错。这是本文件里唯一的
// 编译期穷尽性检查 —— CLAUDE.md 要求的「加变体同步三处」在 Raycast 侧靠它兜底。
export function killErrorMessage(e: unknown): string {
  const parsed = parseKillError(e);
  if (!parsed) {
    console.error("portreaper-cli kill:", e);
    return "The engine could not terminate this process. Refresh and try again.";
  }
  switch (parsed.code) {
    case "pid_reused":
      return "PID was reused — the process you saw is gone. Refresh and try again.";
    case "process_gone":
      return "That process no longer exists.";
    case "access_denied":
      return "Not permitted to terminate this process (protected by the system?).";
    case "identity_unknown":
      return "Missing identity token — refresh the list and try again.";
    case "os":
      // 无语义的系统原文（`Operation not permitted` 之类），只能原样展示。
      // 它由引擎构造、不含 stderr 全文，是唯一可以安全透传的一支。
      return parsed.message.trim() || "The system refused to terminate this process.";
  }
}

export async function whitelist(
  cliPath: string,
  action: "add" | "remove",
  key: string,
): Promise<void> {
  try {
    await execFileAsync(cliPath, ["whitelist", action, key], { timeout: 10_000 });
  } catch (e) {
    throw new Error(whitelistErrorMessage(e), { cause: e });
  }
}

/**
 * 白名单操作失败的英文文案。
 *
 * 不裹这一层的话，用户看到的是 Node 原样吐出的
 * `Command failed: /Users/…/extensions/portreaper/bin/portreaper-cli whitelist add <key>`
 * 外加 CLI 的中文提示 —— 一次泄露完整安装路径，一次在英文界面里出现中文。
 * 原文不丢，只是改去 `console.error`（Raycast 的开发者日志里仍可查）。
 */
export function whitelistErrorMessage(e: unknown): string {
  // 原文进开发者日志：失败原因可能是目录不可写、也可能是二进制版本不对、磁盘满、
  // 超时……**不要**在文案里断言其中某一个（把用户引向错误的排查方向比不说更糟）。
  console.error("portreaper-cli whitelist:", e);
  return "Could not update the shared whitelist. The engine's log has the details.";
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
