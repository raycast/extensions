import { Toast, showToast } from "@raycast/api";
import { exec as execCallback } from "child_process";
import os from "os";
import path from "path";
import { promisify } from "util";
const exec = promisify(execCallback);

export const WARP_DB = path.resolve(os.homedir(), "Library/Application Support/dev.warp.Warp-Stable/warp.sqlite");
export const WORKFLOW_QUERY = `SELECT id, data FROM workflows`;
export const EXTENSION_URI = "raycast://extensions/warpdotdev/warp";

export interface Workflow {
  id: number;
  name: string;
  description: string | null;
  command: string;
  arguments: WorkflowArgument[];
}

export interface WorkflowArgument {
  name: string;
  description: string | null;
  default_value: string | null;
}

export interface WorkflowLaunchContext {
  id: number;
  values?: Record<string, string>;
}

export const showError = async (title: string, message: string) => {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
  });
};

export const executeShellCommand = async (command: string) => {
  let stdout = "",
    stderr = "";
  try {
    const result = await exec(`source ~/.zshrc && ${command}`, {
      shell: "/bin/zsh",
      env: {
        ZDOTDIR: os.homedir(),
      },
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error: any) {
    stderr = error.message;
  }

  return { stdout, stderr };
};
