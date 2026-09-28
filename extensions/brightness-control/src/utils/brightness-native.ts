import { platform } from "os";
import { brightness_adjust, brightness_get, brightness_set } from "rust:../../rust";
import type { MonitorResult } from "./ddc-ci";

/**
 * Native Windows brightness backend.
 *
 * Calls the Rust binary in `rust/` (WMI + DDC/CI via dxva2, no new processes,
 * no C# compilation — ~40ms vs ~2s for the PowerShell path). macOS never
 * reaches this code (`platform.ts` routes darwin to Lunar), and the Rust crate
 * compiles to a stub on non-Windows so dual-platform builds keep working.
 *
 * The `rust:` bindings' types are auto-generated into `raycast-env.d.ts` by
 * `ray build` — no hand-written declarations needed.
 *
 * Every helper returns `null` when native is unavailable/failed so callers can
 * fall back to the PowerShell implementation in `ddc-ci.ts`.
 */

const isWindows = platform() === "win32";

async function tryNative(call: () => Promise<MonitorResult[]>): Promise<MonitorResult[] | null> {
  if (!isWindows) return null;
  try {
    const result = await call();
    if (!Array.isArray(result)) return null;
    return result;
  } catch (error) {
    console.warn("Native brightness backend failed, falling back to PowerShell:", error);
    return null;
  }
}

export async function nativeGetBrightness(): Promise<MonitorResult[] | null> {
  return tryNative(() => brightness_get());
}

export async function nativeSetBrightness(level: number): Promise<MonitorResult[] | null> {
  return tryNative(() => brightness_set(level));
}

export async function nativeAdjustBrightness(offset: number): Promise<MonitorResult[] | null> {
  return tryNative(() => brightness_adjust(offset));
}
