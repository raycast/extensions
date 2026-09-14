import {
  chmod,
  copyFile,
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  stat,
  unlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { basename, dirname, join } from "node:path";
import {
  type ProjectMeta,
  type RegistryData,
  createEmptyRegistry,
  formatRegistry,
  parseRegistry,
  type ShellConfig,
  createEmptyShellConfig,
  formatShellConfig,
  generateShellScript,
  parseShellConfig,
  computeFingerprint,
  generateSnapshotFilename,
  parseSnapshotFilename,
  formatSnapshotTimestamp,
  checkSnapshotSoftLimit,
  SNAPSHOT_SOFT_LIMIT,
  ConfigFileError,
  type ConfigFailureReason,
  CURRENT_REGISTRY_VERSION,
  CURRENT_SHELL_CONFIG_VERSION,
  type PresetsFile,
  createEmptyPresetsFile,
  formatPresetsFile,
  parsePresetsFile,
  CURRENT_PRESETS_VERSION,
  isEnvFilename,
  ENV_TMP_MARKER,
} from "@env-keeper/core";
import { t } from "../i18n.js";
import { type ValidatableShell, validateShellSyntax } from "./shellValidator.js";

const BASE_DIR = join(homedir(), ".env-keeper");
const REGISTRY_FILE = join(BASE_DIR, "registry.json");
const SHELL_CONFIG_FILE = join(BASE_DIR, "shell.json");
const PRESETS_FILE = join(BASE_DIR, "presets.json");
const SHELL_SCRIPT_FILE = join(BASE_DIR, "shell.sh");
const SNAPSHOTS_DIR = join(BASE_DIR, "snapshots");
const BACKUPS_DIR = join(BASE_DIR, "backups");
// 扩展自己那两个配置文件(shell.json / registry.json)的历史。
// 不塞进 snapshots/ 是因为那层目录是按项目名寻址的,真有个项目叫 _shell 就会撞上
const CONFIG_HISTORY_DIR = join(BASE_DIR, "config-history");

export function getBaseDir(): string {
  return BASE_DIR;
}

/** 给隔离文件/备份文件用的时间戳后缀,和快照命名保持同一种可读格式 */
function fileTimestamp(date = new Date()): string {
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

/**
 * 数据目录下新建的目录一律 0700(只有属主能进),新建的文件一律 0600(只有属主能读写)。
 * 这两条都只作用于"新建":mkdir / writeFile 对已存在的路径不会改权限,
 * 用户自己 chmod 放宽过就一直是他设的那个,插件不跟他抢
 */
const PRIVATE_DIR_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;

/** 在数据目录下建目录:只有属主能进。只对新建生效,mkdir 不会改已存在目录的权限 */
function mkdirPrivate(dir: string): Promise<string | undefined> {
  return mkdir(dir, { recursive: true, mode: PRIVATE_DIR_MODE });
}

/** 取一个已存在文件的权限位;取不到返回 undefined(调用方按新建处理) */
async function modeOf(filePath: string): Promise<number | undefined> {
  try {
    return (await stat(filePath)).mode & 0o777;
  } catch {
    return undefined;
  }
}

/**
 * 同一个目标路径的写入排队进行。
 * 临时文件名是按目标文件固定的(不用时间戳,见 writeFileAtomic 里的说明),
 * 所以两次并发写同一个目标会互相踩掉对方的临时文件——启动时两个视图同时 loadRegistry 就会撞上
 */
const writeLocks = new Map<string, Promise<void>>();

async function withFileLock<T>(target: string, task: () => Promise<T>): Promise<T> {
  const previous = writeLocks.get(target) ?? Promise.resolve();
  const current = previous.then(task, task);
  const settled = current.then(
    () => undefined,
    () => undefined,
  );
  writeLocks.set(target, settled);
  try {
    return await current;
  } finally {
    // 自己已经是队尾就清掉,免得 Map 跟着快照这类一次性路径一直涨
    if (writeLocks.get(target) === settled) writeLocks.delete(target);
  }
}

/**
 * 原子写:先写同目录下的临时文件,再 rename 覆盖目标。
 * 同一文件系统内 rename 是原子的——读到的要么是完整的旧文件、要么是完整的新文件,
 * 不会出现"写到一半进程被杀"留下的残缺内容(Raycast 被系统内存回收过,这不是假想)。
 * 临时文件必须待在目标文件所在目录:跨文件系统的 rename 没有原子性保证,而项目常在另一个卷上
 *
 * 三个必须处理的细节:
 * - 目标是符号链接时先解析真实路径,否则 rename 会把链接本身换掉
 * - 保留原文件权限:用户可能把 .env chmod 600 过,不能因为一次保存又放开成 644
 * - 临时文件自己按 0600 写、名字以 `.env` 开头:前者让它在存在的那一小段时间里也读不到,
 *   后者让项目的 `.env*` 忽略规则能挡住崩溃留下的残片
 */
export async function writeFileAtomic(filePath: string, content: string, explicitMode?: number): Promise<void> {
  let target = filePath;
  if (existsSync(filePath)) {
    try {
      target = await realpath(filePath);
    } catch {
      // 解析不了就按原路径写
    }
  }

  let mode = explicitMode;
  if (mode === undefined && existsSync(target)) {
    try {
      mode = (await stat(target)).mode & 0o777;
    } catch {
      // 拿不到就当新建处理
    }
  }
  const finalMode = mode ?? PRIVATE_FILE_MODE;

  const dir = dirname(target);
  // 名字固定(只有进程号,不带时间戳):崩溃留下的残片下次写同一个文件时会被直接覆盖,
  // 不会一组一次地攒起来。并发由上面的 withFileLock 挡住
  const tmpPath = join(dir, `${basename(target)}${ENV_TMP_MARKER}-${process.pid}`);
  return withFileLock(target, async () => {
    try {
      await writeFile(tmpPath, content, { encoding: "utf8", mode: PRIVATE_FILE_MODE });
      await rename(tmpPath, target);
      if (finalMode !== PRIVATE_FILE_MODE) {
        // 内容这时已经就位,权限调不回去不影响文件本身,所以失败不抛
        await chmod(target, finalMode).catch(() => {});
      }
    } catch (e) {
      try {
        await unlink(tmpPath);
      } catch {
        // 临时文件清不掉不影响主流程
      }
      throw e;
    }
  });
}

/**
 * 时间戳只精确到秒,同一秒内连续保存(快速切开关、连按上移)会撞名,
 * 直接写就会把上一份历史覆盖掉。撞上就在时间戳后面补 -2 / -3。
 */
async function uniqueSnapshotPath(dir: string, filename: string): Promise<string> {
  const first = join(dir, filename);
  if (!existsSync(first)) return first;

  const dot = filename.indexOf(".");
  const stamp = dot < 0 ? filename : filename.slice(0, dot);
  const rest = dot < 0 ? "" : filename.slice(dot);
  for (let i = 2; i < 1000; i++) {
    const candidate = join(dir, `${stamp}-${i}${rest}`);
    if (!existsSync(candidate)) return candidate;
  }
  return first;
}

/** 扩展自己的三份配置文件,各自有一条历史线 */
export type ConfigKind = "shell" | "registry" | "presets";

export interface ConfigSnapshotItem {
  filename: string;
  filePath: string;
  /** 形如 2026-09-06-094028 */
  timestampStr: string;
  size: number;
  mtime: Date;
}

export interface ConfigSnapshotResult {
  /** 本次是否真的打了快照(内容没变就不打) */
  taken: boolean;
  snapshotCount?: number;
  snapshotLimitExceeded?: boolean;
  snapshotLimit?: number;
}

function configHistoryDir(kind: ConfigKind): string {
  return join(CONFIG_HISTORY_DIR, kind);
}

function configFileName(kind: ConfigKind): string {
  if (kind === "shell") return "shell.json";
  if (kind === "presets") return "presets.json";
  return "registry.json";
}

/**
 * 写入前把旧内容存一份。
 *
 * 为什么 Shell 轨比项目轨更需要这个:.env 至少可能在 git 里有副本,
 * 而片段只存在 shell.json 这一处,改错、删错都没有任何退路。
 * 内容没变就不打,避免反复切同一个开关把历史灌满。
 */
async function snapshotConfigBeforeWrite(
  kind: ConfigKind,
  filePath: string,
  nextContent: string,
): Promise<ConfigSnapshotResult> {
  if (!existsSync(filePath)) return { taken: false };

  let oldContent: string;
  try {
    oldContent = await readFile(filePath, "utf8");
  } catch {
    return { taken: false };
  }
  if (oldContent === nextContent) return { taken: false };

  const dir = configHistoryDir(kind);
  try {
    if (!existsSync(dir)) await mkdirPrivate(dir);
    const snapshotPath = await uniqueSnapshotPath(dir, `${formatSnapshotTimestamp()}.${configFileName(kind)}`);
    await writeFileAtomic(snapshotPath, oldContent);

    const entries = await readdir(dir, { withFileTypes: true });
    const count = entries.filter((e) => e.isFile()).length;
    return {
      taken: true,
      snapshotCount: count,
      snapshotLimitExceeded: checkSnapshotSoftLimit(count).exceeded,
      snapshotLimit: SNAPSHOT_SOFT_LIMIT,
    };
  } catch {
    // 存不下历史不该拖累这次保存本身
    return { taken: false };
  }
}

/** 某份配置的历史列表,最新在前 */
export async function listConfigSnapshots(kind: ConfigKind): Promise<ConfigSnapshotItem[]> {
  const dir = configHistoryDir(kind);
  if (!existsSync(dir)) return [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const items: ConfigSnapshotItem[] = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const match = /^(\d{4}-\d{2}-\d{2}-\d{6})(?:-\d+)?\./.exec(entry.name);
      if (!match?.[1]) continue;
      const filePath = join(dir, entry.name);
      const fileStat = await stat(filePath);
      items.push({
        filename: entry.name,
        filePath,
        timestampStr: match[1],
        size: fileStat.size,
        mtime: fileStat.mtime,
      });
    }
    return items.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  } catch {
    return [];
  }
}

export async function readConfigSnapshot(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

export async function deleteConfigSnapshot(filePath: string): Promise<void> {
  if (existsSync(filePath)) await unlink(filePath);
}

/**
 * 改写一份历史记录的内容,但保留它原来的时间。
 * 方案历史按项目清理时不删文件、只摘掉本项目的部分;历史列表按修改时间排序,改写不保时间的话这一份会跳到最前面
 */
export async function rewriteConfigSnapshot(filePath: string, content: string): Promise<void> {
  const before = await stat(filePath);
  await writeFileAtomic(filePath, content);
  await utimes(filePath, before.atime, before.mtime);
}

/** 配置文件读不出来时的情况说明,交给界面告诉用户发生了什么 */
export interface ConfigLoadProblem {
  reason: ConfigFailureReason;
  /** 原文件现在在哪(绝对路径):挪开成功是新名字,没挪开(或读不出来)就是原路径 */
  backupPath: string;
  /** 原文件有没有被成功挪到一边。没挪开时它还在原位,一保存就会被覆盖,所以写入会被挡住 */
  quarantined: boolean;
  /** 仅 tooNew 时有值:文件里声明的版本号 */
  fileVersion?: number;
  /** 当前扩展支持到的版本,给界面组织提示文案用 */
  currentVersion: number;
}

export interface LoadResult<T> {
  data: T;
  problem?: ConfigLoadProblem;
}

/**
 * 读不出来的配置文件挪到一边,绝不原地覆盖。
 * 这是整条链路的关键:只要原文件还在,用户就有机会自己修个逗号救回来。
 */
async function quarantineConfigFile(
  filePath: string,
  error: unknown,
  currentVersion: number,
): Promise<ConfigLoadProblem> {
  const reason: ConfigFailureReason = error instanceof ConfigFileError ? error.reason : "malformed";
  const suffix = reason === "tooNew" ? "unsupported" : "corrupted";
  const backupPath = `${filePath}.${suffix}-${fileTimestamp()}`;
  let quarantined = true;
  try {
    await rename(filePath, backupPath);
  } catch {
    // 连改名都失败(权限等):如实说"没挪开",原文件还在原位;此前这里照样报"已挪到 xxx",用户一保存就把它盖了
    quarantined = false;
  }
  return {
    reason,
    backupPath: quarantined ? backupPath : filePath,
    quarantined,
    fileVersion: error instanceof ConfigFileError ? error.fileVersion : undefined,
    currentVersion,
  };
}

/** 文件在但读不出来(权限、IO):不是"没配过",要明确报出来,而且不能写 */
function unreadableProblem(filePath: string, currentVersion: number): ConfigLoadProblem {
  return { reason: "unreadable", backupPath: filePath, quarantined: false, currentVersion };
}

/**
 * 写配置文件之前的最后一道闸:文件在、却读不出来或解析不了,说明它还留着用户的数据而界面拿到的是空的,
 * 这时写入就是覆盖。不管界面有没有把问题条显示出来,这里一律拒绝
 */
async function assertConfigWritable(filePath: string, parse: (content: string) => unknown): Promise<void> {
  if (!existsSync(filePath)) return;
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch {
    throw new Error(t("cfg.writeBlockedUnreadable", { name: basename(filePath) }));
  }
  try {
    parse(content);
  } catch {
    throw new Error(t("cfg.writeBlockedCorrupted", { name: basename(filePath) }));
  }
}

export function getShellScriptPath(): string {
  return SHELL_SCRIPT_FILE;
}

/** 写进 rc 文件里的路径:用 `$HOME`,dotfiles 同步到别的机器也能用 */
const SHELL_SCRIPT_HOME_PATH = '"$HOME/.env-keeper/shell.sh"';

/**
 * 要写进 rc 文件的那一行。带存在性保护:卸载插件或删掉数据目录之后,每开一个终端都会报"文件不存在",
 * 用户很难联想到是这个扩展写的那一行;路径用 `$HOME` 并加引号(用户目录含空格、换机器都不坏)
 */
export function getShellSourceLine(): string {
  return `[ -f ${SHELL_SCRIPT_HOME_PATH} ] && source ${SHELL_SCRIPT_HOME_PATH}`;
}

/** 粘进已开终端的刷新命令(不需要保护,文件不在就让它报错更直观) */
export function getShellRefreshCommand(): string {
  return `source ${SHELL_SCRIPT_HOME_PATH}`;
}

/** 引用 shell.sh 的各种写法:`~/…`、`$HOME/…`、绝对路径,带不带引号 */
const SHELL_SCRIPT_REF = String.raw`["']?(?:~|\$HOME|\$\{HOME\}|/[^"'\s]*)/\.env-keeper/shell\.sh["']?`;
/** 这一行会真的执行 source(不是注释、不是提到路径的别的命令) */
const SOURCES_SHELL_SCRIPT_RE = new RegExp(String.raw`(?:^|\s|;|&&|\|\|)(?:source|\.)\s+${SHELL_SCRIPT_REF}(?:\s|;|$)`);
/**
 * 是不是 Env Keeper 自己写的那一行(整行就是它,前后只允许空白):
 * 老写法 `source /绝对路径/.env-keeper/shell.sh`,新写法带 `[ -f … ] &&` 保护
 */
const ENV_BUTLER_LINE_RE = new RegExp(
  String.raw`^\s*(?:\[\s+-f\s+${SHELL_SCRIPT_REF}\s+\]\s*&&\s*)?source\s+${SHELL_SCRIPT_REF}\s*$`,
);

/** 这一行是否会让 shell 加载 shell.sh(注释掉的不算;`alias x="cat …/shell.sh"` 这种只是提到路径的也不算) */
export function isShellSourceLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.startsWith("#")) return false;
  return SOURCES_SHELL_SCRIPT_RE.test(trimmed);
}

