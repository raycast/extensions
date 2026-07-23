import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { runHerdr, runInPane } from "../lib/herdr";
import { parseEnvironment } from "../lib/parsers";
import { runAction } from "../lib/ui";

interface DoneProps {
  onDone?: () => void | Promise<void>;
}

export function RenameForm({
  kind,
  id,
  currentName,
  onDone,
}: DoneProps & { kind: "workspace" | "tab" | "pane" | "agent"; id: string; currentName: string }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string>();

  async function submit() {
    const value = name.trim();
    if (!value) {
      setError("Enter a name.");
      return;
    }
    const success = await runAction(
      `Renaming ${kind}`,
      async () => {
        await runHerdr([kind, "rename", id, value]);
      },
      { success: `${kind[0].toUpperCase()}${kind.slice(1)} Renamed`, onSuccess: onDone },
    );
    if (success) pop();
  }

  return (
    <Form
      navigationTitle={`Rename ${kind[0].toUpperCase()}${kind.slice(1)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" icon={Icon.Pencil} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        value={name}
        onChange={(value) => {
          setName(value);
          setError(undefined);
        }}
        error={error}
        autoFocus
      />
    </Form>
  );
}

export function CreateTabForm({ workspaceId, onDone }: DoneProps & { workspaceId: string }) {
  const { pop } = useNavigation();
  const [label, setLabel] = useState("");
  const [cwd, setCwd] = useState<string[]>([]);
  const [environment, setEnvironment] = useState("");
  const [focus, setFocus] = useState(true);

  async function submit() {
    const success = await runAction(
      "Creating tab",
      async () => {
        const args = ["tab", "create", "--workspace", workspaceId];
        if (label.trim()) args.push("--label", label.trim());
        if (cwd[0]) args.push("--cwd", cwd[0]);
        for (const value of parseEnvironment(environment)) args.push("--env", value);
        args.push(focus ? "--focus" : "--no-focus");
        await runHerdr(args);
      },
      { success: "Tab Created", onSuccess: onDone },
    );
    if (success) pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Tab" icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="label"
        title="Label"
        placeholder="agents, logs, review…"
        value={label}
        onChange={setLabel}
        autoFocus
      />
      <Form.FilePicker
        id="cwd"
        title="Working Directory"
        value={cwd}
        onChange={setCwd}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.TextArea
        id="environment"
        title="Environment"
        placeholder={"ROLE=review\nPORT=3000"}
        value={environment}
        onChange={setEnvironment}
      />
      <Form.Checkbox id="focus" label="Focus the new tab" value={focus} onChange={setFocus} />
    </Form>
  );
}

export function SplitPaneForm({ paneId, onDone }: DoneProps & { paneId: string }) {
  const { pop } = useNavigation();
  const [direction, setDirection] = useState("right");
  const [ratio, setRatio] = useState("0.5");
  const [cwd, setCwd] = useState<string[]>([]);
  const [environment, setEnvironment] = useState("");
  const [focus, setFocus] = useState(true);

  async function submit() {
    const numericRatio = Number(ratio);
    if (!Number.isFinite(numericRatio) || numericRatio <= 0.05 || numericRatio >= 0.95) return;
    const success = await runAction(
      "Splitting pane",
      async () => {
        const args = ["pane", "split", paneId, "--direction", direction, "--ratio", String(numericRatio)];
        if (cwd[0]) args.push("--cwd", cwd[0]);
        for (const value of parseEnvironment(environment)) args.push("--env", value);
        args.push(focus ? "--focus" : "--no-focus");
        await runHerdr(args);
      },
      { success: "Pane Split", onSuccess: onDone },
    );
    if (success) pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Split Pane" icon={Icon.Sidebar} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="direction" title="Direction" value={direction} onChange={setDirection}>
        <Form.Dropdown.Item value="right" title="Right" icon={Icon.ArrowRight} />
        <Form.Dropdown.Item value="down" title="Down" icon={Icon.ArrowDown} />
      </Form.Dropdown>
      <Form.Dropdown id="ratio" title="New Pane Size" value={ratio} onChange={setRatio}>
        <Form.Dropdown.Item value="0.333" title="One Third" />
        <Form.Dropdown.Item value="0.5" title="One Half" />
        <Form.Dropdown.Item value="0.667" title="Two Thirds" />
      </Form.Dropdown>
      <Form.FilePicker
        id="cwd"
        title="Working Directory"
        value={cwd}
        onChange={setCwd}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.TextArea
        id="environment"
        title="Environment"
        placeholder={"ROLE=tests\nPORT=3001"}
        value={environment}
        onChange={setEnvironment}
      />
      <Form.Checkbox id="focus" label="Focus the new pane" value={focus} onChange={setFocus} />
    </Form>
  );
}

export function RunCommandForm({ paneId, onDone }: DoneProps & { paneId: string }) {
  const { pop } = useNavigation();
  const [command, setCommand] = useState("");
  const [error, setError] = useState<string>();

  async function submit() {
    const value = command.trim();
    if (!value) {
      setError("Enter a command.");
      return;
    }
    const success = await runAction("Running command", () => runInPane(paneId, value), {
      success: "Command Sent",
      onSuccess: onDone,
    });
    if (success) pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Command" icon={Icon.Terminal} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="command"
        title="Command"
        placeholder="npm test"
        value={command}
        onChange={(value) => {
          setCommand(value);
          setError(undefined);
        }}
        error={error}
        autoFocus
      />
      <Form.Description text="Herdr submits this atomically with Enter and honors bracketed-paste mode." />
    </Form>
  );
}
