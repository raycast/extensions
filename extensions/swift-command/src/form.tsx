import { useState, useEffect } from "react";
import { Arg } from "./datasource";
import { Action, ActionPanel, Form, useNavigation, Clipboard, Image, Icon } from "@raycast/api";
import { getArguments, getNewArguments, replaceArgumentPlaceholders } from "./utils";
import { useTerminals } from "./useTerminals";
import { TerminalActions } from "./terminal-actions";

export interface ActionDataItem {
  id: string;
  data: string;
  remark: string;
  args?: Arg[];
}

export function CommandForm(props: { onCreate: (todo: ActionDataItem) => void; cmd: ActionDataItem }) {
  const [commandError, setCommandError] = useState<string | undefined>(undefined);
  const [args, setArgs] = useState<Arg[]>(props.cmd.args || []);
  const [commandText, setCommandText] = useState<string>(props.cmd.data);
  const [cursorPosition, setCursorPosition] = useState<number>(props.cmd.data.length);
  const [variableCounter, setVariableCounter] = useState<number>(1);
  const { pop } = useNavigation();
  const cmdId = props.cmd.id;
  const remark = props.cmd.remark;

  const handleSubmit = (values: {
    swift_command_data_input_in_form: string;
    remark: string;
    [key: string]: string;
  }) => {
    const submittedArgs = args.map((arg) => ({
      name: arg.name,
      value: values[arg.name] || "",
    }));

    props.onCreate({
      id: cmdId,
      data: values.swift_command_data_input_in_form,
      remark: values.remark,
      args: submittedArgs,
    });

    pop();
  };

  function onCommandChange(value: string) {
    const oldText = commandText;
    setCommandText(value);

    // Try to infer cursor position from text changes
    if (value.length > oldText.length) {
      // Text was added - find where
      for (let i = 0; i < Math.min(oldText.length, value.length); i++) {
        if (oldText[i] !== value[i]) {
          setCursorPosition(i + (value.length - oldText.length));
          break;
        }
      }
      if (value.length > oldText.length && oldText === value.substring(0, oldText.length)) {
        // Text was appended at the end
        setCursorPosition(value.length);
      }
    } else if (value.length < oldText.length) {
      // Text was deleted - find where
      for (let i = 0; i < Math.min(oldText.length, value.length); i++) {
        if (oldText[i] !== value[i]) {
          setCursorPosition(i);
          break;
        }
      }
    } else {
      // Text length same, likely replacement
      setCursorPosition(value.length);
    }

    if (value && value !== "") {
      setCommandError(undefined);
    } else {
      setCommandError("Command is required");
    }

    const newArgs = getNewArguments(getArguments(value), args);
    setArgs(newArgs);
  }

  // Generic function to insert text at cursor position with smart spacing
  const insertAtCursor = (text: string) => {
    const pos = cursorPosition;
    const before = commandText.substring(0, pos);
    const after = commandText.substring(pos);

    // Smart spacing: add space before if needed
    let textToInsert = text;
    if (before.length > 0 && !before.endsWith(" ") && !before.endsWith("\n")) {
      textToInsert = " " + textToInsert;
    }
    // Smart spacing: add space after if there's text after and it doesn't start with space
    if (after.length > 0 && !after.startsWith(" ") && !after.startsWith("\n")) {
      textToInsert = textToInsert + " ";
    }

    const newText = before + textToInsert + after;
    const newCursorPos = pos + textToInsert.length;

    setCommandText(newText);
    setCursorPosition(newCursorPos);
    onCommandChange(newText);
  };

  const insertClipboard = () => {
    insertAtCursor("{{clipboard}}");
  };

  const insertVariable = () => {
    insertAtCursor(`{{$${variableCounter}}}`);
    setVariableCounter(variableCounter + 1);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={cmdId === "" ? "Create Command" : "Update Command"} onSubmit={handleSubmit} />
          <Action
            title="Insert {{clipboard}}"
            icon={Icon.Clipboard}
            onAction={insertClipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            title={`Insert Placeholder {{$${variableCounter}}}`}
            icon={Icon.PlusSquare}
            onAction={insertVariable}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Command"
        // avoid conflict with command placeholder
        id="swift_command_data_input_in_form"
        value={commandText}
        placeholder="enter your command"
        onChange={onCommandChange}
        error={commandError}
      />
      <Form.Description text="include {{placeholders}} for parameters like {{name}} (⌘⇧P)" />
      <Form.Description text="use {{clipboard}} for clipboard text (⌘⇧C)" />
      {args.map((arg) =>
        arg.name === "clipboard" ? (
          <Form.Description key={arg.name} title={arg.name} text="import from clipboard" />
        ) : (
          <Form.TextField
            key={arg.name}
            title={arg.name}
            id={arg.name}
            placeholder="optional parameter default value"
            defaultValue={arg.value}
          />
        ),
      )}
      <Form.TextArea title="Remark" id="remark" defaultValue={remark} placeholder="(optional)" />
    </Form>
  );
}

export function ArgumentForm(props: {
  cmd: ActionDataItem;
  onPaste: (cmd: ActionDataItem) => void;
  pasteTitle: string;
  pasteIcon: Image.ImageLike;
}) {
  const [args, setArgs] = useState<Arg[]>(props.cmd.args || []);
  const { pop } = useNavigation();
  const data = props.cmd.data;
  const [finalData, setFinalData] = useState(data);

  // Load available terminals
  const { data: terminals } = useTerminals();

  // Initialize finalData with clipboard replacement if clipboard argument exists
  // This is necessary because clipboard arguments don't have input fields (only show description text),
  // so onChange is never triggered. Without this initialization, commands like "echo {{clipboard}}"
  // would paste "echo {{clipboard}}" instead of "echo <actual clipboard content>"
  useEffect(() => {
    const initializeData = async () => {
      const hasClipboard = args.some((arg) => arg.name === "clipboard");
      if (hasClipboard) {
        const replaced = await replaceArgumentPlaceholders(data, args);
        setFinalData(replaced);
      }
    };
    initializeData();
  }, [data, args]);

  const handlePaste = () => {
    props.onPaste(props.cmd);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title={props.pasteTitle}
            icon={props.pasteIcon}
            onAction={async () => {
              await Clipboard.paste(finalData);
              handlePaste();
            }}
          />
          <Action.CopyToClipboard title="Copy Command" content={finalData} />
          <TerminalActions terminals={terminals || []} command={finalData} onExecute={handlePaste} />
        </ActionPanel>
      }
    >
      <Form.Description title="Command Preview" text={finalData} />
      {args.map((arg) =>
        arg.name === "clipboard" ? (
          <Form.Description key={arg.name} title={arg.name} text="import from clipboard" />
        ) : (
          <Form.TextField
            key={arg.name}
            title={arg.name}
            id={arg.name}
            placeholder="parameter value"
            defaultValue={arg.value}
            onChange={async (value) => {
              const updatedArgs = args.map((a) => (a.name === arg.name ? { ...a, value } : a));
              setFinalData(await replaceArgumentPlaceholders(data, updatedArgs));
              setArgs(updatedArgs);
            }}
          />
        ),
      )}
    </Form>
  );
}
