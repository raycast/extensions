// Copied from raycast-window-switcher src/helper.ts on 2026-09-30, unchanged except this header, import paths, and the
// activation mode fixed to "auto" (public activation, private fallback) instead of a preference (owner, 2026-09-30),
// and every call guarded by architectureFailure (arm64-only helper)
// Raycast-side helper access: bundled path, list, focus, quit.
import { environment } from "@raycast/api";
import { join } from "node:path";
import {
  parseFocus,
  parseList,
  parseQuit,
  type FocusResult,
  type QuitResult,
  type Parsed,
  type WindowList,
} from "./lib/window/protocol.ts";
import {
  architectureFailure,
  FOCUS_TIMEOUT_MS,
  LIST_TIMEOUT_MS,
  runHelper as runAnyHelper,
  type RunResult,
} from "./lib/window/run-helper.ts";

export const helperPath = () => join(environment.assetsPath, "window-helper");

function runHelper(path: string, args: string[], timeoutMs: number): Promise<RunResult> {
  return Promise.resolve(architectureFailure(process.arch) ?? runAnyHelper(path, args, timeoutMs));
}

export interface ListOutcome {
  parsed: Parsed<WindowList>;
  raw: string;
}

export async function listWindows(): Promise<ListOutcome> {
  const run = await runHelper(helperPath(), ["list"], LIST_TIMEOUT_MS);
  if (!run.ok) return { parsed: run, raw: `run failed: ${run.failure.kind}: ${run.failure.detail}` };
  return { parsed: parseList(run.stdout), raw: run.stdout };
}

function targetArgs(pid: number, wid: number, bundleId?: string): string[] {
  const args = [String(pid), String(wid)];
  if (bundleId) args.push("--bundle", bundleId);
  return args;
}

export async function focusWindow(pid: number, wid: number, bundleId?: string): Promise<Parsed<FocusResult>> {
  // "auto": public activation first, the private fallback only when the app is not confirmed frontmost. Public
  // activation succeeded in every recorded run on this Mac, so the fallback is a safety net, not a choice to expose.
  const args = ["focus", ...targetArgs(pid, wid, bundleId), "--activation", "auto"];
  const run = await runHelper(helperPath(), args, FOCUS_TIMEOUT_MS);
  return run.ok ? parseFocus(run.stdout) : run;
}

/** Asks the app to quit normally. The bundle ID guards against a reused process ID. */
export async function quitApp(pid: number, bundleId?: string): Promise<Parsed<QuitResult>> {
  const args = ["quit", String(pid)];
  if (bundleId) args.push("--bundle", bundleId);
  const run = await runHelper(helperPath(), args, FOCUS_TIMEOUT_MS);
  return run.ok ? parseQuit(run.stdout) : run;
}
