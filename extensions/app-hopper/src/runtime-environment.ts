import fs from "node:fs";
import { platform } from "node:os";
import path from "node:path";
import { usePromise } from "@raycast/utils";
import { nativeHelpers } from "./native-helper-catalog";
import { execBinary, getRaycastPaths } from "./helpers/applescript";
import { resolveNativeHelper, runNativeHelper } from "./helpers/native-helper";

export type RuntimeStatus = {
  kind: "checking" | "ready" | "accessibility" | "developer-tools" | "unsupported" | "error";
};

/** Inspect prerequisites without requesting permissions or installing software. */
export async function checkRuntimeEnvironment(): Promise<RuntimeStatus> {
  if (platform() !== "darwin") return { kind: "unsupported" };
  try {
    const { stdout } = await execBinary("/usr/bin/sw_vers", ["-productVersion"]);
    const version = stdout.trim().split(".").map(Number);
    const minimum = nativeHelpers.minimumMacOS.split(".").map(Number);
    if (!Number.isSafeInteger(version[0])) return { kind: "error" };
    if (version[0] < minimum[0] || (version[0] === minimum[0] && (version[1] ?? 0) < minimum[1])) {
      return { kind: "unsupported" };
    }

    const support = getRaycastPaths().supportPath ?? path.resolve(".raycast-swift-build");
    const needsCompiler = nativeHelpers.helpers.some((helper) => {
      if (helper.name === "firefox-bridge") return false; // The Firefox companion is optional.
      const paths = resolveNativeHelper(helper.name, support);
      return !paths.bundledBinaryPath && !fs.existsSync(paths.binaryPath);
    });
    if (needsCompiler) {
      try {
        await execBinary("/usr/bin/xcode-select", ["--print-path"]);
        await execBinary("/usr/bin/xcrun", ["--find", "swiftc"]);
      } catch {
        return { kind: "developer-tools" };
      }
    }

    const raw = await runNativeHelper("runtime-status", support, []);
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
