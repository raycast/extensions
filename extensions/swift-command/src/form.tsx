import { useState } from "react";
import { Arg } from "./datasource";
import { Action, ActionPanel, Form, useNavigation, Clipboard, Image } from "@raycast/api";
import { getArguments, getNewArguments, replaceArgumentPlaceholders } from "./utils";

export interface ActionDataItem {
  id: string;
  data: string;
  remark: string;
  args?: Arg[];
}

export function CommandForm(props: { onCreate: (todo: ActionDataItem) => void; cmd: ActionDataItem }) {
  const [commandError, setCommandError] = useState<string | undefined>(undefined);
  const [args, setArgs] = useState<Arg[]>(props.cmd.args || []);
  const { pop } = useNavigation();
  const cmdId = props.cmd.id;
  const data = props.cmd.data;
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
    if (value && value !== "") {
      setCommandError(undefined);
    } else {
      setCommandError("Command is required");
    }

    const newArgs = getNewArguments(getArguments(value), args);
    setArgs(newArgs);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={cmdId === "" ? "Create Command" : "Update Command"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Command"
        // avoid conflict with command placeholder
        id="swift_command_data_input_in_form"
        defaultValue={data}
        placeholder="enter your command"
        onChange={onCommandChange}
        error={commandError}
      />
      <Form.Description text="include {{}} for parameters, e.g. echo {{your_name}}" />
      {args.map((arg) => (
        <Form.TextField
          key={arg.name}
          title={arg.name}
          id={arg.name}
          placeholder="optional parameter default value"
          defaultValue={arg.value}
        />
      ))}
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
        </ActionPanel>
      }
    >
      <Form.Description title="Command Preview" text={finalData} />
      {args.map((arg) => (
        <Form.TextField
          key={arg.name}
          title={arg.name}
          id={arg.name}
          placeholder="parameter value"
          defaultValue={arg.value}
          onChange={(value) => {
            const updatedArgs = args.map((a) => (a.name === arg.name ? { ...a, value } : a));
            setFinalData(replaceArgumentPlaceholders(data, updatedArgs));
            setArgs(updatedArgs);
          }}
        />
      ))}
    </Form>
  );
}
