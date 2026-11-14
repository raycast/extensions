import { platform } from "node:os";
import { usePromise } from "@raycast/utils";
import { minimumMacOS } from "./native-config";
import { execBinary } from "./helpers/applescript";
import { runNativeHelper } from "./helpers/native-helper";

export type RuntimeStatus = {
  kind: "checking" | "ready" | "accessibility" | "unsupported" | "error";
};

/** Inspect prerequisites without requesting permissions or installing software. */
export async function checkRuntimeEnvironment(): Promise<RuntimeStatus> {
  if (platform() !== "darwin") return { kind: "unsupported" };
  try {
    const { stdout } = await execBinary("/usr/bin/sw_vers", ["-productVersion"]);
    const version = stdout.trim().split(".").map(Number);
    const minimum = minimumMacOS.split(".").map(Number);
    if (!Number.isSafeInteger(version[0])) return { kind: "error" };
    if (version[0] < minimum[0] || (version[0] === minimum[0] && (version[1] ?? 0) < minimum[1])) {
      return { kind: "unsupported" };
    }

    const raw = await runNativeHelper("runtime-status", []);
    const status: unknown = JSON.parse(raw);
    if (!status || typeof status !== "object" || !("accessibility" in status)) return { kind: "error" };
    if (status.accessibility === true) return { kind: "ready" };
    if (status.accessibility === false) return { kind: "accessibility" };
    return { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}

export function useRuntimeEnvironment() {
  // Permission can change between command launches. Never reuse a cached "ready" state.
  const { data, error, isLoading, revalidate } = usePromise(checkRuntimeEnvironment, []);
  const status: RuntimeStatus = isLoading
    ? { kind: "checking" }
    : error
      ? { kind: "error" }
      : (data ?? { kind: "checking" });
  return { status, revalidate };
}
