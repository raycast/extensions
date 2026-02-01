import { useExec } from "@raycast/utils";
import { useState, useEffect, useCallback } from "react";
import { execSync } from "child_process";
import { AmpUsage, AmpError } from "./types";
import { parseAmpUsage } from "./parser";

const DEFAULT_AMP_PATH = "/Users/spike/.local/bin/amp";

function detectAmpPath(): string {
  try {
    const result = execSync("which amp", { encoding: "utf-8", timeout: 5000 });
    const path = result.trim();
    if (path) {
      return path;
    }
  } catch {
    // Fallback to default path
  }
  return DEFAULT_AMP_PATH;
}

export function useAmpUsage() {
  const [ampPath, setAmpPath] = useState<string>(DEFAULT_AMP_PATH);
  const [pathDetected, setPathDetected] = useState(false);
  const [shouldExecute, setShouldExecute] = useState(false);
  const [hasInitialFetch, setHasInitialFetch] = useState(false);

  // 检测 amp 路径
  useEffect(() => {
    const detected = detectAmpPath();
    setAmpPath(detected);
    setPathDetected(true);
    // 路径检测完成后，允许首次执行
    setShouldExecute(true);
  }, []);

  const {
    isLoading: execLoading,
    data,
    error: execError,
    revalidate: execRevalidate,
  } = useExec(ampPath, ["usage"], {
    timeout: 10000,
    execute: shouldExecute,
  });

  // 首次加载完成后，标记已完成
  useEffect(() => {
    if (shouldExecute && !execLoading && hasInitialFetch === false) {
      setHasInitialFetch(true);
      // 首次加载完成后，停止自动执行
      setShouldExecute(false);
    }
  }, [shouldExecute, execLoading, hasInitialFetch]);

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
  const error: AmpError | null = parsedError || execAmpError;
  const isLoading = execLoading || !pathDetected || (!hasInitialFetch && !shouldExecute);

  // 重新验证（手动刷新）
  const revalidate = useCallback(async () => {
    setShouldExecute(true);
    await execRevalidate();
    setShouldExecute(false);
  }, [execRevalidate]);

  return {
    isLoading,
    usage,
    error,
    revalidate,
  };
}