/** 这一行是否是 Env Keeper 写入的格式(只删这种;用户自己包在 if … fi 里的写法不碰) */
export function isEnvButlerSourceLine(line: string): boolean {
  return ENV_BUTLER_LINE_RE.test(line.replace(/\r$/, ""));
}

export interface ShellRcInfo {
  /** 探测到的登录 shell 类型;unknown 表示既不是 zsh 也不是 bash(如 fish),无法给出确定建议 */
  shellName: "zsh" | "bash" | "unknown";
  /** 系统用户记录里的登录 shell 路径,如 /opt/homebrew/bin/fish;unknown 时界面用它告诉用户"检测到的是什么" */
  loginShell: string;
  /** 建议添加 source 行的目标文件绝对路径 */
  rcPath: string;
  /** 给用户看的短路径,如 ~/.zshrc */
  rcLabel: string;
  /** 该文件里是否已经包含 source shell.sh 的配置(不区分写的是 ~ 还是绝对路径) */
  isSourced: boolean;
}

/**
 * 探测用户的登录 shell(读系统用户记录,不依赖当前进程的 $SHELL,更可靠),
 * 给出该精确添加 source 配置到哪个文件,以及是否已经添加过。
 */
export async function detectShellRc(): Promise<ShellRcInfo> {
  const loginShell = userInfo().shell || "";
  const home = homedir();

  let shellName: ShellRcInfo["shellName"] = "unknown";
  let rcPath = join(home, ".zshrc");

  if (loginShell.includes("zsh")) {
    shellName = "zsh";
    rcPath = join(home, ".zshrc");
  } else if (loginShell.includes("bash")) {
    shellName = "bash";
    // macOS 下 Terminal.app 默认起登录 shell,bash 登录 shell 读的是 .bash_profile 而非 .bashrc
    rcPath = join(home, ".bash_profile");
  }

  let isSourced = false;
  if (existsSync(rcPath)) {
    try {
      const content = await readFile(rcPath, "utf8");
      // 只认真正会执行的行:注释掉的那一行不算已接入,否则界面显示"已接入"、启用按钮又被藏起来,没法重新启用
      isSourced = content.split("\n").some(isShellSourceLine);
    } catch {
      isSourced = false;
    }
  }

  return {
    shellName,
    loginShell,
    rcPath,
    rcLabel: rcPath.replace(home, "~"),
    isSourced,
  };
}

