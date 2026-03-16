import { useExec } from "@raycast/utils";
import { useState, useEffect, useCallback } from "react";
import { execFile } from "child_process";
import { promisify } from "util";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { AmpUsage, AmpError } from "./types";
import { parseAmpUsage } from "./parser";

const execFileAsync = promisify(execFile);

async function detectAmpPath(): Promise<string> {
  // Try PATH first using 'which' (macOS/Linux) or 'where' (Windows)
  const isWindows = process.platform === "win32";
  const command = isWindows ? "where" : "which";

  try {
    const { stdout } = await execFileAsync(command, ["amp"], { encoding: "utf-8", timeout: 5000 });
    const detectedPath = stdout.trim().split("\n")[0]; // 'where' may return multiple lines
    if (detectedPath && fs.existsSync(detectedPath)) {
      return detectedPath;
    }
  } catch {
    // Command failed, try common locations
  }

  // Fallback to common installation paths
  const homeDir = os.homedir();
  const commonPaths = isWindows
    ? [
        path.join(homeDir, ".local", "bin", "amp.exe"),
        path.join(homeDir, "AppData", "Local", "Programs", "amp", "amp.exe"),
      ]
    : [path.join(homeDir, ".local", "bin", "amp"), "/usr/local/bin/amp", "/opt/homebrew/bin/amp"];

  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Last resort: rely on PATH
  return "amp";
}

export function useAmpUsage(enabled = true) {
  const [ampPath, setAmpPath] = useState<string>("amp");
  const [pathDetected, setPathDetected] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);
  const [hasInitialFetch, setHasInitialFetch] = useState(false);

  useEffect(() => {
    if (enabled) {
      return;
    }

    // Reset execution state when Amp is disabled.
    setPathDetected(false);
    setHasInitialFetch(false);
  }, [enabled]);

  // 检测 amp 路径
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const detected = await detectAmpPath();
      if (cancelled) return;

      setAmpPath(detected);
      setPathDetected(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const {
    isLoading: execLoading,
    data,
    error: execError,
    revalidate: execRevalidate,
  } = useExec(ampPath, ["usage"], {
    timeout: 10000,
    execute: enabled,
  });

  // 首次加载完成后，标记已完成
  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!execLoading && hasInitialFetch === false) {
      setHasInitialFetch(true);
    }
  }, [enabled, execLoading, hasInitialFetch]);

  const parsedResult = data ? parseAmpUsage(data) : { usage: null, error: null };
  const usage: AmpUsage | null = parsedResult.usage;
  const parsedError: AmpError | null = parsedResult.error;

  // 处理 execError，转换为 AmpError 类型
  const execAmpError: AmpError | null = execError
    ? {
        type: "unknown" as const,
        message: execError instanceof Error ? execError.message : "Unknown error",
      }
    : null;

  // 合并解析错误和执行错误
  const error: AmpError | null = enabled ? parsedError || execAmpError : null;
  const isLoading = enabled ? execLoading || !pathDetected || !hasInitialFetch : false;

  // 重新验证（手动刷新）
  const revalidate = useCallback(async () => {
    if (!enabled) {
      return;
    }
    setFetchKey((k) => k + 1);
    await execRevalidate();
  }, [enabled, execRevalidate]);

  return {
    isLoading,
    usage: enabled ? usage : null,
    error,
    revalidate,
    fetchKey,
  };
}
