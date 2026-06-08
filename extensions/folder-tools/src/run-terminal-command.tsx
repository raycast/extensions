import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import React from "react";
import { ResultDetail, prefs, runInTerminal, runShellCapture } from "./lib";

type Values = {
  cwd: string;
  command: string;
  mode: string;
};

export default function Command(props: { draftValues?: Values }) {
  const { push } = useNavigation();
  const p = prefs();
  const draft = props.draftValues;

  async function handleSubmit(values: Values) {
    const cwd = (values.cwd || "").trim();
    const command = (values.command || "").trim();

    if (!cwd || !command) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Working directory and command are required",
      });
      return;
    }

    if (values.mode === "terminal") {
      await runInTerminal(command, cwd);
      return;
    }

    const result = await runShellCapture("terminal command", command, cwd);
    push(<ResultDetail result={result} />);
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run Command"
            icon={Icon.Terminal}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="cwd"
        title="Folder"
        defaultValue={draft?.cwd ?? p.defaultTarget}
      />
      <Form.TextArea
        id="command"
        title="Command"
        placeholder="find . -maxdepth 2 -type f | sort"
        defaultValue={draft?.command}
      />
      <Form.Dropdown
        id="mode"
        title="Mode"
        defaultValue={draft?.mode ?? "terminal"}
      >
        <Form.Dropdown.Item
          value="terminal"
          title="Terminal: same as running it manually"
          icon={Icon.Terminal}
        />
        <Form.Dropdown.Item
          value="raycast"
          title="Raycast: capture output"
          icon={Icon.Window}
        />
      </Form.Dropdown>
    </Form>
  );
}