/**
 * 动用户的 shell 配置文件之前先存一份副本。
 * .zshrc 不是普通文件——它每开一个终端都会执行,写坏了的表现是"以后每次开终端都报错",
 * 而且用户很难联想到是这个扩展干的。一次 copyFile 的成本换这个保险很划算。
 * 返回备份路径(存不了就返回 undefined,不阻断主流程)。
 */
export async function backupShellRc(rcPath: string): Promise<string | undefined> {
  if (!existsSync(rcPath)) return undefined;
  try {
    await mkdirPrivate(BACKUPS_DIR);
    // 必须走 uniqueBackupPath:时间戳只精确到秒,同一秒内的第二次备份会直接
    // 覆盖掉第一份。"手动存一份 → 立刻恢复"正好落在同一秒里,
    // 结果是安全备份把用户刚存的那份原件盖掉,恢复出来的反而是坏内容
    const backupPath = uniqueBackupPath(BACKUPS_DIR, `${basename(rcPath)}-${fileTimestamp()}`);
    await copyFile(rcPath, backupPath);
    return backupPath;
  } catch {
    return undefined;
  }
}

/** 备份文件名形如 `.zshrc-20260906-143000`,同一秒内再备份会补 -2 / -3 */
function uniqueBackupPath(dir: string, filename: string): string {
  const first = join(dir, filename);
  if (!existsSync(first)) return first;
  for (let i = 2; i < 1000; i++) {
    const candidate = join(dir, `${filename}-${i}`);
    if (!existsSync(candidate)) return candidate;
  }
  return first;
}

