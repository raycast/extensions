import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Toast,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { exec, execFile } from "child_process";
import { existsSync } from "fs";
import React from "react";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

export type Workflow =
  | "menu"
  | "status"
  | "recommended"
  | "graphify-detect"
  | "graphify-extract"
  | "graphify-query"
  | "graphify-tree"
  | "understand-dashboard"
  | "understand-info"
  | "brain-up"
  | "brain-prepare"
  | "brain-index"
  | "brain-down";

export type Preferences = {
  upsaDir: string;
  defaultTarget: string;
  terminalApp: "Terminal" | "iTerm";
};

export type CommandResult = {
  title: string;
  command: string;
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type WorkflowOptions = {
  question?: string;
  topic?: string;
  budget?: string;
  open?: boolean;
  yes?: boolean;
  dryRun?: boolean;
};

export const workflows: {
  value: Workflow;
  title: string;
  description: string;
  longRunning?: boolean;
}[] = [
  {
    value: "recommended",
    title: "Recommended",
    description: "Graphify detect, Understand-Anything info y sugerencias.",
  },
  {
    value: "status",
    title: "Status",
    description: "Estado de graphify, Understand-Anything y agent-brain.",
  },
  {
    value: "graphify-detect",
    title: "Graphify Detect",
    description: "Inventario local sin LLM.",
  },
  {
    value: "graphify-extract",
    title: "Graphify Extract",
    description: "Grafo completo HTML/JSON. Puede requerir backend LLM.",
    longRunning: true,
  },
  {
    value: "graphify-query",
    title: "Graphify Query",
    description: "Pregunta sobre graph.json existente.",
  },
  {
    value: "graphify-tree",
    title: "Graphify Tree",
    description: "Genera HTML D3 si existe graph.json.",
  },
  {
    value: "understand-info",
    title: "Understand Info",
    description: "Lista skills Understand-Anything instaladas.",
  },
  {
    value: "understand-dashboard",
    title: "Understand Dashboard",
    description: "Arranca dashboard dev server.",
    longRunning: true,
  },
  {
    value: "brain-up",
    title: "Brain Up",
    description: "Inicializa/arranca agent-brain y Neo4j.",
    longRunning: true,
  },
  {
    value: "brain-prepare",
    title: "Brain Prepare",
    description: "Init + up + index + context pack.",
    longRunning: true,
  },
  {
    value: "brain-index",
    title: "Brain Index",
    description: "Indexa repo en agent-brain/Neo4j.",
    longRunning: true,
  },
  {
    value: "brain-down",
    title: "Brain Down",
    description: "Para servicios agent-brain/Neo4j.",
  },
];

export function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function stackScript(name: string): string {
  return prefs().upsaDir + "/_stack/" + name;
}

export function graphToolsBin(name: string): string {
  return prefs().upsaDir + "/.github-tools/bin/" + name;
}

export function shellEscape(value: string): string {
  return "'" + value.replace(/'/g, "'\"'\"'") + "'";
}

function appleScriptEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function runInTerminal(
  command: string,
  cwd?: string,
): Promise<void> {
  const fullCommand = (cwd ? "cd " + shellEscape(cwd) + " && " : "") + command;
  const escaped = appleScriptEscape(fullCommand);
  const script =
    prefs().terminalApp === "iTerm"
      ? 'tell application "iTerm" to create window with default profile command "' +
        escaped +
        '"'
      : 'tell application "Terminal" to activate\ntell application "Terminal" to do script "' +
        escaped +
        '"';

  await execFileAsync("osascript", ["-e", script]);
  await showToast({
    style: Toast.Style.Success,
    title: "Comando abierto en terminal",
  });
}

export async function runCapture(
  title: string,
  command: string,
  args: string[],
  cwd: string,
): Promise<CommandResult> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Ejecutando " + title,
  });
  try {
    const result = await execFileAsync(command, args, {
      cwd,
      maxBuffer: 1024 * 1024 * 20,
      env: {
        ...process.env,
        PATH:
          prefs().upsaDir + "/.github-tools/bin:" + (process.env.PATH ?? ""),
      },
    });
    toast.style = Toast.Style.Success;
    toast.title = title + " terminado";
    return {
      title,
      command: [command, ...args].join(" "),
      cwd,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
    };
  } catch (error) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
      message?: string;
    };
    toast.style = Toast.Style.Failure;
    toast.title = title + " fallo";
    toast.message = err.message;
    return {
      title,
      command: [command, ...args].join(" "),
      cwd,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message ?? "",
      exitCode: typeof err.code === "number" ? err.code : 1,
    };
  }
}

