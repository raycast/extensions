import { execFile } from "child_process";
import { promisify } from "util";
import { Cache } from "@raycast/api";

const exec = promisify(execFile);
const cache = new Cache();
const CACHE_KEY = "mac-info";

export type MacInfo = {
  /** Marketing name, e.g. "MacBook Pro". */
  name: string;
  /** e.g. "Apple M5 Pro" or an Intel CPU string. */
  chip: string | null;
  /** Model identifier, e.g. "Mac17,9". */
  model: string | null;
};

/**
 * Identify this Mac.
 *
 * Asks macOS rather than consulting a table of models: the fan count always
 * comes from the SMC's own FNum key (see readSmc), which is correct for every
 * Mac including fanless MacBook Airs and machines newer than this extension.
 * A hardcoded catalogue of SKUs would go stale and be wrong for anything
 * missing from it.
 */
export async function getMacInfo(): Promise<MacInfo> {
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as MacInfo;
    } catch {
      /* fall through and re-read */
    }
  }

  const info: MacInfo = { name: "Mac", chip: null, model: null };
  try {
    const { stdout } = await exec("/usr/sbin/system_profiler", ["SPHardwareDataType", "-json"], {
      timeout: 8000,
      maxBuffer: 4 * 1024 * 1024,
    });
    const hw = JSON.parse(stdout)?.SPHardwareDataType?.[0] ?? {};
    if (typeof hw.machine_name === "string") info.name = hw.machine_name;
    if (typeof hw.chip_type === "string") info.chip = hw.chip_type;
    else if (typeof hw.cpu_type === "string") info.chip = hw.cpu_type;
    if (typeof hw.machine_model === "string") info.model = hw.machine_model;
  } catch {
    // Fall back to sysctl, which is always available even if slower to read.
    try {
      const [{ stdout: model }, { stdout: chip }] = await Promise.all([
        exec("/usr/sbin/sysctl", ["-n", "hw.model"]),
        exec("/usr/sbin/sysctl", ["-n", "machdep.cpu.brand_string"]),
      ]);
      info.model = model.trim() || null;
      info.chip = chip.trim() || null;
    } catch {
      /* keep the generic defaults */
    }
  }

  cache.set(CACHE_KEY, JSON.stringify(info));
  return info;
}

/** "MacBook Pro · Apple M5 Pro · 2 fans" */
export function describeMac(info: MacInfo, fanCount: number): string {
  const fans = fanCount === 0 ? "no controllable fans" : `${fanCount} fan${fanCount === 1 ? "" : "s"}`;
  return [info.name, info.chip, fans].filter(Boolean).join(" · ");
}