export function getBackupsDir(): string {
  return BACKUPS_DIR;
}

export interface RcBackupItem {
  filename: string;
  filePath: string;
  /** 被备份的原文件名,如 .zshrc */
  originName: string;
  /** 形如 20260906-143000 */
  timestampStr: string;
  size: number;
  mtime: Date;
}

const RC_BACKUP_RE = /^(\..+)-(\d{8}-\d{6})(?:-\d+)?$/;

/**
 * 列出备份目录里的 shell 配置文件副本(默认目录里的那些)。
 * 用户手动备份到别处的副本这里看不到——那是用户自己保管的文件,扩展不去追踪。
 */
export async function listShellRcBackups(): Promise<RcBackupItem[]> {
  if (!existsSync(BACKUPS_DIR)) return [];
  try {
    const entries = await readdir(BACKUPS_DIR, { withFileTypes: true });
    const items: RcBackupItem[] = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const match = RC_BACKUP_RE.exec(entry.name);
      if (!match?.[1] || !match[2]) continue;
      const filePath = join(BACKUPS_DIR, entry.name);
      const fileStat = await stat(filePath);
      items.push({
        filename: entry.name,
        filePath,
        originName: match[1],
        timestampStr: match[2],
        size: fileStat.size,
        mtime: fileStat.mtime,
      });
    }
    return items.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  } catch {
    return [];
  }
}

