// 免 Pro 的窗口后端：枚举走 CGWindowList（无需权限），移动走 System Events
// 的 Accessibility 接口（需要给 Raycast 授「辅助功能」权限）。
// 刻意不读 CG 窗口标题——那需要屏幕录制权限；窗口匹配只用 pid + 当前坐标。
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface WMWindow {
  id: string; // kCGWindowNumber，窗口存活期间稳定，创建顺序单调递增
  pid: number;
  appName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WMRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WMScreen {
  id: string;
  frame: WMRect; // 整屏，CG 左上角原点坐标系
  visible: WMRect; // 去掉菜单栏和 Dock 的可用区域
}

export interface WMState {
  windows: WMWindow[]; // CG 返回序。多屏下按 Space 分组，不是全局 z-order
  screens: WMScreen[];
  cursor: { x: number; y: number }; // CG 左上角原点坐标系
}

export interface WMMove {
  id: string;
  pid: number;
  // 当前坐标，用于在 AX 窗口列表里定位目标窗口
  cx: number;
  cy: number;
  cw: number;
  ch: number;
  // 目标坐标
  x: number;
  y: number;
  width: number;
  height: number;
}

export class AccessibilityError extends Error {}

async function runJXA(script: string, arg?: string): Promise<string> {
  const args = ["-l", "JavaScript", "-e", script];
  if (arg !== undefined) args.push(arg);
  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", args);
    return stdout.trim();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/assistive access|not authorized|1002|-25211/i.test(msg)) {
      throw new AccessibilityError(msg);
    }
    throw error;
  }
}

const LIST_SCRIPT = `
ObjC.import('Cocoa');
function run() {
  // 1 = OnScreenOnly：只取当前 Space 可见窗口（layer 过滤自然排除桌面元素）
  // 注意：$.CFBridgingRelease 在 macOS 26 上会段错误，用 castRefToObject（泄漏无害，进程即退）
  const raw = ObjC.castRefToObject($.CGWindowListCopyWindowInfo(1, 0));
  const list = ObjC.deepUnwrap(raw) || [];
  const windows = [];
  const menubars = []; // layer 24 = 菜单栏，每块屏一条，用于修正 visibleFrame
  for (const d of list) {
    const b = d.kCGWindowBounds;
    if (!b) continue;
    if (d.kCGWindowLayer === 24 && b.Width >= 800 && b.Height <= 60) {
      menubars.push({ x: b.X, y: b.Y, height: b.Height });
      continue;
    }
    if (d.kCGWindowLayer !== 0) continue;
    if (d.kCGWindowAlpha === 0) continue;
    if (b.Width < 100 || b.Height < 50) continue;
    windows.push({
      id: String(d.kCGWindowNumber),
      pid: d.kCGWindowOwnerPID,
      appName: d.kCGWindowOwnerName || '',
      x: b.X, y: b.Y, width: b.Width, height: b.Height,
    });
  }
  const screens = [];
  const ss = $.NSScreen.screens;
  const H0 = ss.objectAtIndex(0).frame.size.height;
  for (let i = 0; i < ss.count; i++) {
    const s = ss.objectAtIndex(i);
    const f = s.frame, v = s.visibleFrame;
    // Cocoa 左下原点 → CG 左上原点
    const frame   = { x: f.origin.x, y: H0 - f.origin.y - f.size.height, width: f.size.width, height: f.size.height };
    const visible = { x: v.origin.x, y: H0 - v.origin.y - v.size.height, width: v.size.width, height: v.size.height };
    // macOS 26 对外接屏上报的 visibleFrame 不扣菜单栏，用实测的菜单栏窗口高度修正
    const bar = menubars.find(m => Math.abs(m.x - frame.x) <= 2 && Math.abs(m.y - frame.y) <= 2);
    if (bar) {
      const reported = visible.y - frame.y;
      if (reported < bar.height) {
        const diff = bar.height - reported;
        visible.y += diff;
        visible.height -= diff;
      }
    }
    screens.push({ id: String(i), frame, visible });
  }
  // 鼠标位置用来判断用户在哪块屏。CG 列表首个窗口做不到这件事：多屏独立
  // Spaces 下它按 Space 分组，不是全局 z-order（实测前台是 ghostty 时首位
  // 却是另一块屏的访达窗口）
  const m = $.NSEvent.mouseLocation; // Cocoa 左下原点
  const cursor = { x: m.x, y: H0 - m.y };
  return JSON.stringify({ windows, screens, cursor });
}
`;

export async function getState(): Promise<WMState> {
  return JSON.parse(await runJXA(LIST_SCRIPT)) as WMState;
}

