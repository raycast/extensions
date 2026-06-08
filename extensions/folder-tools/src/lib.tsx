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
import { homedir } from "os";
import { basename } from "path";
import React from "react";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

export type Workflow =
  | "status"
  | "recommended"
  | "graphify-detect"
  | "graphify-extract"
  | "graphify-query"
  | "graphify-tree"
  | "understand-info"
  | "understand-dashboard"
  | "brain-up"
  | "brain-prepare"
  | "brain-index"
  | "brain-down";

export type Preferences = {
  toolsRoot: string;
  defaultTarget: string;
  neo4jUrl?: string;
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
  openResult?: boolean;
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
    description: "Quick inventory and tool status check.",
  },
  {
    value: "status",
    title: "Status",
    description: "Check graphify, Understand-Anything and agent-brain.",
  },
  {
    value: "graphify-detect",
    title: "Graphify Detect",
    description: "Create a local inventory without using an LLM.",
  },
  {
    value: "graphify-extract",
    title: "Graphify Extract",
    description:
      "Generate graph.json plus HTML/JSON outputs. May require an LLM backend.",
    longRunning: true,
  },
  {
    value: "graphify-query",
    title: "Graphify Query",
    description:
      "Ask questions about an existing graphify-out/graph.json file.",
  },
  {
    value: "graphify-tree",
    title: "Graphify Tree",
    description:
      "Generate graphify-out/GRAPH_TREE.html when graph.json exists.",
  },
  {
    value: "understand-info",
    title: "Understand Info",
    description: "List available Understand-Anything skills.",
  },
  {
    value: "understand-dashboard",
    title: "Understand Dashboard",
    description: "Start the Understand-Anything dashboard.",
    longRunning: true,
  },
  {
    value: "brain-up",
    title: "Brain Up",
    description: "Initialize and start agent-brain/Neo4j.",
    longRunning: true,
  },
  {
    value: "brain-prepare",
    title: "Brain Prepare",
    description: "Prepare agent-brain context for a topic.",
    longRunning: true,
  },
  {
    value: "brain-index",
    title: "Brain Index",
    description: "Index the selected folder or repository in agent-brain.",
    longRunning: true,
  },
  {
    value: "brain-down",
    title: "Brain Down",
    description: "Stop agent-brain/Neo4j services.",
  },
];

export function expandPath(value: string): string {
  if (value === "~") return homedir();
  if (value.startsWith("~/")) return homedir() + value.slice(1);
  return value;
}

export function prefs(): Preferences {
  const raw = getPreferenceValues<Preferences>();
  return {
    ...raw,
    toolsRoot: expandPath(raw.toolsRoot),
    defaultTarget: expandPath(raw.defaultTarget),
  };
}

export function binPath(name: string): string {
  return prefs().toolsRoot + "/bin/" + name;
}

export function graphifyPython(): string {
  return prefs().toolsRoot + "/venvs/graphify/bin/python";
}

export function understandRepo(): string {
  return prefs().toolsRoot + "/src/Understand-Anything";
}

export function shellEscape(value: string): string {
  return "'" + value.replace(/'/g, "'\"'\"'") + "'";
}

function appleScriptEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function withToolsPath(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: prefs().toolsRoot + "/bin:" + (process.env.PATH ?? ""),
  };
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
    title: "Command opened in terminal",
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
    title: "Running " + title,
  });
  try {
    const result = await execFileAsync(command, args, {
      cwd,
      maxBuffer: 1024 * 1024 * 20,
      env: withToolsPath(),
    });
    toast.style = Toast.Style.Success;
    toast.title = title + " finished";
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
    toast.title = title + " failed";
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
    title: "Running " + title,
  });
  try {
    const result = await execAsync(command, {
      cwd,
      shell: process.env.SHELL ?? "/bin/zsh",
      maxBuffer: 1024 * 1024 * 20,
      env: withToolsPath(),
    });
    toast.style = Toast.Style.Success;
    toast.title = title + " finished";
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
    toast.title = title + " failed";
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

function graphifyDetectCode(): string {
  return [
    "import json, sys",
    "from pathlib import Path",
    "root = Path(sys.argv[1]).expanduser().resolve()",
    "out_dir = root / 'graphify-out'",
    "out_file = out_dir / '.graphify_detect.json'",
    "report_file = out_dir / 'GRAPHIFY_DETECT_REPORT.md'",
    "out_dir.mkdir(parents=True, exist_ok=True)",
    "from graphify.detect import detect",
    "result = detect(root)",
    "out_file.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')",
    "kinds = {k: len(v) for k, v in result.get('files', {}).items() if v}",
    "report_file.write_text('# Graphify detect report\\n\\n- Root: ' + str(root) + '\\n- Files: ' + str(result.get('total_files')) + '\\n- Words: ' + str(result.get('total_words')) + '\\n- Kinds: ' + str(kinds) + '\\n', encoding='utf-8')",
    "print(json.dumps({'root': str(root), 'files': result.get('total_files'), 'words': result.get('total_words'), 'kinds': kinds, 'report': str(report_file)}, ensure_ascii=False, indent=2))",
  ].join("\n");
}

export async function runGraphifyDetect(
  target: string,
): Promise<CommandResult> {
  return runCapture(
    "graphify detect",
    graphifyPython(),
    ["-c", graphifyDetectCode(), target],
    target,
  );
}

export async function runGraphifyExtract(
  target: string,
): Promise<CommandResult> {
  return runCapture(
    "graphify extract",
    binPath("graphify"),
    ["extract", target, "--out", target],
    target,
  );
}

export async function runGraphifyQuery(
  target: string,
  question?: string,
): Promise<CommandResult> {
  const graph = target + "/graphify-out/graph.json";
  if (!existsSync(graph)) {
    return {
      title: "graphify query",
      command: binPath("graphify") + " query",
      cwd: target,
      stdout: "",
      stderr: graph + " does not exist. Run Graphify Extract first.",
      exitCode: 1,
    };
  }
  return runCapture(
    "graphify query",
    binPath("graphify"),
    [
      "query",
      question || "Summarize this folder and tell me what to review first.",
      "--graph",
      graph,
    ],
    target,
  );
}

export async function runGraphifyTree(
  target: string,
  openResult?: boolean,
): Promise<CommandResult> {
  const graph = target + "/graphify-out/graph.json";
  const html = target + "/graphify-out/GRAPH_TREE.html";
  if (!existsSync(graph)) {
    return {
      title: "graphify tree",
      command: binPath("graphify") + " tree",
      cwd: target,
      stdout: "",
      stderr: graph + " does not exist. Run Graphify Extract first.",
      exitCode: 1,
    };
  }
  const result = await runCapture(
    "graphify tree",
    binPath("graphify"),
    [
      "tree",
      "--graph",
      graph,
      "--output",
      html,
      "--root",
      target,
      "--label",
      basename(target),
    ],
    target,
  );
  if (openResult && result.exitCode === 0 && existsSync(html)) {
    await open(html);
  }
  return result;
}

export async function runUnderstandInfo(
  target: string,
): Promise<CommandResult> {
  const skills = understandRepo() + "/understand-anything-plugin/skills";
  const command =
    "printf 'Understand-Anything repo: " +
    shellEscape(understandRepo()) +
    "\\n\\nSkills:\\n' && find " +
    shellEscape(skills) +
    " -mindepth 1 -maxdepth 1 -type d -print 2>/dev/null | sort";
  return runShellCapture("understand info", command, target);
}

export async function runStatus(target: string): Promise<CommandResult> {
  const command =
    "printf 'Tools root: " +
    shellEscape(prefs().toolsRoot) +
    "\\nTarget: " +
    shellEscape(target) +
    "\\n\\n' && " +
    "test -x " +
    shellEscape(binPath("graphify")) +
    " && echo 'graphify: OK' || echo 'graphify: missing'; " +
    "test -x " +
    shellEscape(binPath("agent-brain")) +
    " && echo 'agent-brain: OK' || echo 'agent-brain: missing'; " +
    "test -d " +
    shellEscape(understandRepo()) +
    " && echo 'Understand-Anything: OK' || echo 'Understand-Anything: missing'; " +
    shellEscape(binPath("agent-brain")) +
    " doctor 2>&1 || true";
  return runShellCapture("folder tools status", command, target);
}

export async function runBrainDown(target: string): Promise<CommandResult> {
  return runCapture("brain down", binPath("agent-brain"), ["down"], target);
}

export async function runWorkflowCapture(
  workflow: Workflow,
  target: string,
  options?: WorkflowOptions,
): Promise<CommandResult> {
  if (workflow === "status") return runStatus(target);
  if (workflow === "recommended") return runGraphifyDetect(target);
  if (workflow === "graphify-detect") return runGraphifyDetect(target);
  if (workflow === "graphify-extract") return runGraphifyExtract(target);
  if (workflow === "graphify-query") {
    return runGraphifyQuery(target, options?.question);
  }
  if (workflow === "graphify-tree") {
    return runGraphifyTree(target, options?.openResult);
  }
  if (workflow === "understand-info") return runUnderstandInfo(target);
  if (workflow === "brain-down") return runBrainDown(target);
  return runShellCapture(
    workflow,
    buildWorkflowCommand(workflow, target, options),
    target,
  );
}

export function buildWorkflowCommand(
  workflow: Workflow,
  target: string,
  options?: WorkflowOptions,
): string {
  if (workflow === "status") return "echo status";
  if (workflow === "recommended") {
    return (
      shellEscape(graphifyPython()) +
      " -c " +
      shellEscape(graphifyDetectCode()) +
      " " +
      shellEscape(target)
    );
  }
  if (workflow === "graphify-detect") {
    return (
      shellEscape(graphifyPython()) +
      " -c " +
      shellEscape(graphifyDetectCode()) +
      " " +
      shellEscape(target)
    );
  }
  if (workflow === "graphify-extract") {
    return (
      shellEscape(binPath("graphify")) +
      " extract " +
      shellEscape(target) +
      " --out " +
      shellEscape(target)
    );
  }
  if (workflow === "graphify-query") {
    return (
      shellEscape(binPath("graphify")) +
      " query " +
      shellEscape(
        options?.question ||
          "Summarize this folder and tell me what to review first.",
      ) +
      " --graph " +
      shellEscape(target + "/graphify-out/graph.json")
    );
  }
  if (workflow === "graphify-tree") {
    return (
      shellEscape(binPath("graphify")) +
      " tree --graph " +
      shellEscape(target + "/graphify-out/graph.json") +
      " --output " +
      shellEscape(target + "/graphify-out/GRAPH_TREE.html") +
      " --root " +
      shellEscape(target) +
      " --label " +
      shellEscape(basename(target))
    );
  }
  if (workflow === "understand-info") {
    return (
      "find " +
      shellEscape(understandRepo() + "/understand-anything-plugin/skills") +
      " -mindepth 1 -maxdepth 1 -type d -print"
    );
  }
  if (workflow === "understand-dashboard") {
    return (
      "cd " +
      shellEscape(understandRepo()) +
      " && (pnpm dev:dashboard || npm run dev:dashboard)"
    );
  }
  if (workflow === "brain-up") {
    return (
      shellEscape(binPath("agent-brain")) +
      " init && " +
      shellEscape(binPath("agent-brain")) +
      " up && " +
      shellEscape(binPath("agent-brain")) +
      " doctor"
    );
  }
  if (workflow === "brain-prepare") {
    return (
      shellEscape(binPath("agent-brain")) +
      " prepare --topic " +
      shellEscape(options?.topic || "Analyze folder") +
      " --budget " +
      shellEscape(options?.budget || "normal") +
      " --fast"
    );
  }
  if (workflow === "brain-index") {
    return (
      shellEscape(binPath("agent-brain")) +
      " index --repo " +
      shellEscape(target)
    );
  }
  return shellEscape(binPath("agent-brain")) + " down";
}

export async function runWorkflowTerminal(
  workflow: Workflow,
  target: string,
  options?: WorkflowOptions,
): Promise<void> {
  await runInTerminal(buildWorkflowCommand(workflow, target, options), target);
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
    (result.stdout || "(no stdout)") +
    "\n~~~\n\n## Stderr\n\n~~~text\n" +
    (result.stderr || "(no stderr)") +
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
      title: "Path does not exist",
      message: path,
    });
    return;
  }
  await open(path);
}
