import {
  Alert,
  confirmAlert,
  getPreferenceValues,
  LocalStorage,
} from "@raycast/api";
import {
  execFile as execFileCallback,
  type ExecFileException,
} from "node:child_process";
import {
  copyFile,
  cp,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, isAbsolute } from "node:path";
import { arch } from "node:process";
import { promisify } from "node:util";
import { parse as parseToml } from "smol-toml";

const execFile = promisify(execFileCallback);

export const USER_AGENT = "frp-client-manager (raycast extension)";
const UPDATE_CACHE_KEY = "frp-update-check";
const UPDATE_CACHE_TTL_MS = 60 * 60 * 1000;

const FRPC_ARCH = arch === "arm64" ? "darwin_arm64" : "darwin_amd64";

export interface ExtensionPreferences {
  frpDir: string;
  launchdLabel?: string;
  adminAddr: string;
  adminUser: string;
  adminPassword?: string;
}

export interface ServiceStatus {
  running: boolean;
  state: string;
  pid?: number;
  uptimeLabel?: string;
  managed: boolean;
}

export interface ProxyConfig {
  name: string;
  type: string;
  localIP: string;
  localPort: number;
  remotePort: number;
}

export interface FrpcConfig {
  serverAddr: string;
  serverPort: number;
  proxies: ProxyConfig[];
  logTo?: string;
}

export interface ProxyRuntime {
  name: string;
  type: string;
  status: string;
  err: string;
  local_addr?: string;
  remote_addr?: string;
}

export type AdminStatusMap = Record<string, ProxyRuntime[]>;

export interface UpdateCheckResult {
  hasUpdate: boolean;
  localVersion: string;
  latestVersion?: string;
  downloadUrl?: string;
  checkedAt: number;
}

export interface UpgradeResult {
  ok: boolean;
  message: string;
}

export interface StatusDashboard {
  service: ServiceStatus;
  version: string | undefined;
  binaryPath: string | undefined;
  configPath: string;
  logPath: string;
  frpDir: string;
  serverAddress: string;
  admin: { reachable: boolean; online: number; total: number };
  update: UpdateCheckResult;
}

export interface ProxyViewItem {
  config: ProxyConfig;
  serverAddr: string;
  remoteAddress: string;
  localAddress: string;
  runtime?: ProxyRuntime;
  statusUnavailable: boolean;
}

export interface LogLine {
  raw: string;
  time?: string;
  level?: "I" | "W" | "E";
  message: string;
}

export function getPrefs(): ExtensionPreferences {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  return {
    frpDir: expandTilde(prefs.frpDir || "~/frp"),
    launchdLabel: prefs.launchdLabel?.trim() || undefined,
    adminAddr: prefs.adminAddr || "127.0.0.1:7400",
    adminUser: prefs.adminUser || "admin",
    adminPassword: prefs.adminPassword ?? "",
  };
}

export function expandTilde(path: string): string {
  if (path === "~") {
    return homedir();
  }
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  return path;
}

export function frpDirExists(): boolean {
  return existsSync(getPrefs().frpDir);
}

export function getConfigPath(frpDir: string): string {
  return join(frpDir, "frpc.toml");
}

export function getPlistPath(label: string): string {
  return join(homedir(), "Library/LaunchAgents", `${label}.plist`);
}

export function hasLaunchdService(): boolean {
  const label = getPrefs().launchdLabel;
  return Boolean(label) && existsSync(getPlistPath(label));
}

export async function resolveLogPath(frpDir: string): Promise<string> {
  const fallback = join(frpDir, "frpc.log");
  try {
    const config = await parseFrpcToml(getConfigPath(frpDir));
    if (config.logTo && config.logTo !== "console") {
      return isAbsolute(config.logTo)
        ? config.logTo
        : join(frpDir, config.logTo);
    }
  } catch {
    // fall through to default
  }
  return fallback;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const exec = error as ExecFileException & {
      stderr?: string;
      stdout?: string;
    };
    const detail = (exec.stderr || exec.stdout || error.message).trim();
    return detail || error.message;
  }
  return String(error);
}