// 全部窗口在一个 osascript 进程里处理。不要改成「每 app 一个进程并行」：
// System Events 是单进程，所有 Apple Event 都在它那里排队串行执行，多开
// osascript 只多付冷启动和 CPU 竞争——实测 6 个 app 从 1271ms 退化到 1797ms。
const APPLY_SCRIPT = `
function run(argv) {
  const moves = JSON.parse(argv[0]);
  const se = Application('System Events');
  const TOL = 40;
  const failed = [];
  // 一次拿全部进程的 pid 建索引，之后按索引寻址。不要用 whose({unixId})：
  // 那是过滤查询，System Events 在 specifier 每次求值时都会重跑一遍全进程
  // 匹配（实测每 app 约 58ms，之后每次 .windows 访问还要再付一次），而
  // unixId() 一次往返就拿到全部 128 个进程、只要 34ms。实测读开销 910→426ms。
  // 索引寻址同时规避了物化引用按进程名寻址、同名多进程指错窗口的老坑。
  const allPids = se.processes.unixId();
  const pidIndex = {};
  for (let i = 0; i < allPids.length; i++) pidIndex[allPids[i]] = i;
  const byPid = {};
  for (const m of moves) (byPid[m.pid] = byPid[m.pid] || []).push(m);
  for (const pid of Object.keys(byPid)) {
    const group = byPid[pid];
    let proc, positions, sizes;
    try {
      const idx = pidIndex[pid];
      if (idx === undefined) throw new Error('pid gone');
      proc = se.processes[idx];
      // 批量取坐标：一次 Apple Event，比逐窗口快得多。进程列表若在这几百
      // 毫秒里变动会让索引错位，但随后的四维坐标匹配自然对不上、记为
      // failed，不会误移动别人的窗口——匹配本身就是安全网
      positions = proc.windows.position();
      sizes = proc.windows.size();
    } catch (e) {
      for (const m of group) failed.push(m.id);
      continue;
    }
    // 先全部完成匹配再移动，避免移动后的坐标干扰后续匹配。
    // 匹配用「最近优先」而不是「第一个落在容差内」：macOS 新窗口 cascade
    // 偏移约 20px，小于容差 40，逐个取首个命中会让层叠的同 app 窗口互相错配、
    // 交换槽位。先枚举全部候选对，按四维距离全局升序锁定，层叠时也能对上。
    const pairs = [];
    for (let g = 0; g < group.length; g++) {
      const m = group[g];
      for (let i = 0; i < positions.length; i++) {
        const p = positions[i], s = sizes[i];
        const dx = p[0]-m.cx, dy = p[1]-m.cy, dw = s[0]-m.cw, dh = s[1]-m.ch;
        if (Math.abs(dx)<=TOL && Math.abs(dy)<=TOL && Math.abs(dw)<=TOL && Math.abs(dh)<=TOL) {
          pairs.push({ g: g, i: i, dist: dx*dx + dy*dy + dw*dw + dh*dh });
        }
      }
    }
    pairs.sort((a, b) => a.dist - b.dist);
    const usedWindow = {}, usedMove = {};
    const matched = [];
    for (const pr of pairs) {
      if (usedWindow[pr.i] || usedMove[pr.g]) continue;
      usedWindow[pr.i] = true;
      usedMove[pr.g] = true;
      matched.push(pr);
    }
    for (let g = 0; g < group.length; g++) if (!usedMove[g]) failed.push(group[g].id);
    // 按原顺序移动，保持与调用方给出的槽位顺序一致
    matched.sort((a, b) => a.g - b.g);
    for (const pr of matched) {
      const i = pr.i, m = group[pr.g];
      // 已经在目标位置的窗口不必再写：省一次往返，也省一次多余的重绘
      if (m.x === m.cx && m.y === m.cy && m.width === m.cw && m.height === m.ch) continue;
      // 关键：用 proc.windows[i] 的 whose 链式引用寻址，绝不调用 windows()
      // 物化——物化出的引用按进程名寻址，同名多进程（如两个 Ghostty 实例）
      // 时会全部解析到第一个进程，窗口就指错了
      const w = proc.windows[i];
      try {
        // 顺序必须是 size → position → size：先挪位置会让大窗悬出屏幕，
        // 随后的 resize 触发 AppKit 跨屏约束、高度被加上 ~57px（macOS 26 实测）。
        // 末尾那次 size 只有放大路径需要（贴底放大时首次 size 同样会被钳）——
        // 平铺基本都是缩小，无条件补发等于白花一次往返和一次可见跳变
        w.size = [m.width, m.height];
        w.position = [m.x, m.y];
        if (m.width > m.cw || m.height > m.ch) w.size = [m.width, m.height];
      } catch (e) { failed.push(m.id); }
    }
  }
  return JSON.stringify({ failed });
}
`;

export async function applyMoves(moves: WMMove[]): Promise<{ failed: string[] }> {
  if (moves.length === 0) return { failed: [] };
  return JSON.parse(await runJXA(APPLY_SCRIPT, JSON.stringify(moves))) as { failed: string[] };
}
