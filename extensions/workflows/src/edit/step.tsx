import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState, useEffect } from "react";

import {
  STEP_TYPES,
  StepDefinition,
  LaunchCommandDefinition,
  ICON_BY_TYPE,
  TITLE_BY_TYPE,
} from "../workflow-definition";

import { useExtensions } from "../search-manifest";

const explainPlaceholders =
`
Has support for Dynamic Placeholders:
 - {clipboard}
 - {selected-text}
 - {browser-content-html}
 - {browser-content-markdown}
 - {browser-content-text}
`;

export default function EditStep({
  step,
  onSubmit,
}: {
  step: StepDefinition;
  onSubmit: (values: StepDefinition) => void;
}) {
  const { isLoading, installedExtensions } = useExtensions();
  const [commandArguments, setCommandArguments] = useState<Record<string, string>>({});

  const { pop } = useNavigation();

  const { handleSubmit, itemProps, values } = useForm<StepDefinition & { type: string }>({
    initialValues: step,
    onSubmit: (values) => {
      if (values.type === "LAUNCH_COMMAND") {
        // Merge the command arguments with the form values
        onSubmit({
          ...values,
          arguments: commandArguments,
        } as LaunchCommandDefinition);
      } else {
        onSubmit(values);
      }

      showToast({
        style: Toast.Style.Success,
        title: "Step Updated",
        message: "The step has been successfully updated",
      });

      pop();
    },
  });

  const extension =
    values.type === "LAUNCH_COMMAND" && values.extensionName
      ? installedExtensions.find((ex) => ex.name === values.extensionName)
      : undefined;

  const command =
    extension && (values as LaunchCommandDefinition).commandName
      ? extension.commands.find((com) => com.name === (values as LaunchCommandDefinition).commandName)
      : undefined;

  // Initialize command arguments when step loads
  useEffect(() => {
    if (step.type === "LAUNCH_COMMAND" && step.arguments) {
      setCommandArguments(step.arguments);
    }
  }, [step]);

  return (
    <Form
      navigationTitle="Edit a Workflow Step"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" {...itemProps.title} />

      <Form.Dropdown title="Type" {...itemProps.type}>
        {
          Object.entries(STEP_TYPES)
            .filter(([k]) => k !== STEP_TYPES.EMPTY)
            .map(([key, value]) => (
              <Form.Dropdown.Item key={key} value={value} title={TITLE_BY_TYPE[value]} icon={ICON_BY_TYPE[value]} />
            ))
        }
      </Form.Dropdown>

      <Form.Separator />

      {["ASK_AI", "APPLE_SCRIPT"].includes(values.type) && <Form.TextArea title="Argument" {...itemProps.argument} info={explainPlaceholders}/>}
      {["OPEN", "OPEN_DEEPLINK"].includes(values.type) && <Form.TextField title="Argument" {...itemProps.argument} info={explainPlaceholders}/>}

      {values.type === "ASK_AI" && <Form.Checkbox label="Write to Clipboard" {...itemProps.writeToClipboard} />}

      {values.type === "LAUNCH_COMMAND" && (
        <>
          <Form.Dropdown title="Extension name" {...itemProps.extensionName}>
            {installedExtensions.map((extension) => (
              <Form.Dropdown.Item
                key={extension.name}
                value={extension.name}
                title={extension.title}
                icon={extension.iconPath}
              />
            ))}
          </Form.Dropdown>

          {extension && (
            <>
              <Form.Dropdown title="Command" {...itemProps.commandName}>
                {extension.commands.map((command) => (
                  <Form.Dropdown.Item key={command.name} value={command.name} title={command.title} />
                ))}
              </Form.Dropdown>

              <Form.Description title="Author" text={extension.owner || extension.author} />

              {command?.arguments && (
                <>
                  {command.arguments.map((arg) => (
                    <Form.TextField
                      key={arg.name}
                      id={`cargs-${arg.name}`}
                      value={commandArguments[arg.name] || ""}
                      onChange={(value) =>
                        setCommandArguments((prev) => ({
                          ...prev,
                          [arg.name]: value,
                        }))
                      }
                      title={`${arg.name}${arg.required ? "*" : ""}`}
                      placeholder={arg.placeholder}
                      info={arg.description}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
      <Form.Separator />
    </Form>
  );
}