export async function readShellRcBackup(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

export async function deleteShellRcBackup(filePath: string): Promise<void> {
  if (existsSync(filePath)) await unlink(filePath);
}

/**
 * 用户主动备份 shell 配置文件。
 * 跟 backupShellRc 的区别是**出错要抛出来**:自动备份只是顺手上的保险,
 * 失败了不该拖累主流程;而手动备份本身就是用户此刻唯一想做的事,
 * 悄悄失败等于给了一份不存在的安心。
 * targetDir 留空则存进扩展自己的备份目录。
 */
export async function backupShellRcTo(rcPath: string, targetDir?: string): Promise<string> {
  if (!existsSync(rcPath)) {
    throw new Error(`${rcPath} 不存在`);
  }
  const dir = targetDir?.trim() ? targetDir : BACKUPS_DIR;
  await mkdir(dir, { recursive: true });
  const backupPath = uniqueBackupPath(dir, `${basename(rcPath)}-${fileTimestamp()}`);
  await copyFile(rcPath, backupPath);
  return backupPath;
}

/**
 * 把某份备份写回 shell 配置文件。
 * 写回之前先把"现在的"再备份一份——否则这个恢复动作本身就成了不可逆操作。
 */
export async function restoreShellRcBackup(backupPath: string, rcPath: string): Promise<{ safetyBackupPath?: string }> {
  if (!existsSync(backupPath)) {
    throw new Error(`备份文件不存在: ${backupPath}`);
  }
  const safetyBackupPath = await backupShellRc(rcPath);
  const content = await readFile(backupPath, "utf8");
  await writeFileAtomic(rcPath, content);
  return { safetyBackupPath };
}

/**
 * 把 source 那一行追加到用户的 shell 配置文件末尾(仅追加,不改动已有任何内容)
 * 用一段带标记的注释包住,方便用户日后自己识别/手动删除
 */
/** 写进 rc 的标记注释。老用户的 rc 里是 "# Added by Env Butler"(改名前),移除时两种都认 */
const RC_MARKER = "# Added by Env Keeper";
const RC_MARKERS = new Set([RC_MARKER, "# Added by Env Butler"]);

export async function appendShellSourceLine(rcPath: string, sourceLine: string): Promise<{ backupPath?: string }> {
  const block = `${RC_MARKER}\n${sourceLine}\n`;
  const backupPath = await backupShellRc(rcPath);

  if (!existsSync(rcPath)) {
    const dir = dirname(rcPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFileAtomic(rcPath, block);
    return { backupPath };
  }

  const content = await readFile(rcPath, "utf8");
  const separator = content === "" || content.endsWith("\n") ? "\n" : "\n\n";
  await writeFileAtomic(rcPath, content + separator + block);
  return { backupPath };
}

export interface RemoveSourceLineResult {
  removed: boolean;
  backupPath?: string;
  /** 没删,但文件里有一行用户自己写的 source(比如包在 if … fi 里):不碰,让用户手动处理 */
  customLineFound?: boolean;
}

/** 数一行里开块/关块的关键字:if/while/until/for/case 开,fi/done/esac 关,只认语句开头的;花括号按个数 */
function countBlockKeywords(line: string): { opens: number; closes: number } {
  let opens = line.match(/\{/g)?.length ?? 0;
  let closes = line.match(/\}/g)?.length ?? 0;
  for (const stmt of line.split(/;|&&|\|\|/)) {
    const head = stmt.trim();
    if (/^(if|while|until|for|case)\b/.test(head)) opens += 1;
    if (/^(fi|done|esac)\b/.test(head)) closes += 1;
  }
  return { opens, closes };
}

/**
 * 从 shell 配置文件里移除 Env Keeper 写入的那一行(与 appendShellSourceLine 对称)。
 * **只删自己写的格式**(整行就是那句 source,老写法新写法都认),顺手删掉紧邻在它前面的标记注释(新的 "Added by Env Keeper"、改名前的 "Added by Env Butler" 都认);
 * 用户自己包在 `if … fi` 里的、或者只是提到这个路径的行一律不碰——按子串删会把 if 体删空,之后每开一个终端都报语法错。
 * 除了这一两行,文件里其他任何东西都不动:不压空行、不动换行符,写入时说好"只追加不动别的",删除也该对称
 */
export async function removeShellSourceLine(rcPath: string): Promise<RemoveSourceLineResult> {
  if (!existsSync(rcPath)) return { removed: false };

  const content = await readFile(rcPath, "utf8");
  const rawLines = content.split("\n");
  const kept: string[] = [];
  let removed = false;
  let customLineFound = false;

  // 粗略跟踪块结构:写在 if … fi / { … } / do … done 里面的那一行不算我们的,删了会把块删空、每开一个终端都报语法错。
  // 关键字按"语句开头"数,语句以 ; && || 分隔——单行的 `if …; then …; fi`(工具自动写进 rc 的常见写法)开和关在同一行,
  // 只看行首会把它算成永远没关上的块,后面所有行都被当成块内,我们自己写的那行也就删不掉了
  let depth = 0;
  for (const line of rawLines) {
    const { opens, closes } = countBlockKeywords(line.replace(/\r$/, ""));
    const insideBlock = depth > 0;
    if (!insideBlock && isEnvButlerSourceLine(line)) {
      removed = true;
      if (RC_MARKERS.has(kept[kept.length - 1]?.trim() ?? "")) kept.pop();
      depth = Math.max(0, depth + opens - closes);
      continue;
    }
    if (isShellSourceLine(line)) customLineFound = true;
    kept.push(line);
    depth = Math.max(0, depth + opens - closes);
  }

  if (!removed) return { removed: false, customLineFound };

  const backupPath = await backupShellRc(rcPath);
  await writeFileAtomic(rcPath, kept.join("\n"));
  return { removed: true, backupPath, customLineFound };
}

/**
 * 确保 ~/.env-keeper 及其子目录存在
 */
export async function ensureStorageDirs(): Promise<void> {
  if (!existsSync(BASE_DIR)) {
    await mkdirPrivate(BASE_DIR);
  }
  if (!existsSync(SNAPSHOTS_DIR)) {
    await mkdirPrivate(SNAPSHOTS_DIR);
  }
}

/**
 * 读取项目注册表
 */
export async function loadRegistry(): Promise<LoadResult<RegistryData>> {
  await ensureStorageDirs();
  if (!existsSync(REGISTRY_FILE)) {
    const empty = createEmptyRegistry();
    await writeFileAtomic(REGISTRY_FILE, formatRegistry(empty));
    return { data: empty };
  }

  let content: string;
  try {
    content = await readFile(REGISTRY_FILE, "utf8");
  } catch {
    // 读不到文件(权限等)不等于文件坏了,不隔离;但也绝不能当成"没配过"——那样用户重建一保存就把原文件盖了
    return { data: createEmptyRegistry(), problem: unreadableProblem(REGISTRY_FILE, CURRENT_REGISTRY_VERSION) };
  }

  try {
    return { data: parseRegistry(content) };
  } catch (e) {
    // 内容有问题:把原文件挪到一边保住数据,再把情况报给界面
    return {
      data: createEmptyRegistry(),
      problem: await quarantineConfigFile(REGISTRY_FILE, e, CURRENT_REGISTRY_VERSION),
    };
  }
}

/**
 * 保存项目注册表
 */
export async function saveRegistry(registry: RegistryData): Promise<ConfigSnapshotResult> {
  await ensureStorageDirs();
  await assertConfigWritable(REGISTRY_FILE, parseRegistry);
  const next = formatRegistry(registry);
  const snapshot = await snapshotConfigBeforeWrite("registry", REGISTRY_FILE, next);
  await writeFileAtomic(REGISTRY_FILE, next);
  return snapshot;
}

/**
 * 读取全局 Shell 配置
 */
export async function loadShellConfig(): Promise<LoadResult<ShellConfig>> {
  await ensureStorageDirs();
  if (!existsSync(SHELL_CONFIG_FILE)) {
    const empty = createEmptyShellConfig();
    await writeFileAtomic(SHELL_CONFIG_FILE, formatShellConfig(empty));
    return { data: empty };
  }

  let content: string;
  try {
    content = await readFile(SHELL_CONFIG_FILE, "utf8");
  } catch {
    return {
      data: createEmptyShellConfig(),
      problem: unreadableProblem(SHELL_CONFIG_FILE, CURRENT_SHELL_CONFIG_VERSION),
    };
  }

  try {
    return { data: parseShellConfig(content) };
  } catch (e) {
    return {
      data: createEmptyShellConfig(),
      problem: await quarantineConfigFile(SHELL_CONFIG_FILE, e, CURRENT_SHELL_CONFIG_VERSION),
    };
  }
}

/**
 * 磁盘上那份 shell.sh 的语法是否正常(文件不存在算正常)。
 * 用来区分"这次改动把脚本改坏了"和"本来就坏着":后者不该拦住所有片段操作——
 * 用户已经有一个坏片段时,连关掉别的片段都做不了,那是把人锁在门外
 */
async function currentScriptIsValid(shellKind: ValidatableShell | undefined): Promise<boolean> {
  if (!existsSync(SHELL_SCRIPT_FILE)) return true;
  try {
    return (await validateShellSyntax(await readFile(SHELL_SCRIPT_FILE, "utf8"), shellKind)).valid;
  } catch {
    return true;
  }
}

/**
 * 保存 Shell 配置并同步生成 shell.sh(0600:被 source 读取不需要执行位,里面有明文密钥)
 *
 * 写盘前先让登录 shell 检查一遍整份脚本的语法:片段名里的换行 core 那边已经清洗过,
 * 但两个各自合法的片段拼在一起也可能不合法(比如一个少了 `fi`)。坏脚本会被每个新开的终端执行,
 * 所以这一次会把它改坏就不保存——而且要在写 shell.json 之前就查,否则会出现 json 更新了、sh 没更新
 */
export async function saveShellConfig(config: ShellConfig): Promise<ConfigSnapshotResult> {
  await ensureStorageDirs();
  await assertConfigWritable(SHELL_CONFIG_FILE, parseShellConfig);

  const scriptContent = generateShellScript(config.snippets);
  const { shellName } = await detectShellRc();
  const shellKind = shellName === "zsh" || shellName === "bash" ? shellName : undefined;
  const syntax = await validateShellSyntax(scriptContent, shellKind);
  if (!syntax.valid && (await currentScriptIsValid(shellKind))) {
    throw new Error(`${t("st.syntaxErrorHint", { shell: shellKind ?? "" })}\n${syntax.error ?? ""}`.trim());
  }

  const next = formatShellConfig(config);
  const snapshot = await snapshotConfigBeforeWrite("shell", SHELL_CONFIG_FILE, next);
  await writeFileAtomic(SHELL_CONFIG_FILE, next);
  await writeFileAtomic(SHELL_SCRIPT_FILE, scriptContent, PRIVATE_FILE_MODE);
  return snapshot;
}

/**
 * 读取项目轨的方案。跟 shell.json 同一套路:损坏就隔离、绝不静默当空——
 * 方案里可能装着用户唯一一份某套密钥,被空文件覆盖掉就真的没了
 */
export async function loadPresets(): Promise<LoadResult<PresetsFile>> {
  await ensureStorageDirs();
  if (!existsSync(PRESETS_FILE)) {
    // 不像 registry / shell 那样一上来就写空文件:大多数用户可能永远不用方案,
    // 没必要在数据目录里凭空多一个文件
    return { data: createEmptyPresetsFile() };
  }

  let content: string;
  try {
    content = await readFile(PRESETS_FILE, "utf8");
  } catch {
    return { data: createEmptyPresetsFile(), problem: unreadableProblem(PRESETS_FILE, CURRENT_PRESETS_VERSION) };
  }

  try {
    return { data: parsePresetsFile(content) };
  } catch (e) {
    return {
      data: createEmptyPresetsFile(),
      problem: await quarantineConfigFile(PRESETS_FILE, e, CURRENT_PRESETS_VERSION),
    };
  }
}

export async function savePresets(file: PresetsFile): Promise<ConfigSnapshotResult> {
  await ensureStorageDirs();
  await assertConfigWritable(PRESETS_FILE, parsePresetsFile);
  const next = formatPresetsFile(file);
  const snapshot = await snapshotConfigBeforeWrite("presets", PRESETS_FILE, next);
  await writeFileAtomic(PRESETS_FILE, next);
  return snapshot;
}

/**
 * 读取已生成的 ~/.env-keeper/shell.sh 原文,用于给用户预览"实际生成了什么、按什么顺序"。
 * 界面上片段是按类型分组显示的,和文件里的真实先后并不一致,所以需要这个出口。
 */
export async function readShellScript(): Promise<string> {
  if (!existsSync(SHELL_SCRIPT_FILE)) return "";
  try {
    return await readFile(SHELL_SCRIPT_FILE, "utf8");
  } catch {
    return "";
  }
}

/**
 * 扫描项目根目录下的环境文件。
 * 用白名单(core 的 isEnvFilename)而不是"以 .env 开头":`.envrc` 是 direnv 的 shell 脚本,
 * 设计上绝不能碰,此前却会被列进下拉框里可编辑可覆写;`.env_副本` / `.environment` 也都不是环境文件
 */
export async function detectProjectEnvFiles(projectPath: string): Promise<string[]> {
  if (!existsSync(projectPath)) return [];
  try {
    const entries = await readdir(projectPath, { withFileTypes: true });
    const envFiles: string[] = [];

    for (const entry of entries) {
      if (!isEnvFilename(entry.name)) continue;
      if (entry.isFile()) {
        envFiles.push(entry.name);
        continue;
      }
      // 软链解开后是普通文件就算一个:密钥集中放在别处、各项目用链接指过去是常见做法。
      // 写入本来就会先解析真实路径(见 writeFileAtomic),不会把链接换成普通文件,
      // 所以"跟着链接跑到项目外"这件事不存在——链接指向哪是用户自己定的
      if (entry.isSymbolicLink() && (await isRegularFile(join(projectPath, entry.name)))) {
        envFiles.push(entry.name);
      }
      // 名字合法但既不是文件、也不是指向文件的链接(典型:叫 .env 的文件夹):不列出来,
      // 列了就是点一下就报 EISDIR
    }

    // `.env` 排最前,方便直接新建;但它已经存在(哪怕是个文件夹)就不补这个占位
    if (!envFiles.includes(".env") && !entries.some((e) => e.name === ".env")) {
      envFiles.unshift(".env");
    }
    return envFiles;
  } catch {
    return [".env"];
  }
}

/** 路径解开软链后是不是普通文件(断链、指向目录、没权限都算否) */
async function isRegularFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

/**
 * 在项目目录下新建一个空的环境文件（如 .env.development）
 * 若文件已存在则不覆盖，返回 created: false
 */
export async function createEnvFile(
  projectPath: string,
  filename: string,
): Promise<{ created: boolean; notAFile?: boolean }> {
  const filePath = join(projectPath, filename);
  if (existsSync(filePath)) {
    // 同名的是文件夹(或断链)时,只说"已存在"会把用户引到"改个名字"上去,实际得先处理那个东西
    return { created: false, notAFile: !(await isRegularFile(filePath)) };
  }
  if (!existsSync(projectPath)) {
    await mkdir(projectPath, { recursive: true });
  }
  await writeFileAtomic(filePath, "");
  return { created: true };
}

/**
 * 检查项目目录下是否存在 .envrc (direnv)
 */
export async function checkEnvrcExists(projectPath: string): Promise<boolean> {
  return existsSync(join(projectPath, ".envrc"));
}

/**
 * 读取特定环境文件内容及指纹
 */
export async function readEnvFile(
  filePath: string,
  options: { withFingerprint?: boolean } = {},
): Promise<{ content: string; fingerprint: string; exists: boolean }> {
  // 指纹是给保存时的冲突检测用的;全局搜索只是读内容,没必要给每个文件都算一遍哈希
  const { withFingerprint = true } = options;
  if (!existsSync(filePath)) {
    return { content: "", fingerprint: withFingerprint ? computeFingerprint("") : "", exists: false };
  }
  // 存在但不是普通文件(叫 .env 的文件夹、断链):如实说清楚,
  // 否则用户看到的是 "EISDIR: illegal operation on a directory, read" 这种系统错误
  if (!(await isRegularFile(filePath))) {
    throw new Error(t("common.notAFile", { file: basename(filePath) }));
  }
  const content = await readFile(filePath, "utf8");
  return {
    content,
    fingerprint: withFingerprint ? computeFingerprint(content) : "",
    exists: true,
  };
}

/** 目录名只允许安全字符;老项目的 id 是路径的 base64,可能带 `/` */
function safeDirName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "_");
}

