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

interface Marker {
  index: number;
  variable: string;
}

export const getWorkflowMarkers = (workflow: Workflow): Marker[] => {
  const command = workflow.command;
  const markers = workflow.arguments.flatMap((arg) => {
    const matches = [...command.matchAll(new RegExp(`{{${arg.name}}}`, "g"))];
    return matches.map((m) => ({ index: m.index!, variable: arg.name }));
  });

  return markers.sort((a, b) => a.index - b.index);
};

export const fillWorkflowCommand = (command: string, markers: Marker[], values: Record<string, string>) => {
  return markers.length > 0
    ? markers.reduce((text, marker, i) => {
        const { index, variable } = marker;
        const value = values[variable] || `{{${variable}}}`;
        const after = command.slice(index + variable.length + 4, markers[i + 1]?.index);
        return text + value + after;
      }, command.slice(0, markers[0].index))
    : command;
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
