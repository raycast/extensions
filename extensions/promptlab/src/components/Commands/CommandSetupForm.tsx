import { Action, ActionPanel, Form, showToast, LocalStorage, useNavigation } from "@raycast/api";
import { Command, CommandOptions } from "../../lib/commands/types";
import {
  BooleanConfigField,
  CommandConfig,
  NumberConfigField,
  StringConfigField,
} from "../../lib/commands/config/types";
import { Fragment, useEffect, useState } from "react";

export default function CommandSetupForm(props: {
  commandName: string;
  options: CommandOptions;
  setOptions: React.Dispatch<React.SetStateAction<CommandOptions>>;
  setCommands?: (commands: Command[]) => void;
}) {
  const { commandName, options, setOptions, setCommands } = props;
  const [setupFields, setSetupFields] = useState<
    ((StringConfigField | NumberConfigField | BooleanConfigField) & { error?: string })[]
  >([]);
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const { pop } = useNavigation();

  useEffect(() => {
    if (options.setupConfig) {
      setSetupFields(options.setupConfig.fields.map((field) => ({ ...field })));
    }
  }, []);

  if (!setCommands) {
    return null;
  }

  useEffect(() => {
    // Ensure setup fields update
    if (formSubmitted) {
      for (const field of setupFields) {
        if (field.value == undefined || field.value == "") {
          field.value = field.defaultValue;
        }
      }

      const commandConfig: CommandConfig = {
        fields: setupFields,
        configVersion: options.setupConfig?.configVersion || "1.0.0",
      };

      Promise.resolve(LocalStorage.allItems()).then((commandsData) => {
        const commands = Object.entries(commandsData)
          .filter(([key]) => !key.startsWith("--") && !key.startsWith("id-"))
          .map(([, value]) => JSON.parse(value) as Command);

        const command = commands.find((cmd) => cmd.name == commandName);

        if (command) {
          command.setupConfig = commandConfig;
          Promise.resolve(LocalStorage.setItem(command.name, JSON.stringify(command)));
          const updatedCommands = [...commands.filter((cmd) => cmd.name != commandName), command];
          setOptions({ ...options, setupConfig: commandConfig });
          setCommands(updatedCommands);
          Promise.resolve(showToast({ title: "Configuration Saved" }));
          pop();
        }
      });
    }
  }, [setupFields, formSubmitted]);

  return (
    <Form
      navigationTitle={commandName}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Configuration" onSubmit={() => setFormSubmitted(true)} />
        </ActionPanel>
      }
    >
      <Form.Description title="Setup" text="Please fill out the following fields to set up this command." />
      {setupFields.map((field, index) => (
        <Fragment key={`fragment${index}`}>
          <Form.Description title={field.name} text={field.description} key={`fieldDescription${index}`} />
          {"regex" in field || "min" in field ? (
            <Form.TextField
              key={`field${index}`}
              id={`field${index}`}
              title="Value"
              info={field.guideText}
              error={field.error}
              defaultValue={field.defaultValue as string}
              onChange={(value) => {
                const fields = [...setupFields.map((field) => ({ ...field }))];
                if ("regex" in field && field.regex.length > 0 && !value.match(field.regex)) {
                  fields[index].error = "Invalid value!";
                }
                fields[index].value = value;
                setSetupFields(fields);
              }}
            />
          ) : (
            <Form.Checkbox
              key={`field${index}`}
              id={`field${index}`}
              label="Value"
              info={field.guideText}
              error={field.error}
              defaultValue={field.defaultValue as boolean}
              onChange={(value) => {
                const fields = [...setupFields.map((field) => ({ ...field }))];
                fields[index].value = value;
                setSetupFields(fields);
              }}
            />
          )}
        </Fragment>
      ))}
    </Form>
  );
}