export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) {
    return 0;
  }
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) {
      return pa[i] - pb[i];
    }
  }
  return 0;
}

export async function findFrpcBinary(
  frpDir: string,
): Promise<string | undefined> {
  let names: string[];
  try {
    names = await readdir(frpDir);
  } catch {
    return undefined;
  }

  const dirRe = new RegExp(`^frp_(\\d+\\.\\d+\\.\\d+)_${FRPC_ARCH}$`);
  const candidates: { version: string; path: string }[] = [];
  for (const name of names) {
    const match = name.match(dirRe);
    if (!match) {
      continue;
    }
    const binaryPath = join(frpDir, name, "frpc");
    if (existsSync(binaryPath)) {
      candidates.push({ version: match[1], path: binaryPath });
    }
  }

  if (candidates.length === 0) {
    return undefined;
  }

  candidates.sort((left, right) => compareSemver(right.version, left.version));
  return candidates[0].path;
}

export async function getFrpcVersion(
  binaryPath: string,
): Promise<string | undefined> {
  try {
    const { stdout } = await execFile(binaryPath, ["-v"], { timeout: 3000 });
    const parsed = parseSemver(stdout);
    return parsed ? parsed.join(".") : stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function getServiceStatus(): Promise<ServiceStatus> {
  const label = getPrefs().launchdLabel;
  if (label) {
    try {
      const { stdout } = await execFile(
        "/bin/launchctl",
        ["print", launchdTarget(label)],
        { timeout: 5000 },
      );
      const state = stdout.match(/^\s*state\s*=\s*(\S+)/m)?.[1] ?? "unknown";
      const pidMatch = stdout.match(/^\s*pid\s*=\s*(\d+)/m);
      const pid = pidMatch ? Number(pidMatch[1]) : undefined;
      const running = state === "running";
      const uptimeLabel = running && pid ? await processUptime(pid) : undefined;
      return { running, state, pid, uptimeLabel, managed: true };
    } catch {
      // not loaded: fall through to pgrep so a manually started frpc still shows
    }
  }
  return pgrepStatus();
}

export async function startService(): Promise<void> {
  const label = requireLabel();
  await execFile(
    "/bin/launchctl",
    ["bootstrap", launchdDomain(), getPlistPath(label)],
    { timeout: 8000 },
  );
}

export async function stopService(): Promise<void> {
  await execFile("/bin/launchctl", ["bootout", launchdTarget(requireLabel())], {
    timeout: 8000,
  });
}

export async function restartService(): Promise<void> {
  await execFile(
    "/bin/launchctl",
    ["kickstart", "-k", launchdTarget(requireLabel())],
    { timeout: 8000 },
  );
}

export async function parseFrpcToml(configPath: string): Promise<FrpcConfig> {
  const text = await readFile(configPath, "utf8");
  const parsed: unknown = parseToml(text);
  if (!isRecord(parsed)) {
    throw new Error("frpc.toml did not parse to a table");
  }

  const serverAddr =
    typeof parsed.serverAddr === "string" ? parsed.serverAddr : "";
  const serverPort =
    typeof parsed.serverPort === "number" ? parsed.serverPort : 7000;
  const logTo = readLogTo(parsed.log);
  const proxies: ProxyConfig[] = [];
  if (Array.isArray(parsed.proxies)) {
    for (const entry of parsed.proxies) {
      const proxy = toProxyConfig(entry);
      if (proxy) {
        proxies.push(proxy);
      }
    }
  }

  return { serverAddr, serverPort, proxies, logTo };
}

export async function fetchAdminStatus(): Promise<AdminStatusMap | undefined> {
  try {
    const response = await adminFetch("/api/status");
    if (!response.ok) {
      return undefined;
    }
    return parseAdminStatus(await response.json());
  } catch {
    return undefined;
  }
}

export async function fetchAdminConfig(): Promise<string | undefined> {
  try {
    const response = await adminFetch("/api/config");
    if (!response.ok) {
      return undefined;
    }
    return await response.text();
  } catch {
    return undefined;
  }
}

export async function reloadConfig(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const response = await adminFetch("/api/reload", { method: "POST" });
    const body = await response.text();
    if (!response.ok) {
      return { ok: false, message: body || `HTTP ${response.status}` };
    }
    return { ok: true, message: body || "reloaded" };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function verifyConfig(
  binaryPath: string,
  configPath: string,
): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execFile(
      binaryPath,
      ["verify", "-c", configPath],
      { timeout: 8000 },
    );
    return { ok: true, output: `${stdout}${stderr}`.trim() };
  } catch (error) {
    return { ok: false, output: errorMessage(error) };
  }
}

export async function readLogLines(
  logPath: string,
  maxLines = 300,
): Promise<LogLine[]> {
  try {
    const text = await readFile(logPath, "utf8");
    const rawLines = text.split(/\r?\n/);
    if (rawLines[rawLines.length - 1] === "") {
      rawLines.pop();
    }
    return rawLines.slice(-maxLines).map(parseLogLine);
  } catch (error) {
    if (isErrno(error) && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export function matchesLogFilter(
  line: LogLine,
  filter: "all" | "error" | "warning" | "info",
): boolean {
  if (filter === "all") {
    return true;
  }
  const haystack = line.raw.toLowerCase();
  if (filter === "error") {
    return line.level === "E" || haystack.includes("error");
  }
  if (filter === "warning") {
    return line.level === "W" || haystack.includes("warn");
  }
  return line.level === "I" || haystack.includes("info");
}

export function flattenAdminStatus(
  status: AdminStatusMap | undefined,
): ProxyRuntime[] {
  if (!status) {
    return [];
  }
  return Object.values(status).flat();
}

export function countOnline(status: AdminStatusMap | undefined): {
  online: number;
  total: number;
} {
  const proxies = flattenAdminStatus(status);
  return {
    total: proxies.length,
    online: proxies.filter((proxy) => proxy.status === "running").length,
  };
}

export async function checkForUpdates(
  localVersion: string,
  force = false,
): Promise<UpdateCheckResult> {
  if (!force) {
    const cached = await readUpdateCache();
    if (cached && Date.now() - cached.checkedAt < UPDATE_CACHE_TTL_MS) {
      return { ...cached, localVersion };
    }
  }

  const empty: UpdateCheckResult = {
    hasUpdate: false,
    localVersion,
    checkedAt: Date.now(),
  };
  if (!localVersion) {
    return empty;
  }

  try {
    const response = await fetch(
      "https://api.github.com/repos/fatedier/frp/releases/latest",
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/vnd.github+json",
        },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) {
      return empty;
    }
    const payload: unknown = await response.json();
    if (!isGithubRelease(payload)) {
      return empty;
    }

    const latestVersion = payload.tag_name.replace(/^v/i, "");
    const assetName = `frp_${latestVersion}_${FRPC_ARCH}.tar.gz`;
    const asset = payload.assets.find((item) => item.name === assetName);
    const hasUpdate = compareSemver(latestVersion, localVersion) > 0;
    const result: UpdateCheckResult = {
      hasUpdate,
      localVersion,
      latestVersion,
      downloadUrl: hasUpdate ? asset?.browser_download_url : undefined,
      checkedAt: Date.now(),
    };
    await LocalStorage.setItem(UPDATE_CACHE_KEY, JSON.stringify(result));
    return result;
  } catch {
    return empty;
  }
}

export async function upgradeFrpc(
  downloadUrl: string,
  version: string,
): Promise<UpgradeResult> {
  const prefs = getPrefs();
  const destDir = join(prefs.frpDir, `frp_${version}_${FRPC_ARCH}`);
  const newBinary = join(destDir, "frpc");
  const label = prefs.launchdLabel;
  const plistPath = label ? getPlistPath(label) : undefined;
  const bakPath = plistPath ? `${plistPath}.bak` : undefined;
  const tmpDir = await mkdtemp(join(tmpdir(), "frpc-upgrade-"));

  try {
    const tarPath = join(tmpDir, `frp_${version}_${FRPC_ARCH}.tar.gz`);
    const response = await fetch(downloadUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) {
      throw new Error(`download failed: HTTP ${response.status}`);
    }
    await writeFile(tarPath, Buffer.from(await response.arrayBuffer()));
    await execFile("/usr/bin/tar", ["-xzf", tarPath, "-C", tmpDir], {
      timeout: 60_000,
    });

    const extracted = join(tmpDir, `frp_${version}_${FRPC_ARCH}`);
    if (!existsSync(join(extracted, "frpc"))) {
      throw new Error("extracted archive is missing frpc");
    }
    if (!existsSync(destDir)) {
      try {
        await rename(extracted, destDir);
      } catch {
        await cp(extracted, destDir, { recursive: true });
      }
    }

    if (plistPath && bakPath && existsSync(plistPath)) {
      await copyFile(plistPath, bakPath);
      await execFile(
        "/usr/libexec/PlistBuddy",
        ["-c", `Set :ProgramArguments:0 ${newBinary}`, plistPath],
        {
          timeout: 5000,
        },
      );
      await execFile(
        "/usr/libexec/PlistBuddy",
        ["-c", `Set :WorkingDirectory ${destDir}`, plistPath],
        {
          timeout: 5000,
        },
      );

      try {
        await stopService();
      } catch {
        // may already be unloaded
      }
      try {
        await startService();
      } catch {
        await restartService();
      }

      const service = await getServiceStatus();
      if (!service.running) {
        throw new Error(
          `service is not running after upgrade. Restore ${bakPath} and kickstart to roll back.`,
        );
      }
      const reported = await getFrpcVersion(newBinary);
      await LocalStorage.removeItem(UPDATE_CACHE_KEY);
      return {
        ok: true,
        message: `Upgraded to ${reported ?? version} (pid ${service.pid ?? "?"})`,
      };
    }

    const reported = await getFrpcVersion(newBinary);
    await LocalStorage.removeItem(UPDATE_CACHE_KEY);
    return {
      ok: true,
      message: `Downloaded frpc ${reported ?? version} to ${destDir}. Restart frpc manually to use it.`,
    };
  } catch (error) {
    const hint = bakPath
      ? ` Restore ${bakPath} and kickstart to roll back.`
      : "";
    return { ok: false, message: `${errorMessage(error)}.${hint}` };
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

export async function rollbackPlist(): Promise<UpgradeResult> {
  const label = getPrefs().launchdLabel;
  if (!label) {
    return { ok: false, message: "No launchd label configured" };
  }
  const plistPath = getPlistPath(label);
  const bakPath = `${plistPath}.bak`;
  if (!existsSync(bakPath)) {
    return { ok: false, message: `No plist backup at ${bakPath}` };
  }
  try {
    await copyFile(bakPath, plistPath);
    try {
      await stopService();
    } catch {
      // ignore
    }
    try {
      await startService();
    } catch {
      await restartService();
    }
    const service = await getServiceStatus();
    return {
      ok: service.running,
      message: service.running
        ? "Rolled back plist and restarted frpc"
        : "Rollback copied plist but service is not running",
    };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function confirmStop(): Promise<boolean> {
  return confirmAlert({
    title: "Stop frpc?",
    message:
      "The launchd job will be unloaded. KeepAlive will not relaunch it until you start it again.",
    primaryAction: { title: "Stop", style: Alert.ActionStyle.Destructive },
  });
}

export async function confirmRestart(): Promise<boolean> {
  return confirmAlert({
    title: "Restart frpc?",
    message: "The service will be kickstarted (killed and launched again).",
    primaryAction: { title: "Restart" },
  });
}

export async function confirmReload(): Promise<boolean> {
  return confirmAlert({
    title: "Reload config?",
    message: "frpc will hot-reload frpc.toml without dropping connections.",
    primaryAction: { title: "Reload" },
  });
}

export async function confirmUpgrade(version: string): Promise<boolean> {
  return confirmAlert({
    title: `Upgrade to ${version}?`,
    message:
      "This downloads the release for your Mac, keeps the old binary directory, rewrites the LaunchAgent plist (a .bak is saved), and restarts the service.",
    primaryAction: { title: `Upgrade to ${version}` },
  });
}

export async function loadStatusDashboard(): Promise<StatusDashboard> {
  const prefs = getPrefs();
  const configPath = getConfigPath(prefs.frpDir);
  const logPath = await resolveLogPath(prefs.frpDir);
  const binaryPath = await findFrpcBinary(prefs.frpDir);
  const [service, version, adminStatus, config] = await Promise.all([
    getServiceStatus(),
    binaryPath ? getFrpcVersion(binaryPath) : Promise.resolve(undefined),
    fetchAdminStatus(),
    parseFrpcToml(configPath).catch(() => undefined),
  ]);
  const counts = adminStatus
    ? countOnline(adminStatus)
    : { online: 0, total: config?.proxies.length ?? 0 };
  const update = await checkForUpdates(version ?? "");
  const serverAddress = config
    ? `${config.serverAddr}:${config.serverPort}`
    : "";

  return {
    service,
    version,
    binaryPath,
    configPath,
    logPath,
    frpDir: prefs.frpDir,
    serverAddress,
    admin: {
      reachable: Boolean(adminStatus),
      online: counts.online,
      total: counts.total,
    },
    update,
  };
}

export async function loadProxyItems(): Promise<ProxyViewItem[]> {
  const prefs = getPrefs();
  const config = await parseFrpcToml(getConfigPath(prefs.frpDir));
  const adminStatus = await fetchAdminStatus();
  const runtimes = flattenAdminStatus(adminStatus);
  const statusUnavailable = !adminStatus;

  return config.proxies.map((proxy) => {
    const runtime = runtimes.find((item) => item.name === proxy.name);
    return {
      config: proxy,
      serverAddr: config.serverAddr,
      remoteAddress: `${config.serverAddr}:${proxy.remotePort}`,
      localAddress: `${proxy.localIP}:${proxy.localPort}`,
      runtime,
      statusUnavailable,
    };
  });
}

function requireLabel(): string {
  const label = getPrefs().launchdLabel;
  if (!label) {
    throw new Error(
      "No launchd label configured. Set it in the extension preferences to enable service control.",
    );
  }
  return label;
}

function launchdDomain(): string {
  const uid = process.getuid?.();
  if (uid === undefined) {
    throw new Error("process.getuid is unavailable");
  }
  return `gui/${uid}`;
}

function launchdTarget(label: string): string {
  return `${launchdDomain()}/${label}`;
}

async function pgrepStatus(): Promise<ServiceStatus> {
  try {
    const { stdout } = await execFile("/usr/bin/pgrep", ["-fl", "frpc"], {
      timeout: 3000,
    });
    const line = stdout
      .split("\n")
      .map((entry) => entry.trim())
      .find((entry) => entry.includes("/frpc") && !entry.includes("pgrep"));
    if (!line) {
      return { running: false, state: "not loaded", managed: false };
    }
    const pid = Number(line.split(/\s+/)[0]);
    return {
      running: true,
      state: "running",
      pid: Number.isFinite(pid) ? pid : undefined,
      uptimeLabel: Number.isFinite(pid) ? await processUptime(pid) : undefined,
      managed: false,
    };
  } catch {
    return { running: false, state: "not loaded", managed: false };
  }
}

async function processUptime(pid: number): Promise<string | undefined> {
  try {
    const { stdout } = await execFile(
      "/bin/ps",
      ["-o", "etime=", "-p", String(pid)],
      { timeout: 3000 },
    );
    return formatEtime(stdout.trim());
  } catch {
    return undefined;
  }
}

function formatEtime(raw: string): string | undefined {
  const match = raw.match(/^(?:(?:(\d+)-)?(\d+):)?(\d+):(\d+)$/);
  if (!match) {
    return raw || undefined;
  }
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  const parts: string[] = [];
  if (days) {
    parts.push(`${days}d`);
  }
  if (hours) {
    parts.push(`${hours}h`);
  }
  if (minutes) {
    parts.push(`${minutes}m`);
  }
  if (seconds || parts.length === 0) {
    parts.push(`${seconds}s`);
  }
  return parts.join(" ");
}

async function adminFetch(
  pathname: string,
  init?: RequestInit,
): Promise<Response> {
  const prefs = getPrefs();
  const token = Buffer.from(
    `${prefs.adminUser}:${prefs.adminPassword ?? ""}`,
  ).toString("base64");
  return fetch(`http://${prefs.adminAddr}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Basic ${token}`,
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(3000),
  });
}

function parseLogLine(raw: string): LogLine {
  const match = raw.match(
    /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+\[([IWE])\]\s+(.*)$/,
  );
  if (!match) {
    return { raw, message: raw };
  }
  const level = match[2];
  return {
    raw,
    time: match[1],
    level: level === "I" || level === "W" || level === "E" ? level : undefined,
    message: match[3],
  };
}

function parseSemver(input: string): [number, number, number] | undefined {
  const match = input
    .trim()
    .replace(/^v/i, "")
    .match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return undefined;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isErrno(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}

function readLogTo(log: unknown): string | undefined {
  if (!isRecord(log)) {
    return undefined;
  }
  return typeof log.to === "string" && log.to.length > 0 ? log.to : undefined;
}

function toProxyConfig(value: unknown): ProxyConfig | undefined {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.type !== "string"
  ) {
    return undefined;
  }
  const localPort = Number(value.localPort);
  const remotePort = Number(value.remotePort);
  if (!Number.isFinite(localPort) || !Number.isFinite(remotePort)) {
    return undefined;
  }
  return {
    name: value.name,
    type: value.type,
    localIP: typeof value.localIP === "string" ? value.localIP : "127.0.0.1",
    localPort,
    remotePort,
  };
}

function toProxyRuntime(value: unknown): ProxyRuntime | undefined {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.type !== "string"
  ) {
    return undefined;
  }
  if (typeof value.status !== "string") {
    return undefined;
  }
  return {
    name: value.name,
    type: value.type,
    status: value.status,
    err: typeof value.err === "string" ? value.err : "",
    local_addr:
      typeof value.local_addr === "string" ? value.local_addr : undefined,
    remote_addr:
      typeof value.remote_addr === "string" ? value.remote_addr : undefined,
  };
}

function parseAdminStatus(value: unknown): AdminStatusMap | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const result: AdminStatusMap = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!Array.isArray(entry)) {
      continue;
    }
    result[key] = entry.flatMap((item) => {
      const runtime = toProxyRuntime(item);
      return runtime ? [runtime] : [];
    });
  }
  return result;
}

function isGithubRelease(value: unknown): value is {
  tag_name: string;
  assets: { name: string; browser_download_url: string }[];
} {
  if (
    !isRecord(value) ||
    typeof value.tag_name !== "string" ||
    !Array.isArray(value.assets)
  ) {
    return false;
  }
  return value.assets.every(
    (asset) =>
      isRecord(asset) &&
      typeof asset.name === "string" &&
      typeof asset.browser_download_url === "string",
  );
}

async function readUpdateCache(): Promise<UpdateCheckResult | undefined> {
  const raw = await LocalStorage.getItem<string>(UPDATE_CACHE_KEY);
  if (!raw) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      typeof parsed.localVersion !== "string" ||
      typeof parsed.hasUpdate !== "boolean"
    ) {
      return undefined;
    }
    if (typeof parsed.checkedAt !== "number") {
      return undefined;
    }
    return {
      hasUpdate: parsed.hasUpdate,
      localVersion: parsed.localVersion,
      latestVersion:
        typeof parsed.latestVersion === "string"
          ? parsed.latestVersion
          : undefined,
      downloadUrl:
        typeof parsed.downloadUrl === "string" ? parsed.downloadUrl : undefined,
      checkedAt: parsed.checkedAt,
    };
  } catch {
    return undefined;
  }
}
