import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { runHerdr } from "../lib/herdr";
import { parseEnvironment } from "../lib/parsers";
import { runAction } from "../lib/ui";

export function CreateWorkspaceForm({ onDone }: { onDone?: () => void | Promise<void> }) {
  const { pop } = useNavigation();
  const [cwd, setCwd] = useState<string[]>([]);
  const [label, setLabel] = useState("");
  const [environment, setEnvironment] = useState("");
  const [focus, setFocus] = useState(true);

  async function submit() {
    const success = await runAction(
      "Creating workspace",
      async () => {
        const args = ["workspace", "create"];
        if (cwd[0]) args.push("--cwd", cwd[0]);
        if (label.trim()) args.push("--label", label.trim());
        for (const value of parseEnvironment(environment)) args.push("--env", value);
        args.push(focus ? "--focus" : "--no-focus");
        await runHerdr(args);
      },
      { success: "Workspace Created", onSuccess: onDone },
    );
    if (success) pop();
  }

  return (
    <Form
      navigationTitle="Create Workspace"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Workspace" icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="cwd"
        title="Project Directory"
        value={cwd}
        onChange={setCwd}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        autoFocus
      />
      <Form.TextField
        id="label"
        title="Label"
        placeholder="Defaults to the folder name"
        value={label}
        onChange={setLabel}
      />
      <Form.TextArea
        id="environment"
        title="Environment"
        placeholder={"ROLE=development\nPORT=3000"}
        value={environment}
        onChange={setEnvironment}
      />
      <Form.Checkbox id="focus" label="Focus the new workspace" value={focus} onChange={setFocus} />
      <Form.Description text="Creating a workspace also creates its first tab and root terminal pane." />
    </Form>
  );
}
