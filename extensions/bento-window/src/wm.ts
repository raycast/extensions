// 免 Pro 的窗口后端，实现在 swift/：枚举走 CGWindowList（无需权限），读写走
// AXUIElement 直调（需要给 Raycast 授「辅助功能」权限）。
// 刻意不读 CG 窗口标题——那需要屏幕录制权限；窗口匹配只用 pid + 当前坐标。
import { listState, moveWindows, probeTileable } from "swift:../swift";

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

export async function getState(): Promise<WMState> {
  return (await listState()) as WMState;
}

// 返回候选里真正能被平铺的窗口 id。AX 里对不上号或不可 resize / 移动的一律剔除，
// 它们进网格只会占一个空槽。
export async function getTileable(windows: WMWindow[]): Promise<Set<string>> {
  if (windows.length === 0) return new Set();
  const items = windows.map((w) => ({ id: w.id, pid: w.pid, cx: w.x, cy: w.y, cw: w.width, ch: w.height }));
  const { tileable, trusted } = (await probeTileable(items)) as { tileable: string[]; trusted: boolean };
  // 未授「辅助功能」就别再往下走到布局阶段，直接把授权引导抛出去
  if (!trusted) throw new AccessibilityError("Accessibility permission not granted");
  return new Set(tileable);
}

export async function applyMoves(moves: WMMove[]): Promise<{ failed: string[] }> {
  if (moves.length === 0) return { failed: [] };
  const { failed, trusted } = (await moveWindows(moves)) as { failed: string[]; trusted: boolean };
  if (!trusted) throw new AccessibilityError("Accessibility permission not granted");
  return { failed };
}
