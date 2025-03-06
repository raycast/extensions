import { List, ActionPanel, Action, Form, Clipboard, showHUD, closeMainWindow, PopToRootType } from "@raycast/api";
import * as starknet from "starknet";
import { useEffect, useState } from "react";
import * as analytics from "./utils/analytics";
import {
  STARKNET_UTILS_CONFIG,
  StarknetUtilsConfigItemType,
  StarknetUtils,
  StarknetUtilsCommand,
  StarknetArgument,
} from "./config/data/starknetUtilsConfig";
import {
  EntryType,
  StarknetJsType,
  getDropwdownElements,
  getEntryType,
  getPlaceholder,
  parseValue,
  validateType,
} from "./utils/starknetJsTypeUtils";
import { stringifyBigInt } from "./utils/object";
import { implement } from "./utils/starknetUtilsImplementations";

const getListJsx = (items: StarknetUtils[]) => {
  return items.map((item) => {
    switch (item.type) {
      case StarknetUtilsConfigItemType.SECTION:
        return (
          <List.Section key={`section_{${item.title}}`} title={item.title}>
            {getListJsx(item.items)}
          </List.Section>
        );
      case StarknetUtilsConfigItemType.COMMAND:
        return (
          <List.Item
            key={`item_${item.title}`}
            title={item.title}
            actions={
              <ActionPanel>
                <Action.Push
                  onPush={() => {
                    analytics.trackEvent("UTILS_COMMAND_PUSH", {
                      command: item.title,
                    });
                  }}
                  title="Open Command"
                  target={<UtilInterface item={item} />}
                />
              </ActionPanel>
            }
          />
        );
    }
  });
};

const UtilInterface = ({ item }: { item: StarknetUtils }) => {
  const buildArgsValue = (command: StarknetUtilsCommand["command"]) => {
    const argsObj: { [name: string]: any } = {};
    command.arguments.forEach((item) => (argsObj[item.name] = item.defaultValue ? item.defaultValue : ""));
    return argsObj;
  };

  const command = (item as StarknetUtilsCommand).command;
  const [argsValue, setArgsValue] = useState(buildArgsValue(command));
  const [errors, setErrors] = useState<{ [name: string]: string | undefined }>({});
  const [output, setOutput] = useState<string>("");

  const setArg = (argument: StarknetArgument, value: string) => {
    const newArgs = { ...argsValue };
    newArgs[argument.name] = value;
    setArgsValue(newArgs);

    // there was an issue where setArgs gets called on load
    // because of this fields have a required option on load
    // on the last field had it because all were called together and there was a race condition
    if (!value) return;
    validate(argument, value);
  };

  const setErrorMessage = (key: string, message: string | undefined) => {
    const newErrors = { ...errors };
    newErrors[key] = message;
    setErrors(newErrors);
  };

  const validate = (argument: StarknetArgument, value: string | undefined) => {
    if (argument.required && !value) {
      setErrorMessage(argument.name, "required");
      return;
    }
    if (!value) {
      return;
    }

    const isValid = validateType(argument.type, value);
    if (!isValid.valid) {
      setErrorMessage(argument.name, isValid.errorMessage);
      return;
    }

    // if the code reaches here, there is no error
    setErrorMessage(argument.name, undefined);
  };

  const allRequiredArgsPresent = (values: any, args: StarknetArgument[]) => {
    return (
      args.filter((arg) => {
        if (!arg.required) {
          return false;
        }
        if (values[arg.name]) {
          return false;
        }
        return true;
      }).length == 0
    );
  };

  useEffect(() => {
    if (!allRequiredArgsPresent(argsValue, command.arguments)) {
      return;
    }

    let result = "";
    try {
      result = implement(command, argsValue) as string;
    } catch (error) {
      let message = "Failed to generate output";
      if (error instanceof Error) message = error.message;
      result = message;
    }
    setOutput(result);
  }, [argsValue]);

  const onSubmit = async () => {
    await Clipboard.copy(output);
    await showHUD("Copied ✅");
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy to Clipboard" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      {command.arguments.map((arg) => {
        const key = `arg_${arg.name}`;

        switch (getEntryType(arg.type)) {
          case EntryType.TEXT:
            return (
              <Form.TextField
                id={key}
                key={key}
                title={`${arg.name}${arg.required ? "*" : ""}`}
                placeholder={getPlaceholder(arg.type)}
                onChange={(value) => setArg(arg, value)}
                value={argsValue[arg.name]}
                onBlur={(e) => validate(arg, e.target.value)}
                error={errors[arg.name]}
              />
            );
          case EntryType.TEXTAREA:
            return (
              <Form.TextArea
                id={key}
                key={key}
                title={`${arg.name}${arg.required ? "*" : ""}`}
                placeholder={getPlaceholder(arg.type)}
                onChange={(value) => setArg(arg, value)}
                value={argsValue[arg.name]}
                onBlur={(e) => validate(arg, e.target.value)}
                error={errors[arg.name]}
              />
            );
          case EntryType.DROPWDOWN:
            return (
              <Form.Dropdown
                id={key}
                key={key}
                title={arg.name}
                value={argsValue[arg.name] ? argsValue[arg.name] : arg.defaultValue}
                onChange={(value) => setArg(arg, value)}
              >
                {Object.entries(getDropwdownElements(arg.type)).map(([title, value]) => (
                  <Form.Dropdown.Item value={value} title={title} />
                ))}
              </Form.Dropdown>
            );
        }
      })}
      <Form.Separator />
      <Form.TextArea
        id={`output`}
        title={command.return.title}
        placeholder=""
        value={output}
        onChange={() => {
          void 0;
        }}
        info="please enter all the required fields"
      />
    </Form>
  );
};

export default function Command({ items }: { items?: StarknetUtils[] }) {
  const [listItems, setListItems] = useState<StarknetUtils[]>(items ? items : STARKNET_UTILS_CONFIG);

  useEffect(() => {
    analytics.trackEvent("OPEN_STARKNET_UTILS");
  }, []);

  return <List>{getListJsx(listItems)}</List>;
}
