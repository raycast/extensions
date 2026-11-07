import { run } from "./exec";
import type { RawProc } from "./types";

/* macOS 进程枚举。

   comm= 在 mac 上可能是带空格的完整 .app 路径（/Applications/企业微信.app/Contents/MacOS/企业微信），
   所以不能和 args= 挤在同一行按 \S+ 切；分两次采：comm 作 exe/name，args 作 commandLine
   （搜端口 / 认 -jar 用）。
   lstart 只用于识别 PID 复用，固定 5 段（Www Mmm dd hh:mm:ss yyyy）——依赖 exec.ts 固定的
   UTF-8 英文 locale，否则中文 locale 下日期会少一段。 */
const COMM_ARGS = ["-axwwo", "pid=,ppid=,pcpu=,rss=,lstart=,uid=,comm="];
const ARGS_ARGS = ["-axwwo", "pid=,args="];

const COMM_LINE = /^\s*(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)\s+(\S+\s+\S+\s+\d+\s+\d+:\d+:\d+\s+\d+)\s+(\d+)\s+(.*)$/;
const ARGS_LINE = /^\s*(\d+)\s+(.*)$/;

export async function listProcesses(): Promise<RawProc[]> {
  const [commOut, argsOut] = await Promise.all([run("ps", COMM_ARGS), run("ps", ARGS_ARGS)]);

  const argsByPid = new Map<number, string>();
  for (const line of argsOut.split("\n")) {
    const match = ARGS_LINE.exec(line);
    if (match) argsByPid.set(Number(match[1]), (match[2] ?? "").trim());
  }

  const procs: RawProc[] = [];
  for (const line of commOut.split("\n")) {
    const match = COMM_LINE.exec(line);
    if (!match) continue;
    const pid = Number(match[1]);
    const fields = macProcessFields(match[7].trim(), argsByPid.get(pid) ?? "");
    procs.push({
      pid,
      ppid: Number(match[2]),
      cpu: parseFloat(match[3]) || 0,
      memBytes: Number(match[4]) * 1024,
      startedAt: match[5],
      uid: Number(match[6]),
      exe: fields.exe,
      name: fields.name,
      commandLine: fields.commandLine,
    });
  }
  inheritBundleExecutables(procs);
  return procs;
}

/* ---- comm/args → exe/name（对齐 goose-monitor utools/process-role.cjs，去掉 win/linux 分支）---- */

const isExecutablePath = (text: string): boolean =>
  String(text || "")
    .trim()
    .startsWith("/");

function baseName(text: string): string {
  const value = String(text || "").trim();
  return value.split(/[/\\]/).pop() || value;
}

/** Electron/Chromium 把 comm/args 改写成 "App Helper: role [1:window]"，不是可执行路径。 */
function isRewrittenHelperTitle(text: string): boolean {
  const value = String(text || "");
  if (/Helper(?:\s*\([^)]+\))?\s*:/.test(value)) return true;
  return /\[[\d]+:(?:empty-window|[0-9a-f]{16,})\]/i.test(value);
}

/** 只截到 .app/Contents/MacOS/ 下的二进制，不把 fileWatcher / 窗口 id 吃进 exe。 */
function cutMacAppExecutable(text: string): string {
  const macosAt = text.search(/\.app\/Contents\/MacOS\//i);
  if (macosAt >= 0) {
    const prefixLen = macosAt + ".app/Contents/MacOS/".length;
    const rest = text.slice(prefixLen);
    const flagAt = rest.search(/\s+-\S/);
    const beforeFlags = flagAt >= 0 ? rest.slice(0, flagAt) : rest;
    const junkAt = beforeFlags.search(/\s+(?:fileWatcher|\[[\d]+:)/i);
    const bin = (junkAt >= 0 ? beforeFlags.slice(0, junkAt) : beforeFlags).trim();
    if (bin && !isRewrittenHelperTitle(bin)) return text.slice(0, prefixLen) + bin;
  }
  const appAt = text.search(/\.app\/Contents\//i);
  if (appAt < 0) return "";
  const flag = text.slice(appAt).search(/\s+-\S/);
  if (flag < 0) return "";
  return text.slice(0, appAt + flag).trim();
}

/** args 不给带空格的 .app 路径加引号，只能靠 .app/Contents 定位。 */
function executableFromCommand(procName: string, commandLine: string): string {
  const text = String(commandLine || "").trim();
  if (!text) return procName;
  const quoted = text.match(/^(["'])(.*?)\1(?:\s|$)/);
  if (quoted && quoted[2]) return quoted[2];
  if (/^\/.*\.app\/Contents\//i.test(text)) {
    const exe = cutMacAppExecutable(text);
    if (exe) return exe;
  }
  if (isRewrittenHelperTitle(text)) {
    if (procName && !isRewrittenHelperTitle(procName)) return procName;
    return text.match(/^\S+/)?.[0] || procName;
  }
  return text.match(/^\S+/)?.[0] || procName;
}

/** comm 可能是完整路径、java 这类短名，或 Helper 改写标题。 */
function macProcessFields(comm: string, commandLine: string): { exe: string; name: string; commandLine: string } {
  const commText = String(comm || "").trim();
  const args = String(commandLine || "").trim();
  if (isExecutablePath(commText) && !isRewrittenHelperTitle(commText)) {
    return { exe: commText, name: baseName(commText), commandLine: args };
  }
  const exe = executableFromCommand(commText, args || commText);
  let name: string;
  if (commText && !isExecutablePath(commText) && !isRewrittenHelperTitle(commText)) {
    name = commText;
  } else if (isExecutablePath(exe)) {
    name = baseName(exe);
  } else {
    name = isRewrittenHelperTitle(exe) ? exe.match(/^\S+/)?.[0] || "Helper" : exe || "Helper";
  }
  return { exe, name, commandLine: args };
}

/** Helper 的 comm 是改写标题时，向上找 .app bundle 里的祖先，把组归到应用上。 */
function inheritBundleExecutables(procs: RawProc[]): void {
  const byPid = new Map(procs.map((proc) => [proc.pid, proc]));
  for (const proc of procs) {
    const title = `${proc.name || ""} ${proc.exe || ""} ${proc.commandLine || ""}`;
    if (!isRewrittenHelperTitle(title)) continue;
    if (isExecutablePath(proc.exe) && proc.exe.includes(".app/") && !isRewrittenHelperTitle(proc.exe)) continue;
    let parentPid = proc.ppid;
    const seen = new Set<number>();
    while (parentPid > 1 && !seen.has(parentPid)) {
      seen.add(parentPid);
      const parent = byPid.get(parentPid);
      if (!parent) break;
      if (isExecutablePath(parent.exe) && parent.exe.includes(".app/")) {
        proc.exe = parent.exe;
        proc.name = baseName(parent.exe) || parent.name;
        break;
      }
      parentPid = parent.ppid;
    }
  }
}
