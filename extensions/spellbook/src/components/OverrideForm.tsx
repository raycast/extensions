import { useMemo, useState } from "react";

import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  showHUD,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";

import { effectiveValues, parseTemplate, substitute } from "../lib/parser";
import type { SavedCommand } from "../lib/types";
import type { LastAction } from "../lib/usage";
import { performRun } from "./runCommand";

interface OverrideFormProps {
  command: SavedCommand;
  lastValues?: Record<string, string>;
  focusParam?: string;
  onUsed?: (action: LastAction, values: Record<string, string>) => void;
}

export default function OverrideForm(props: OverrideFormProps) {
  const { command, lastValues, focusParam, onUsed } = props;

  const { push } = useNavigation();
  const params = useMemo(
    () => parseTemplate(command.template),
    [command.template],
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    effectiveValues(params, lastValues),
  );

  const focusName = useMemo(() => {
    if (focusParam !== undefined) {
      return focusParam;
    }
    const firstRequired = params.find(
      (param) => param.defaultValue === undefined,
    );
    return (firstRequired ?? params[0])?.name;
  }, [focusParam, params]);

  const { command: resolved, missing } = useMemo(
    () => substitute(command.template, values),
    [command.template, values],
  );

  const setValue = (name: string, value: string) => {
    setValues((previous) => ({ ...previous, [name]: value }));
  };

  const showMissingToast = async () => {
    await showToast({
      style: Toast.Style.Failure,
      title: "Missing required parameters",
      message: missing.join(", "),
    });
  };

  const handleRun = async () => {
    if (missing.length > 0) {
      await showMissingToast();
      return;
    }
    await performRun({
      command,
      resolved,
      push,
      onWillRun: () => onUsed?.("run", values),
    });
  };

  const handleCopy = async () => {
    if (missing.length > 0) {
      await showMissingToast();
      return;
    }
    await Clipboard.copy(resolved);
    onUsed?.("copy", values);
    await showHUD("Copied to clipboard");
  };

  const handlePaste = async () => {
    if (missing.length > 0) {
      await showMissingToast();
      return;
    }
    onUsed?.("paste", values);
    await closeMainWindow();
    await Clipboard.paste(resolved);
  };

  return (
    <Form
      navigationTitle={command.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run" onSubmit={() => void handleRun()} />
          <Action
            title="Copy Command"
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={() => void handleCopy()}
          />
          <Action
            title="Paste to Frontmost App"
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={() => void handlePaste()}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Will run"
        text={missing.length > 0 ? `Missing: ${missing.join(", ")}` : resolved}
      />
      {params.map((param) =>
        param.options ? (
          <Form.Dropdown
            key={param.name}
            id={param.name}
            title={param.name}
            value={values[param.name] ?? ""}
            onChange={(value) => setValue(param.name, value)}
          >
            {param.options.map((option) => (
              <Form.Dropdown.Item key={option} value={option} title={option} />
            ))}
          </Form.Dropdown>
        ) : (
          <Form.TextField
            key={param.name}
            id={param.name}
            title={param.name}
            placeholder={param.defaultValue ?? "required"}
            value={values[param.name] ?? ""}
            onChange={(value) => setValue(param.name, value)}
            autoFocus={param.name === focusName}
          />
        ),
      )}
    </Form>
  );
}
