import { Toast, showToast } from "@raycast/api";
import { ExecOptions } from "child_process";
import { useCallback, useMemo, useState } from "react";
import { ensureCLI } from "./ensure-cli";
import {
  ExecError,
  ExecHandler,
  ExecResult,
  execAsync,
  getCachedEnv,
  showActionToast,
  showFailureToast,
} from "./utils";

export enum FvmCommand {
  list = "list",
  releases = "releases",
  context = "context",
}

type FvmExecOptions = Pick<ExecOptions, "timeout" | "signal" | "cwd">;

export async function execFvm(cmd: string, handlers?: ExecHandler, options?: FvmExecOptions): Promise<ExecResult> {
  const defaultHandlers = { onStdout: (data: string) => data, onStderr: (data: string) => data };
  try {
    const fvmCli = await ensureCLI();
    const env = await getCachedEnv();
    return await execAsync(`"${fvmCli}" ${cmd}`, handlers ?? defaultHandlers, { encoding: "utf8", ...options, ...env });
  } catch (err) {
    throw err as ExecError;
  }
}

export type FVMRunner = ReturnType<typeof useFvmRunner>;

export const useFvmRunner = () => {
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const clearOutput = useCallback(() => {
    setStdout("");
    setStderr("");
  }, []);

  const handlers = useMemo(() => {
    return {
      onStdout: (data: string) => setStdout((prev) => prev + data),
      onStderr: (data: string) => setStderr((prev) => prev + data),
    };
  }, []);

  const setup = useCallback(async (version: string) => {
    try {
      clearOutput();
      setIsRunning(true);
      const abort = showActionToast({ title: `Setting up ${version}`, cancelable: true });
      await execFvm(`install ${version} --setup`, handlers, { signal: abort?.signal });
      showToast(Toast.Style.Success, "Setup completed");
    } catch (err) {
      await showFailureToast("Setup failed", err as Error);
    } finally {
      setIsRunning(false);
    }
  }, []);

  const install = useCallback(async (version: string) => {
    try {
      clearOutput();
      setIsRunning(true);
      const abort = showActionToast({ title: `Installing ${version}`, cancelable: true });

      await execFvm(`install ${version}`, handlers, { signal: abort?.signal });

      showToast(Toast.Style.Success, "Install completed");
    } catch (err) {
      await showFailureToast("Install failed", err as Error);
    } finally {
      setIsRunning(false);
    }
  }, []);

  const remove = useCallback(async (version: string) => {
    try {
      clearOutput();
      setIsRunning(true);
      const abort = showActionToast({ title: `Removing ${version}`, cancelable: false });
      await execFvm(`remove ${version}`, handlers, { signal: abort?.signal });
      showToast(Toast.Style.Success, "Removal completed");
    } catch (err) {
      await showFailureToast("Removal failed", err as Error);
    } finally {
      setIsRunning(false);
    }
  }, []);

  return {
    setup,
    install,
    remove,
    stdout,
    stderr,
    isRunning,
  };
};
