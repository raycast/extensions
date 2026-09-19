import { createHash } from "node:crypto";
import { basename } from "node:path";
import { protectedReason } from "./protected";
import type { AppRow, Helper, RawProc, RowKind } from "./types";

/** 分组键/成员快照的短哈希：比自写 hash 更不容易撞，且不依赖进程顺序。 */
const hash = (value: string): string => createHash("sha1").update(value).digest("hex").slice(0, 12);

/** .app bundle → 分组键；非 bundle 返回 null。 */
export function appBundle(exe: string): { bundle: string; name: string } | null {
  if (!exe) return null;
  const at = exe.indexOf(".app/");
  if (at >= 0) {
    const bundle = exe.slice(0, at + 4);
    return { bundle, name: basename(bundle, ".app") };
  }
  if (exe.endsWith(".app")) return { bundle: exe, name: basename(exe, ".app") };
  return null;
}

/** 系统自有路径：真实图标缺失时用系统图标，且不进界面分类。 */
function isSystemPath(exe: string, name: string): boolean {
  if (!exe) return true;
  if (name === "kernel_task") return true;
  return (
    exe.startsWith("/usr/sbin/") ||
    exe.startsWith("/usr/libexec/") ||
    exe.startsWith("/sbin/") ||
    exe.startsWith("/System/") ||
    exe.startsWith("/Library/") ||
    exe.startsWith("/lib/") ||
    exe.startsWith("/bin/")
  );
}

/* 图形应用判定：macOS 大量系统守护进程也住在 .app 包里（XProtect、XPC 服务），
   但它们装在 /System、/Library、/usr 下，不是用户应用。
   ponytail: 非 bundle 的可执行一律不算界面应用（mac 上 GUI 必然有 .app），
   因此丢掉了 goose-monitor 里给 Linux /opt、/snap 的启发式。 */
function isGraphicalApp(exe: string): boolean {
  if (!exe) return false;
  if (!exe.includes(".app/") && !exe.endsWith(".app")) return false;
  return !(exe.startsWith("/System/") || exe.startsWith("/Library/") || exe.startsWith("/usr/"));
}

/** 非 bundle 程序只归并同一 exe 的同一棵进程树，避免把两个独立的 node/python 实例一起结束。 */
function findExecutableTreeRootPid(proc: RawProc, byPid: Map<number, RawProc>): number {
  let root = proc;
  let parentPid = proc.ppid;
  const seen = new Set<number>();
  while (parentPid > 1 && !seen.has(parentPid)) {
    seen.add(parentPid);
    const parent = byPid.get(parentPid);
    if (!parent || parent.exe !== proc.exe) break;
    root = parent;
    parentPid = parent.ppid;
  }
  return root.pid;
}

/** java -jar foo-1.2.3.jar → "foo"，否则原样返回。 */
export function serviceDisplayName(name: string, commandLine: string): string {
  const proc = String(name || "")
    .split(/[/\\]/)
    .pop()!
    .replace(/\.exe$/i, "");
  if (!/^java(w)?$|^jsvc$/i.test(proc)) return name;
  const matched = String(commandLine || "").match(/(?:^|\s)-jar\s+(?:"([^"]+\.jar)"|'([^']+)\.jar'|(\S+\.jar))/i);
  if (!matched) return name;
  const jarFile = (matched[1] || matched[2] || matched[3] || "").split(/[/\\]/).pop() || "";
  const base = jarFile.replace(/\.jar$/i, "");
  return base.replace(/-\d[\w.-]*$/, "") || base || name;
}

/** Chromium 图形子进程靠命令行区分（win/linux Helper 常与主进程同名）。 */
export function inferRole(procName: string, commandLine: string, isMain: boolean): string {
  if (/(?:^|\s)--type=gpu-process(?=\s|$)/i.test(commandLine) || procName.toLowerCase().includes("gpu")) return "GPU";
  if (isMain) return "Main Process";
  const n = procName.toLowerCase();
  if (n.includes("renderer")) return "Renderer";
  if (n.includes("plugin") || n.includes("extension")) return "Extension";
  if (n.includes("network")) return "Network";
  if (n.includes("crashpad") || n.includes("crash")) return "Crash Reporter";
  if (n.includes("utility")) return "Helper";
  if (n.includes("helper")) return "Helper";
  return "Child";
}

