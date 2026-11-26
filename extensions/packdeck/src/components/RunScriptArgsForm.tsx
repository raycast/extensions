import { Action, ActionPanel, Form, getPreferenceValues, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ExtensionPreferences, LocalProject, ProjectScript } from "../types";
import { buildRunScriptCommand } from "../lib/package-manager";
import { runCommandInTerminal } from "../lib/terminal";
import { ScriptOutputView } from "./ScriptOutputView";

interface RunScriptArgsFormProps {
  project: LocalProject;
  script: ProjectScript;
}

function splitShellArgs(raw: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (/\s/.test(ch)) {
      if (current.length > 0) {
        args.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) {
    args.push(current);
  }
  return args;
}

export function RunScriptArgsForm({ project, script }: RunScriptArgsFormProps) {
  const { push, pop } = useNavigation();
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const [argsInput, setArgsInput] = useState("");
  const [runMode, setRunMode] = useState<"inline" | "terminal">(script.isLongRunning ? "terminal" : "inline");

  const parsedArgs = splitShellArgs(argsInput);
  const builtCmd = buildRunScriptCommand(project.packageManager, script.name, parsedArgs);
  const preview = builtCmd.display;

  async function handleSubmit() {
    if (runMode === "terminal") {
      const res = await runCommandInTerminal(project.path, builtCmd, prefs.preferredTerminal ?? "Terminal");
      await showToast({
        style: res.launched ? Toast.Style.Success : Toast.Style.Failure,
        title: res.launched ? `Launched in ${prefs.preferredTerminal ?? "Terminal"}` : "Failed to launch terminal",
        message: res.launched ? preview : res.error,
      });
      if (res.launched) pop();
      return;
    }

    push(
      <ScriptOutputView
        project={project}
        scriptName={script.name}
        scriptCommand={script.command}
        extraArgs={parsedArgs}
      />,
    );
  }

  return (
    <Form
      navigationTitle={`Run "${script.name}" — ${project.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Script" icon={Icon.Play} onSubmit={handleSubmit} />
          <Action.CopyToClipboard title="Copy Command" content={preview} />
        </ActionPanel>
      }
    >
      <Form.Description title="Script" text={`${script.name} → ${script.command}`} />
      <Form.TextField
        id="args"
        title="Extra Arguments"
        placeholder="e.g. --watch, --port 4000, src/index.ts"
        value={argsInput}
        onChange={setArgsInput}
      />
      <Form.Dropdown
        id="mode"
        title="Execution Mode"
        value={runMode}
        onChange={(v) => setRunMode(v as "inline" | "terminal")}
      >
        <Form.Dropdown.Item value="inline" title="Inline Output View (Raycast)" icon={Icon.Document} />
        <Form.Dropdown.Item
          value="terminal"
          title={`Open in ${prefs.preferredTerminal ?? "Terminal"} (Interactive)`}
          icon={Icon.Terminal}
        />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description title="Command Preview" text={preview} />
    </Form>
  );
}
