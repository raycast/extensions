import { Action, ActionPanel, Form, getPreferenceValues, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { LocalProject, ProjectScript, TerminalApp } from "../types";
import { buildRunScriptCommand } from "../lib/package-manager";
import { runCommandInTerminal } from "../lib/terminal";
import { ScriptOutputView } from "./ScriptOutputView";

interface RunScriptArgsFormProps {
  project: LocalProject;
  script: ProjectScript;
}

interface RunScriptArgsValues {
  args: string;
  mode: string;
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
  const prefs = getPreferenceValues<Preferences>();
  const terminal = (prefs.preferredTerminal ?? "Terminal") as TerminalApp;

  const { handleSubmit, itemProps, values } = useForm<RunScriptArgsValues>({
    initialValues: {
      args: "",
      mode: script.isLongRunning ? "terminal" : "inline",
    },
    async onSubmit(formValues) {
      const parsedArgs = splitShellArgs(formValues.args);
      const builtCmd = buildRunScriptCommand(project.packageManager, script.name, parsedArgs);

      if (formValues.mode === "terminal") {
        const res = await runCommandInTerminal(project.path, builtCmd, terminal);
        await showToast({
          style: res.launched ? Toast.Style.Success : Toast.Style.Failure,
          title: res.launched ? `Launched in ${terminal}` : "Failed to launch terminal",
          message: res.launched ? builtCmd.display : res.error,
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
    },
  });

  const preview = buildRunScriptCommand(project.packageManager, script.name, splitShellArgs(values.args)).display;

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
        title="Extra Arguments"
        placeholder="e.g. --watch, --port 4000, src/index.ts"
        {...itemProps.args}
      />
      <Form.Dropdown title="Execution Mode" {...itemProps.mode}>
        <Form.Dropdown.Item value="inline" title="Inline Output View (Raycast)" icon={Icon.Document} />
        <Form.Dropdown.Item value="terminal" title={`Open in ${terminal} (Interactive)`} icon={Icon.Terminal} />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description title="Command Preview" text={preview} />
    </Form>
  );
}
