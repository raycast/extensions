/**
 * portreaper-cli 的自动获取。
 *
 * # 为什么必须自动下载
 *
 * Raycast Store 对依赖外部二进制的扩展有明确规定：允许「从可信源下载并校验完整性」，
 * 但**不允许**把安装工作丢给用户（"Avoid asking users to perform additional downloads
 * and try to automate as much as possible from the extension"）。所以扩展不能只是
 * 提示「请先 cargo install」，必须自己把二进制取回来。
 *
 * # 为什么不把二进制打进扩展包
 *
 * 同一份规则反对 "heavy binary bundling"：三个平台的二进制会让每个用户的扩展下载
 * 体积翻好几倍，而其中两份他永远用不到。
 *
 * # 完整性校验
 *
 * 先取 `portreaper-cli-SHA256SUMS`（由 release 流水线在 publish 阶段汇总三条构建腿
 * 的产物生成），再据它核对下载到的二进制。**校验在内存里、落盘之前完成**：不匹配的
 * 字节从头到尾没碰过磁盘，谈不上「删掉它」——比「先写再删」强一档，别把顺序改回去
 * （文档一度描述的正是那套更弱的机制，评审发现）。
 *
 * 两次取回都走 `releases/latest/download/`，中间若恰好发版会读到不同版本的校验和与
 * 二进制。那是**竞态**不是攻击，故不匹配时整体重试一次；两次都不匹配才当安全事件报。
 */

import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** 稳定资产名 —— 与 `.github/workflows/release.yml` 的 matrix.cli_asset 一一对应。
 *  改名即 404，由 `scripts/check-release-assets.mjs` 守住两侧一致。 */
export const CLI_ASSETS = {
  "darwin-arm64": "portreaper-cli-macos-arm64",
  "darwin-x64": "portreaper-cli-macos-x64",
  "win32-x64": "portreaper-cli-windows-x64.exe",
} as const;

export const CHECKSUM_ASSET = "portreaper-cli-SHA256SUMS";

const RELEASE_BASE = "https://github.com/fanhefeng/portreaper/releases/latest/download";

export class UnsupportedPlatformError extends Error {
  constructor(key: string) {
    super(`No portreaper-cli build for ${key}`);
    this.name = "UnsupportedPlatformError";
  }
}

export class ChecksumMismatchError extends Error {
  constructor(
    readonly expected: string,
    readonly actual: string,
  ) {
    super("Downloaded binary failed its checksum — refusing to run it.");
    this.name = "ChecksumMismatchError";
  }
}

/**
 * 取不回文件 —— 断网、DNS 失败、超时、代理挡掉、release 资产 404 都归这里。
 *
 * 存在的理由是**用户看到什么**：`fetch` 在断网时抛的是 `TypeError("fetch failed")`，
 * 超时抛 `DOMException("The operation was aborted due to timeout")`。这两句原样冒泡
 * 到 UI，就成了一个没有任何出口的错误页 —— 而这恰恰是最该给指引的场景（首次使用、
 * 还没有引擎、多半正在飞机上或公司代理后面）。归一成本类型后，UI 才能把它导向
 * 引导页：列出找过的位置、给 Retry、给自建命令。
 */
export class DownloadFailedError extends Error {
  constructor(
    readonly url: string,
    readonly detail: string,
    options?: ErrorOptions,
  ) {
    // 保留 cause：UI 只展示 detail，原始的 TypeError / DOMException 只剩这一条线索
    super(`Could not download ${url}: ${detail}`, options);
    this.name = "DownloadFailedError";
  }
}

/** 当前平台对应的资产名。不支持的平台响亮失败，绝不猜一个名字去下载。 */
export function assetNameFor(platform: string, arch: string): string {
  const key = `${platform}-${arch}`;
  const name = (CLI_ASSETS as Record<string, string | undefined>)[key];
  if (!name) throw new UnsupportedPlatformError(key);
  return name;
}

/** 从 `sha256sum` 格式的清单里取出某个文件的期望哈希。 */
export function parseChecksums(text: string, assetName: string): string | undefined {
  for (const line of text.split("\n")) {
    // 格式：`<64 位十六进制>  <文件名>`（sha256sum 用两个空格）
    const m = line.trim().match(/^([0-9a-f]{64})\s+\*?(.+)$/i);
    if (m && m[2] === assetName) return m[1].toLowerCase();
  }
  return undefined;
}

export function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** 下载超时。与 cli.ts 里 execFileAsync 的超时同源：任何外部调用都必须有上界，
 *  否则一个挂起的连接会让扩展永远停在「Setting up…」，且没有任何可操作的出口。 */
const FETCH_TIMEOUT_MS = 60_000;