interface Group {
  key: string;
  identity: string;
  display: string;
  bundle: string;
  graphical: boolean;
  systemOwned: boolean;
  members: RawProc[];
}

/** 按应用聚合：同一 .app bundle / 同一 exe 进程树 = 一行，Helper 进 helpers。 */
export function groupProcesses(raw: RawProc[]): AppRow[] {
  const byPid = new Map(raw.map((proc) => [proc.pid, proc]));
  const groups = new Map<string, Group>();

  for (const proc of raw) {
    const bundle = appBundle(proc.exe);
    let identity: string;
    let key: string;
    let display: string;
    let bundlePath: string;
    let graphical: boolean;
    if (bundle) {
      identity = `app:${bundle.bundle}`;
      key = identity;
      display = bundle.name;
      bundlePath = bundle.bundle;
      // 系统路径下的无头 .app（XProtect 等）不当界面应用；isGraphicalApp 已排除 /System|/Library|/usr。
      graphical = isGraphicalApp(proc.exe);
    } else if (proc.exe) {
      identity = `exe:${proc.exe}`;
      key = `${identity}#${findExecutableTreeRootPid(proc, byPid)}`;
      display = serviceDisplayName(proc.name, proc.commandLine);
      bundlePath = proc.exe;
      graphical = isGraphicalApp(proc.exe);
    } else {
      // 连 exe 都拿不到（权限不足）：只能按 PID 独立成行。
      identity = `name:${proc.name}`;
      key = `${identity}#${proc.pid}`;
      display = serviceDisplayName(proc.name, proc.commandLine);
      bundlePath = "";
      graphical = false;
    }
    let group = groups.get(key);
    if (!group) {
      group = { key, identity, display, bundle: bundlePath, graphical, systemOwned: false, members: [] };
      groups.set(key, group);
    }
    group.graphical = group.graphical || graphical;
    group.systemOwned = group.systemOwned || isSystemPath(proc.exe, proc.name);
    group.members.push(proc);
  }

  const rows: AppRow[] = [];
  for (const group of groups.values()) {
    group.members.sort((a, b) => b.memBytes - a.memBytes);
    const main = group.members[0];
    const helpers: Helper[] =
      group.members.length > 1
        ? group.members.map((member, index) => ({
            name: member.name,
            role: inferRole(member.name, member.commandLine, index === 0),
            cpu: round1(member.cpu),
            memBytes: member.memBytes,
            pid: member.pid,
          }))
        : [];
    const bg = group.systemOwned && !group.graphical;
    const kind: RowKind = bg ? "bg" : group.graphical ? "app" : "other";
    const protReason = group.members.map((m) => protectedReason(m)).find((r) => r !== undefined);
    rows.push({
      id: `g${hash(group.key)}`,
      identity: group.identity,
      snapshotToken: hash(
        group.members
          .map((m) => `${m.pid}:${m.startedAt || "unknown"}`)
          .sort()
          .join(","),
      ),
      name: group.display,
      path: group.bundle || main.exe,
      pid: main.pid,
      allPids: group.members.map((m) => m.pid),
      cpu: round1(group.members.reduce((sum, m) => sum + m.cpu, 0)),
      memBytes: group.members.reduce((sum, m) => sum + m.memBytes, 0),
      procs: group.members.length,
      helpers,
      ports: [],
      // 只有真 .app bundle 才给 Raycast fileIcon 用；裸可执行文件的图标没有意义。
      iconPath: group.bundle.endsWith(".app") ? group.bundle : undefined,
      // any 而非 main：只要有一个成员杀不动，整组就拒绝，宁可灰掉也不要半杀。
      protected: protReason !== undefined,
      protectedReason: protReason,
      kind,
      hasWindow: false,
      commandLine: main.commandLine || "",
    });
  }
  return rows;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;
