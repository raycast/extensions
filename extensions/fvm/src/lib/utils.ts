import { Clipboard, Toast } from "@raycast/api";
import { ExecOptions, exec } from "child_process";
import { useEffect, useRef } from "react";
import { shellEnv } from "shell-env";
import { promisify } from "util";

export const execp = promisify(exec);

export function friendlyDate(date: Date | undefined): string {
  if (!date) {
    return "N/A";
  }
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface ActionToastOptions {
  title: string;
  message?: string;
  cancelable: boolean;
}

export interface ExecError extends Error {
  code: number;
  stdout: string;
  stderr: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export function showActionToast(actionOptions: ActionToastOptions): AbortController | undefined {
  const options: Toast.Options = {
    style: Toast.Style.Animated,
    title: actionOptions.title,
    message: actionOptions.message,
  };

  let controller: AbortController | undefined;

  if (actionOptions.cancelable) {
    controller = new AbortController();
    options.primaryAction = {
      title: "Cancel",
      onAction: () => {
        controller?.abort();
        toast.hide();
      },
    };
  }

  const toast = new Toast(options);
  toast.show();
  return controller;
}

export async function showFailureToast(title: string, error: Error): Promise<void> {
  if (error.name == "AbortError") {
    console.log("AbortError");
    return;
  }

  console.log(`${title}: ${error}`);
  const stderr = (error as ExecError).stderr ?? `${error}`;
  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: title,
    message: stderr,
    primaryAction: {
      title: "Copy Error Log",
      onAction: () => {
        Clipboard.copy(stderr);
      },
    },
  };

  const toast = new Toast(options);
  await toast.show();
}

// Wait around until user has had chance to click the Toast action.
// Note this only works for "no view" commands (actions still break when popping a view based command).
// See: https://raycastapp.slack.com/archives/C01E6LWGXJ8/p1642676284027700
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export interface EnvType {
  env: Record<string, string>;
  cwd: string;
  shell: string;
}

let cachedEnv: null | EnvType = null;

export const getCachedEnv = async () => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env = await shellEnv();

  cachedEnv = {
    env: env,
    cwd: env.HOME || `/Users/${process.env.USER}`,
    shell: env.SHELL,
  };

  return cachedEnv;
};

export type ExecHandler = {
  onStdout: (data: string) => void;
  onStderr: (data: string) => void;
};

export function execAsync(
  command: string,
  handler: ExecHandler,
  options?: ExecOptions & { encoding: "utf8" },
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = exec(command, { ...options, encoding: "utf8" });
    const result: ExecResult = { stdout: "", stderr: "" };

    child.stdout?.on("data", (data) => {
      console.debug("stdout:", data);
      handler?.onStdout?.(data);
      result.stdout += data;
    });

    child.stderr?.on("data", (data) => {
      console.error("stderr:", data);
      handler?.onStderr?.(data);
      result.stderr += data;
    });

    child.on("exit", () => resolve(result));

    child.on("error", (error) => reject(error));
  });
}

export const convertCommandOutput = (output: string): string => {
  return "```bash\n" + output + "\n```";
};

interface UseLogPropertyChangesProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Enhancing the hook with TypeScript
export const useLogPropertyChanges = (props: UseLogPropertyChangesProps) => {
  const prevProps = useRef<UseLogPropertyChangesProps>(props);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const changedProps: { [key: string]: { from: any; to: any } } = Object.entries(props).reduce(
      (acc, [key, value]) => {
        if (prevProps.current[key] !== value) {
          (acc as UseLogPropertyChangesProps)[key] = { from: prevProps.current[key], to: value };
        }
        return acc;
      },
      {},
    );

    if (Object.keys(changedProps).length > 0) {
      console.log("Changed properties:", changedProps);
    }

    prevProps.current = props;
  }, [props]); // This depends on props, so it re-runs when props change
};

export class AsyncLock {
  private locked: boolean;
  private queue: (() => void)[];

  constructor() {
    this.locked = false;
    this.queue = [];
  }

  async acquire(): Promise<void> {
    if (this.locked) {
      await new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }
    this.locked = true;
  }

  release(): void {
    if (!this.locked) {
      throw new Error("Lock is not acquired");
    }
    this.locked = false;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}