async function fetchBuffer(url: string): Promise<Buffer> {
  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    // fetch 只在**网络层**失败时抛（断网、DNS、TLS、超时）；HTTP 错误码不走这里。
    // cause 常常比 message 有信息量（"fetch failed" vs "getaddrinfo ENOTFOUND"），
    // 优先取它。
    const detail =
      e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : String(e);
    throw new DownloadFailedError(url, detail, { cause: e });
  }
  if (!res.ok) {
    // 404/5xx 对用户是同一回事：引擎没取回来。归入同一类型走同一个引导页。
    throw new DownloadFailedError(url, `HTTP ${res.status}`);
  }
  try {
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    // 连接中途断掉：响应头已到、body 没读完。
    throw new DownloadFailedError(url, "the connection dropped mid-download", { cause: e });
  }
}

/** 已下载副本的落点（Raycast 给扩展的可写目录）。 */
export function installedCliPath(supportPath: string): string {
  const exe = process.platform === "win32" ? "portreaper-cli.exe" : "portreaper-cli";
  return join(supportPath, "bin", exe);
}

/**
 * 下载最新 release 的 CLI 到扩展的 supportPath，校验 sha256 后置为可执行。
 * 返回可执行文件路径。
 *
 * 任何一步失败都不会留下半个文件：校验不通过时二进制**根本没落过盘**，
 * 而落盘本身是「临时文件 → 置执行位 → rename」的原子三步。
 */
export async function installCli(
  supportPath: string,
  onProgress?: (step: string) => void,
): Promise<string> {
  const assetName = assetNameFor(process.platform, process.arch);

  /** 取一遍「校验和 + 二进制」并核对。两者都解析自 `latest`，必须成对取用。 */
  async function fetchAndVerify(): Promise<{ bin: Buffer; expected: string; actual: string }> {
    onProgress?.("Fetching checksums…");
    const sumsText = (await fetchBuffer(`${RELEASE_BASE}/${CHECKSUM_ASSET}`)).toString("utf8");
    const expected = parseChecksums(sumsText, assetName);
    if (!expected) {
      // 清单里没有这个资产 —— 可能是 release 不完整，也可能是资产改了名。
      // 无论哪种，都不能跳过校验继续装。
      throw new Error(`${CHECKSUM_ASSET} has no entry for ${assetName}`);
    }
    onProgress?.("Downloading portreaper-cli…");
    const bin = await fetchBuffer(`${RELEASE_BASE}/${assetName}`);
    onProgress?.("Verifying…");
    return { bin, expected, actual: sha256(bin) };
  }

  // 不匹配先整体重试一次：两次取回之间恰好发了新版时，拿到的是「旧校验和 + 新二进制」
  // ——那是发版窗口内的竞态，而 UI 会把 ChecksumMismatchError 渲染成「可能有代理在
  // 改写下载」这类安全事件文案，等于让用户去查一个不存在的问题（评审发现）。
  // 重试后仍不匹配才是真的该报警。
  let { bin, expected, actual } = await fetchAndVerify();
  if (actual !== expected) {
    ({ bin, expected, actual } = await fetchAndVerify());
  }
  if (actual !== expected) {
    throw new ChecksumMismatchError(expected, actual);
  }

  // 原子落盘：写同目录临时文件 → 置执行位 → rename。直接写 dest 的话，中途失败
  // （磁盘满、进程被杀）会留下一个半截却已可执行的文件，而它对下一次启动来说
  // 「存在即视为已安装」—— 校验虽拦得住，但那是白跑一趟下载（评审发现）。
  // pid 不足以防撞名（同进程重试 / pid 复用），叠一段 UUID 保证临时名唯一
  const dest = installedCliPath(supportPath);
  const tmp = `${dest}.${process.pid}.${randomUUID()}.tmp`;
  await mkdir(join(supportPath, "bin"), { recursive: true });
  try {
    await writeFile(tmp, bin);
    await chmod(tmp, 0o755);
    await rename(tmp, dest);
  } catch (e) {
    await rm(tmp, { force: true });
    throw e;
  }
  return dest;
}

let inFlight: Promise<string> | null = null;

/**
 * 同一时刻只跑一次 installCli。调用方 load() 可重入（连点 Refresh、终止后自动刷新），
 * 两轮同时进入恢复分支时若各下各的，后一轮会覆盖前一轮刚装好的副本，前一轮随即在
 * verify/scan 里撞上不一致的文件（评审发现）。共用一个 Promise 后只有一次下载、
 * 一次 rename，谁先到谁的进度回调生效，其余调用只等结果。
 */
export function installCliOnce(
  supportPath: string,
  onProgress?: (step: string) => void,
): Promise<string> {
  if (!inFlight) {
    inFlight = installCli(supportPath, onProgress).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
