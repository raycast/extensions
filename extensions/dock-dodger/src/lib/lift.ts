import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { type Move, type Rect, type Screen, type WindowInfo, parseIgnoredApps, planMoves } from "./geometry";
import { SCAN_SCRIPT, applyScript } from "./scripts";

type Scan = { screens: Screen[]; windows: WindowInfo[]; dock: Rect | null };

export type LiftResult = { planned: Move[]; ok: number; failed: string[] };

function readPrefs() {
  const p = getPreferenceValues<Preferences>();
  const margin = Number.parseFloat(p.margin);
  return {
    margin: Number.isFinite(margin) ? margin : 8,
    shrink: p.shrink ?? true,
    ignoredApps: parseIgnoredApps(p.ignoredApps),
  };
}

export async function liftWindows(): Promise<LiftResult> {
  const raw = await runAppleScript(SCAN_SCRIPT, { language: "JavaScript", timeout: 15000 });
  const scan = JSON.parse(raw) as Scan;
  const planned = planMoves(scan.screens, scan.windows, scan.dock, readPrefs());
  if (planned.length === 0) return { planned, ok: 0, failed: [] };

  const res = JSON.parse(await runAppleScript(applyScript(planned), { language: "JavaScript", timeout: 30000 })) as {
    ok: number;
    failed: string[];
  };
  return { planned, ...res };
}

const AUTOMATION_ERROR = /-1743|not authori[sz]ed to send apple events/i;
const ACCESSIBILITY_ERROR = /-1719|-25211|assistive access|accessibility/i;

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function isPermissionError(error: unknown): boolean {
  const msg = message(error);
  return AUTOMATION_ERROR.test(msg) || ACCESSIBILITY_ERROR.test(msg);
}

export function friendlyError(error: unknown): string {
  const msg = message(error);
  if (AUTOMATION_ERROR.test(msg)) {
    return "Allow Raycast to control System Events (Privacy & Security > Automation)";
  }
  if (ACCESSIBILITY_ERROR.test(msg)) {
    return "Give Raycast Accessibility access (Privacy & Security > Accessibility)";
  }
  return `Dock Dodger failed: ${msg.split("\n")[0].slice(0, 120)}`;
}