export async function runShellCapture(
  title: string,
  command: string,
  cwd: string,
): Promise<CommandResult> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Ejecutando " + title,
  });
  try {
    const result = await execAsync(command, {
      cwd,
      shell: process.env.SHELL ?? "/bin/zsh",
      maxBuffer: 1024 * 1024 * 20,
      env: {
        ...process.env,
        PATH:
          prefs().upsaDir + "/.github-tools/bin:" + (process.env.PATH ?? ""),
      },
    });
    toast.style = Toast.Style.Success;
    toast.title = title + " terminado";
    return {
      title,
      command,
      cwd,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
    };
  } catch (error) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
      message?: string;
    };
    toast.style = Toast.Style.Failure;
    toast.title = title + " fallo";
    toast.message = err.message;
    return {
      title,
      command,
      cwd,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message ?? "",
      exitCode: typeof err.code === "number" ? err.code : 1,
    };
  }
}

export function workflowArgs(
  target: string,
  workflow: Workflow,
  options?: WorkflowOptions,
): string[] {
  const args = [target, workflow];
  if (options?.question) args.push("--question", options.question);
  if (options?.topic) args.push("--topic", options.topic);
  if (options?.budget) args.push("--budget", options.budget);
  if (options?.open) args.push("--open");
  if (options?.yes) args.push("--yes");
  if (options?.dryRun) args.push("--dry-run");
  return args;
}

export async function runFolderCapture(
  workflow: Workflow,
  target: string,
  options?: WorkflowOptions,
): Promise<CommandResult> {
  return runCapture(
    "run-folder " + workflow,
    stackScript("run-folder.sh"),
    workflowArgs(target, workflow, options),
    prefs().upsaDir,
  );
}

export async function runFolderTerminal(
  workflow: Workflow,
  target: string,
  options?: WorkflowOptions,
): Promise<void> {
  const args = workflowArgs(target, workflow, options)
    .map(shellEscape)
    .join(" ");
  await runInTerminal(
    shellEscape(stackScript("run-folder.sh")) + " " + args,
    prefs().upsaDir,
  );
}

export function resultMarkdown(result: CommandResult): string {
  return (
    "# " +
    result.title +
    "\n\nExit: " +
    result.exitCode +
    "\n\nCWD: " +
    result.cwd +
    "\n\nCommand:\n\n~~~bash\n" +
    result.command +
    "\n~~~\n\n## Stdout\n\n~~~text\n" +
    (result.stdout || "(sin stdout)") +
    "\n~~~\n\n## Stderr\n\n~~~text\n" +
    (result.stderr || "(sin stderr)") +
    "\n~~~\n"
  );
}

export function ResultDetail({ result }: { result: CommandResult }) {
  const markdown = resultMarkdown(result);
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Output"
            content={result.stdout + "\n" + result.stderr}
          />
          <Action.CopyToClipboard
            title="Copy Command"
            content={result.command}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action
            title="Copy Markdown Report"
            icon={Icon.Clipboard}
            onAction={() => Clipboard.copy(markdown)}
          />
        </ActionPanel>
      }
    />
  );
}

export async function openPath(path: string): Promise<void> {
  if (!existsSync(path)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Ruta no existe",
      message: path,
    });
    return;
  }
  await open(path);
}