/** 快照目录的寻址用的是项目 id 而不是项目名 */
export type SnapshotProjectRef = Pick<ProjectMeta, "id" | "name">;

/**
 * 某个项目的快照目录。按 **id** 寻址:此前按项目名,两个都叫 `web` 的项目历史会混在一起,
 * 回滚时可能把另一个项目的内容写进来。
 * 老目录(按名字)第一次被访问时改名成新目录,历史不丢;两个同名项目共用过的老目录归先访问的那个
 */
async function projectSnapshotDir(project: SnapshotProjectRef): Promise<string> {
  const byId = join(SNAPSHOTS_DIR, safeDirName(project.id));
  if (existsSync(byId)) return byId;
  const byName = join(SNAPSHOTS_DIR, safeDirName(project.name));
  if (existsSync(byName)) {
    try {
      await rename(byName, byId);
    } catch {
      // 改不了名就继续用老目录,别让快照功能因此失效
      return byName;
    }
  }
  return byId;
}

export interface WriteEnvResult {
  success: boolean;
  conflict?: boolean;
  snapshotPath?: string;
  /** 本次写入后,该项目累计的快照份数(原文件不存在、没打快照时为 undefined) */
  snapshotCount?: number;
  /** 快照份数是否已达软上限。达到后只提示,绝不自动清理(设计决议 Q12) */
  snapshotLimitExceeded?: boolean;
  /** 软上限值,交给界面组织提示文案,避免界面层再 import core 常量 */
  snapshotLimit?: number;
  newFingerprint?: string;
  error?: string;
}

