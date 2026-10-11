import { run } from "./exec";
import type { AppRow } from "./types";

/* 采集进程正在监听的 TCP 端口（macOS 用 lsof）。

   ponytail: 只留 mac 的 lsof 分支，去掉 ss / netstat。
   真实项目里 lsof 可能被权限拦住（不是 root 只看到自己的进程）——失败由调用方降级为空表。 */

/** pid → 升序去重端口表。 */
export type PortTable = Map<number, number[]>;

const addPort = (byPid: Map<number, Set<number>>, pid: number, port: number): void => {
  if (!Number.isInteger(pid) || pid <= 0 || !Number.isInteger(port) || port <= 0 || port > 65535) return;
  const ports = byPid.get(pid);
  if (ports) ports.add(port);
  else byPid.set(pid, new Set([port]));
};

export function parseLsof(text: string): PortTable {
  const byPid = new Map<number, Set<number>>();
  for (const line of String(text || "").split(/\r?\n/)) {
    if (!line.includes("(LISTEN)")) continue;
    const pidMatch = line.match(/^\S+\s+(\d+)\s+/);
    const portMatch = line.match(/:(\d+)\s+\(LISTEN\)/);
    if (!pidMatch || !portMatch) continue;
    addPort(byPid, Number(pidMatch[1]), Number(portMatch[1]));
  }
  const table: PortTable = new Map();
  for (const [pid, ports] of byPid)
    table.set(
      pid,
      [...ports].sort((a, b) => a - b),
    );
  return table;
}

export function collectListenPorts(): Promise<PortTable> {
  return run("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"]).then(parseLsof);
}

const SERVICE_NAME =
  /^(java|javaw|jsvc|node|nodejs|bun|deno|python(\d+)?|pythonw|pypy(\d+)?|ruby|php(-fpm)?|perl|go|vite|webpack|next-server|nuxt|uvicorn|gunicorn|hypercorn|caddy|nginx|httpd|apache2|redis-server|mongod|postgres|mysqld|mariadbd)(\.exe)?$/i;

const processBaseName = (value: string): string =>
  String(value || "")
    .split(/[/\\]/)
    .pop()!
    .replace(/\.(exe|bin)$/i, "")
    .trim();

/** 只给服务型运行时贴端口，避免 Chrome Helper 之类的杂散 LISTEN 污染列表。 */
export function isServiceRuntime(name: string, path: string): boolean {
  const names = [processBaseName(name), processBaseName(path)];
  if (names.some((item) => SERVICE_NAME.test(item))) return true;
  const hay = `${name || ""} ${path || ""}`;
  return (
    /(^|[/\\])(vite|next|webpack)(\.js)?$/i.test(hay) ||
    /node_modules[/\\]\.bin[/\\](vite|next|webpack)/i.test(hay) ||
    /\b(java|node|bun|deno|python\d*|vite)\b/i.test(name || "")
  );
}

function commandLineLooksLikeService(row: AppRow): boolean {
  const text = String(row.commandLine || "").trim();
  if (!text) return false;
  const head = processBaseName(text.match(/^\S+/)?.[0] || "").replace(/\.exe$/i, "");
  if (SERVICE_NAME.test(head)) return true;
  if (/(?:^|\s)(-jar|--server\.port=|-Dserver\.port=)\b/.test(text)) {
    return (
      SERVICE_NAME.test(processBaseName(row.name)) ||
      SERVICE_NAME.test(processBaseName(row.path)) ||
      /\.jar\b/i.test(`${row.name || ""} ${row.path || ""}`)
    );
  }
  return false;
}

export function rowLooksLikeService(row: AppRow): boolean {
  if (isServiceRuntime(row.name, row.path)) return true;
  if (commandLineLooksLikeService(row)) return true;
  return (row.helpers || []).some((helper) => isServiceRuntime(helper.name, row.path));
}

/** 就地写入 row.ports / helper.ports。凡是 lsof 表里有的 PID 均挂载端口。 */
export function attachListenPorts(rows: AppRow[], table: PortTable): void {
  for (const row of rows) {
    const ports = new Set<number>();
    for (const pid of row.allPids.length ? row.allPids : [row.pid]) {
      for (const port of table.get(pid) ?? []) ports.add(port);
    }
    row.ports = [...ports].sort((a, b) => a - b);
    for (const helper of row.helpers) helper.ports = [...(table.get(helper.pid) ?? [])].sort((a, b) => a - b);
  }
}
