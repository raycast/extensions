// Pro-free window backend, implemented in swift/: enumeration via CGWindowList (no permission),
// read/write via direct AXUIElement calls (Raycast needs Accessibility permission).
// Deliberately does not read CG window titles — that requires Screen Recording; matching uses pid + current bounds only.
import { listState, moveWindows, probeTileable } from "swift:../swift";

export interface WMWindow {
  id: string; // kCGWindowNumber; stable while the window lives; creation order is monotonic
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
  frame: WMRect; // full screen, CG top-left origin
  visible: WMRect; // usable area excluding menu bar and Dock
}

export interface WMState {
  windows: WMWindow[]; // CG return order; on multi-display setups grouped by Space, not global z-order
  screens: WMScreen[];
  cursor: { x: number; y: number }; // CG top-left origin
}

export interface WMMove {
  id: string;
  pid: number;
  // current bounds, used to locate the window in the AX window list
  cx: number;
  cy: number;
  cw: number;
  ch: number;
  // target bounds
  x: number;
  y: number;
  width: number;
  height: number;
}

export class AccessibilityError extends Error {}

export async function getState(): Promise<WMState> {
  return (await listState()) as WMState;
}

// Returns ids of candidates that can actually be tiled. Unmatched or non-resizable / non-movable
// AX windows are dropped — they would only occupy an empty grid slot.
export async function getTileable(windows: WMWindow[]): Promise<Set<string>> {
  if (windows.length === 0) return new Set();
  const items = windows.map((w) => ({ id: w.id, pid: w.pid, cx: w.x, cy: w.y, cw: w.width, ch: w.height }));
  const { tileable, trusted } = (await probeTileable(items)) as { tileable: string[]; trusted: boolean };
  // Without Accessibility permission, surface the grant prompt instead of continuing to layout
  if (!trusted) throw new AccessibilityError("Accessibility permission not granted");
  return new Set(tileable);
}

export async function applyMoves(moves: WMMove[]): Promise<{ failed: string[] }> {
  if (moves.length === 0) return { failed: [] };
  const { failed, trusted } = (await moveWindows(moves)) as { failed: string[]; trusted: boolean };
  if (!trusted) throw new AccessibilityError("Accessibility permission not granted");
  return { failed };
}
