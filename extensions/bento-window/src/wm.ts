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

// 权限类错误码。文案会跟随系统语言本地化（中文系统报的是「不允许辅助访问」），
// 正则匹配英文原文并不可靠，一律以错误码为准：
//   -25211 errAXAPIDisabled  未授「辅助功能」
//   -1743  errAEEventNotPermitted  未授「自动化」
const PERMISSION_ERRNOS = [-25211, -1743];

function isPermissionErrno(errno: unknown): boolean {
  return typeof errno === "number" && PERMISSION_ERRNOS.includes(errno);
}

async function runJXA(script: string, arg?: string): Promise<string> {
  const args = ["-l", "JavaScript", "-e", script];
  if (arg !== undefined) args.push(arg);
  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", args);
    return stdout.trim();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // osascript 整体失败时错误码会出现在 stderr 尾部，形如 "… (-25211)"
    if (PERMISSION_ERRNOS.some((n) => msg.includes(`(${n})`)) || /assistive access|not authorized/i.test(msg)) {
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

// CG 窗口与 AX 窗口是两套互不相通的列表，只能靠 pid + 四维坐标对上。
// 探测和移动两个脚本用同一套匹配规则，避免「探测认可的窗口移动时却对不上」。
// 匹配用「最近优先」而不是「第一个落在容差内」：macOS 新窗口 cascade 偏移约
// 20px，小于容差 40，逐个取首个命中会让层叠的同 app 窗口互相错配、交换槽位。
// 先枚举全部候选对，按四维距离全局升序锁定，层叠时也能对上。
// 不可平铺的 AX 窗口不参与配对：Electron 类 app 常带一个与主窗口坐标完全
// 相同的覆盖层窗口（飞书的 WatermarkWidget，AXUnknown、AXSize 不可设），
// 若让它进候选，距离同为 0 时会先被选中，size 写上去被静默忽略，主窗口原地不动。
const MATCH_HELPER = `
const TOL = 40;
const PERMISSION_ERRNOS = [-25211, -1743];
function matchGroup(group, ax) {
  const pairs = [];
  for (let g = 0; g < group.length; g++) {
    const m = group[g];
    for (let i = 0; i < ax.positions.length; i++) {
      if (!ax.eligible[i]) continue;
      const p = ax.positions[i], s = ax.sizes[i];
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
  const unmatched = [];
  for (let g = 0; g < group.length; g++) if (!usedMove[g]) unmatched.push(g);
  return { matched: matched, unmatched: unmatched };
}
// 进程一律按 pid 过滤寻址，specifier 每次求值都由 System Events 现场解析，
// 不存在「先读索引、后用索引」的时间窗——进程列表中途增减也指不到别家。
// 代价是每次求值比索引寻址多约 15ms（实测 45ms vs 29ms）。不要用 windows()
// 物化：物化出的引用按进程名寻址，同名多进程（如两个 Ghostty 实例）会指错。
function procByPid(se, pid) {
  return se.processes.whose({ unixId: Number(pid) })[0];
}
// 一个进程全部窗口的坐标与可平铺性，三次往返。eligible 对应官方
// WindowManagement API 的 positionable && resizable：AXSize 与 AXPosition 的
// settable 用一个 whose 过滤一次取回（实测 45ms，分两次读要 98ms），两项都
// 为 true 才算可平铺；缺任一属性的窗口返回的数组不足两项，同样视为不可平铺。
function readWindows(proc) {
  const positions = proc.windows.position();
  const sizes = proc.windows.size();
  const settable = proc.windows.attributes.whose({ _or: [{ name: 'AXSize' }, { name: 'AXPosition' }] }).settable();
  const eligible = [];
  for (let i = 0; i < positions.length; i++) {
    const s = settable[i];
    eligible.push(Array.isArray(s) && s.length === 2 && s[0] === true && s[1] === true);
  }
  return { positions: positions, sizes: sizes, eligible: eligible };
}
function groupByPid(items) {
  const byPid = {};
  for (const m of items) (byPid[m.pid] = byPid[m.pid] || []).push(m);
  return byPid;
}
// 只记权限类错误码。「不能获取对象」(-1728) 之类的普通失败若先到，
// 不能把后面真正的权限拒绝盖掉。
function notePermission(state, e) {
  if (PERMISSION_ERRNOS.indexOf(e.errorNumber) !== -1) state.permissionErrno = e.errorNumber;
}
`;

// 可平铺性探测。CG 列表里混着改不了大小或位置的窗口——固定尺寸的工具窗、
// 对话框、面板、覆盖层——它们一旦进网格就会占掉一个槽位、随后设置失败，
// 网格缺一块。用 AX 的 AXSize / AXPosition settable 在布局计算之前挑出去。
const PROBE_SCRIPT = `
${MATCH_HELPER}
function run(argv) {
  const items = JSON.parse(argv[0]);
  const se = Application('System Events');
  const byPid = groupByPid(items);
  const tileable = [];
  const state = { permissionErrno: 0 };
  for (const pid of Object.keys(byPid)) {
    const group = byPid[pid];
    let ax;
    try {
      ax = readWindows(procByPid(se, pid));
    } catch (e) {
      notePermission(state, e);
      continue; // 探测不到就当作不可平铺，移动阶段本来也会失败
    }
    const res = matchGroup(group, ax);
    for (const pr of res.matched) tileable.push(group[pr.g].id);
  }
  return JSON.stringify({ tileable: tileable, permissionErrno: state.permissionErrno });
}
`;

// 返回候选里真正能被平铺的窗口 id。AX 里对不上号或不可 resize / 移动的一律剔除，
// 它们进网格只会占一个空槽。
export async function getTileable(windows: WMWindow[]): Promise<Set<string>> {
  if (windows.length === 0) return new Set();
  const items = windows.map((w) => ({ id: w.id, pid: w.pid, cx: w.x, cy: w.y, cw: w.width, ch: w.height }));
  const raw = await runJXA(PROBE_SCRIPT, JSON.stringify(items));
  const { tileable, permissionErrno } = JSON.parse(raw) as { tileable: string[]; permissionErrno: number };
  // 一个窗口都探测不到、且原因是权限，就别再往下走到布局阶段，直接把授权引导抛出去
  if (tileable.length === 0 && isPermissionErrno(permissionErrno)) {
    throw new AccessibilityError(`Accessibility probe denied (${permissionErrno})`);
  }
  return new Set(tileable);
}

// 全部窗口在一个 osascript 进程里处理。不要改成「每 app 一个进程并行」：
// System Events 是单进程，所有 Apple Event 都在它那里排队串行执行，多开
// osascript 只多付冷启动和 CPU 竞争——实测 6 个 app 从 1271ms 退化到 1797ms。
const APPLY_SCRIPT = `
${MATCH_HELPER}
function run(argv) {
  const moves = JSON.parse(argv[0]);
  const se = Application('System Events');
  const failed = [];
  const state = { permissionErrno: 0 };
  // 第一阶段按进程分组读坐标、配对——批量读一次 Apple Event 拿全部窗口，
  // 比逐窗口快得多。第二阶段再按调用方给的槽位顺序逐个写入，这样网格是
  // 从槽位 1 起一格格填满，而不是按 pid 顺序一个 app 一个 app 地跳。
  const byPid = groupByPid(moves);
  const targets = {}; // move id → { proc, i }
  const enhanced = []; // 本次临时关掉的 AXEnhancedUserInterface，写完恢复
  for (const pid of Object.keys(byPid)) {
    const group = byPid[pid];
    let proc, ax;
    try {
      proc = procByPid(se, pid);
      // 可设置性在这里再读一遍而不是沿用探测结果：探测到移动之间窗口可能增减，
      // AX 索引会漂，而探测阶段剔掉的覆盖层窗口仍会和主窗口一起出现在这份列表里
      ax = readWindows(proc);
    } catch (e) {
      notePermission(state, e);
      for (const m of group) failed.push(m.id);
      continue;
    }
    const res = matchGroup(group, ax);
    for (const g of res.unmatched) failed.push(group[g].id);
    for (const pr of res.matched) targets[group[pr.g].id] = { proc: proc, i: pr.i };
    // AXEnhancedUserInterface 一旦被某个辅助功能客户端打开，AppKit 就把这个
    // app 的窗口 frame 变化做成渐进动画：size 刚写下去还在动，紧接着的 position
    // 写入就叠在中间帧上，窗口最终停在离槽位几十像素的地方、尺寸也是个中间值
    // （实测一个 Ghostty 实例连 properties 合并写都救不回来）。Rectangle、yabai、
    // Hammerspoon 的做法相同：移窗前临时关掉，移完恢复。
    try {
      const a = proc.attributes.byName('AXEnhancedUserInterface');
      if (a.value() === true) { a.value = false; enhanced.push(a); }
    } catch (e) { /* 读不到就按未开启处理 */ }
  }
  for (const m of moves) {
    const t = targets[m.id];
    if (!t) continue;
    // 已经在目标位置的窗口不必再写：省一次往返，也省一次多余的重绘
    if (m.x === m.cx && m.y === m.cy && m.width === m.cw && m.height === m.ch) continue;
    const w = t.proc.windows[t.i];
    try {
      // 顺序必须是 size → position → size：先挪位置会让大窗悬出屏幕，
      // 随后的 resize 触发 AppKit 跨屏约束、高度被加上 ~57px（macOS 26 实测）。
      // 末尾那次 size 只有放大路径需要（贴底放大时首次 size 同样会被钳）——
      // 平铺基本都是缩小，无条件补发等于白花一次往返和一次可见跳变
      w.size = [m.width, m.height];
      w.position = [m.x, m.y];
      if (m.width > m.cw || m.height > m.ch) w.size = [m.width, m.height];
    } catch (e) {
      notePermission(state, e);
      failed.push(m.id);
    }
  }
  for (const a of enhanced) {
    try { a.value = true; } catch (e) { /* 恢复失败无碍，下次读到 false 也只是不再动画 */ }
  }
  return JSON.stringify({ failed: failed, permissionErrno: state.permissionErrno });
}
`;

export async function applyMoves(moves: WMMove[]): Promise<{ failed: string[] }> {
  if (moves.length === 0) return { failed: [] };
  const raw = await runJXA(APPLY_SCRIPT, JSON.stringify(moves));
  const { failed, permissionErrno } = JSON.parse(raw) as { failed: string[]; permissionErrno: number };
  // 脚本内部的 try/catch 会把权限错误吞成普通失败，osascript 本身照样退出 0。
  // 全军覆没且原因是权限时，把它还原成 AccessibilityError，授权引导才弹得出来。
  if (failed.length === moves.length && isPermissionErrno(permissionErrno)) {
    throw new AccessibilityError(`Accessibility denied (${permissionErrno})`);
  }
  return { failed };
}