/**
 * 写入环境文件（包含冲突检测 + 自动快照备份）
 */
export async function writeEnvFileWithSnapshot(options: {
  project: SnapshotProjectRef;
  envFilePath: string;
  newContent: string;
  expectedFingerprint?: string;
  force?: boolean;
}): Promise<WriteEnvResult> {
  const { project, envFilePath, newContent, expectedFingerprint, force = false } = options;

  await ensureStorageDirs();

  // 1. 冲突检测：检查现有文件是否被外部修改
  if (existsSync(envFilePath) && expectedFingerprint && !force) {
    const currentContent = await readFile(envFilePath, "utf8");
    const currentFingerprint = computeFingerprint(currentContent);
    if (currentFingerprint !== expectedFingerprint) {
      return { success: false, conflict: true };
    }
  }

  // 2. 自动生成快照备份（若原文件存在）
  let snapshotPath: string | undefined;
  let snapshotCount: number | undefined;
  let snapshotLimitExceeded = false;
  if (existsSync(envFilePath)) {
    const oldContent = await readFile(envFilePath, "utf8");
    const snapshotDir = await projectSnapshotDir(project);
    if (!existsSync(snapshotDir)) {
      await mkdirPrivate(snapshotDir);
    }

    const snapshotFilename = generateSnapshotFilename(basename(envFilePath));
    snapshotPath = await uniqueSnapshotPath(snapshotDir, snapshotFilename);
    // 快照是新建的文件,不会自动继承源文件权限:用户把 .env 设成 600 了,
    // 旁边一圈 644 的历史副本(里面连早就删掉的旧密钥都有)等于白设
    await writeFileAtomic(snapshotPath, oldContent, await modeOf(envFilePath));

    // 打完快照后数一下这个项目累计了多少份。超过软上限只是提示用户按需清理,
    // 不自动删除——快照是安全网,自动清理与这个定位相冲突(设计决议 Q12)
    try {
      const entries = await readdir(snapshotDir, { withFileTypes: true });
      snapshotCount = entries.filter((e) => e.isFile() && parseSnapshotFilename(e.name) !== null).length;
      snapshotLimitExceeded = checkSnapshotSoftLimit(snapshotCount).exceeded;
    } catch {
      // 数不出来不影响本次写入,静默跳过提示
    }
  }

  // 3. 写入新文件内容
  const dir = dirname(envFilePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFileAtomic(envFilePath, newContent);
  const newFingerprint = computeFingerprint(newContent);

  return {
    success: true,
    snapshotPath,
    snapshotCount,
    snapshotLimitExceeded,
    snapshotLimit: SNAPSHOT_SOFT_LIMIT,
    newFingerprint,
  };
}

export interface SnapshotItem {
  filename: string;
  filePath: string;
  timestampStr: string;
  envFilename: string;
  size: number;
  mtime: Date;
}

/**
 * 获取指定项目的所有快照
 */
export async function listSnapshots(project: SnapshotProjectRef, targetEnvFilename?: string): Promise<SnapshotItem[]> {
  const snapshotDir = await projectSnapshotDir(project);
  if (!existsSync(snapshotDir)) return [];

  try {
    const entries = await readdir(snapshotDir, { withFileTypes: true });
    const items: SnapshotItem[] = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const parsed = parseSnapshotFilename(entry.name);
      if (!parsed) continue;

      if (targetEnvFilename && parsed.envFilename !== targetEnvFilename) {
        continue;
      }

      const filePath = join(snapshotDir, entry.name);
      const fileStat = await stat(filePath);
      items.push({
        filename: entry.name,
        filePath,
        timestampStr: parsed.timestampStr,
        envFilename: parsed.envFilename,
        size: fileStat.size,
        mtime: fileStat.mtime,
      });
    }

    // 按最新时间倒序排列
    return items.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  } catch {
    return [];
  }
}

/**
 * 从指定快照回滚到目标环境文件（回滚前自动给当前文件打一份安全快照）
 */
export async function restoreSnapshot(options: {
  project: SnapshotProjectRef;
  snapshotFilePath: string;
  targetEnvFilePath: string;
}): Promise<WriteEnvResult> {
  const { project, snapshotFilePath, targetEnvFilePath } = options;
  if (!existsSync(snapshotFilePath)) {
    return { success: false, error: "快照文件不存在" };
  }
  const snapshotContent = await readFile(snapshotFilePath, "utf8");
  return writeEnvFileWithSnapshot({
    project,
    envFilePath: targetEnvFilePath,
    newContent: snapshotContent,
    force: true, // 回滚为明确用户操作，强制覆盖
  });
}

/**
 * 删除单个快照
 */
export async function deleteSnapshot(filePath: string): Promise<void> {
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
}
