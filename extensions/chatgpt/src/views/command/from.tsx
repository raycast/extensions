import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { Command, CommandContentSource, CommandHook } from "../../type";

import { getConfiguration } from "../../hooks/useChatGPT";
import { useModel } from "../../hooks/useModel";

export const CommandForm = (props: {
  cmd?: Command;
  name?: string;
  isNew?: boolean;
  use: { commands: CommandHook };
}) => {
  const { use, cmd } = props;
  const models = useModel();
  const navigation = useNavigation();
  const { isCustomModel } = getConfiguration();

  const { handleSubmit, itemProps } = useForm<Command>({
    onSubmit: async (command) => {
      const updatedCommand: Command = { ...command };
      if (props.cmd && props?.isNew !== true) {
        const toast = await showToast({
          title: "Update your AI command...",
          style: Toast.Style.Animated,
        });
        use.commands.update({ ...updatedCommand, id: props.cmd.id });
        toast.title = "AI command updated!";
        toast.style = Toast.Style.Success;
      } else {
        await showToast({
          title: "Save your AI command...",
          style: Toast.Style.Animated,
        });
        use.commands.add({
          ...updatedCommand,
          id: uuidv4(),
        });
        await showToast({
          title: "AI command saved",
          style: Toast.Style.Animated,
        });
      }
      navigation.pop();
    },
    validation: {
      name: FormValidation.Required,
      temperature: (value) => {
        if (value !== undefined && value !== null) {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            if (numValue < 0) {
              return "Minimal value is 0";
            } else if (numValue > 2) {
              return "Maximal value is 2";
            }
          }
        } else {
          return FormValidation.Required;
        }
      },
      prompt: FormValidation.Required,
    },
    initialValues: {
      name: cmd?.name ?? props.name ?? "",
      temperature: cmd?.temperature.toString() ?? "1",
      model: cmd?.model ?? "gpt-4o-mini",
      prompt: cmd?.prompt ?? "",
      contentSource: cmd?.contentSource ?? "selectedText",
      isDisplayInput: cmd?.isDisplayInput ?? false,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Command name" {...itemProps.name} />
      <Form.TextArea title="Prompt" placeholder="Describe what your command should do" {...itemProps.prompt} />
      <Form.TextField
        title="Creativity"
        placeholder="Set the required level of creativity (0 - 2)"
        info="Concrete tasks, such as fixing grammar, require less creativity, while open-ended questions, such as generating ideas, require more."
        {...itemProps.temperature}
      />
      {isCustomModel ? (
        <Form.TextField title="Model" placeholder="Custom model" {...itemProps.model} />
      ) : (
        <Form.Dropdown title="Model" placeholder="Choose model" {...itemProps.model}>
          {models.option.map((option) => (
            <Form.Dropdown.Item value={option} title={option} key={option} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Separator />
      <Form.Dropdown
        id="contentSource"
        title="Content source"
        placeholder="Source of the data to be processed"
        info="Data source from which the command will receive data."
        {...(itemProps.contentSource as { value: CommandContentSource })}
      >
        {(Object.keys(titlesByContentSource) as CommandContentSource[]).map((key) => (
          <Form.Dropdown.Item
            key={key}
            value={key}
            title={titlesByContentSource[key]}
            icon={iconsByContentSource[key]}
          />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        title="Display input"
        label="Enable the display of user input"
        info={
          "If this option is enabled, user input will be displayed in the quick command view. " +
          "This is useful when your quick command modifies data from the user, such as in " +
          "the case of the command 'Fix Spelling and Grammar.'"
        }
        {...itemProps.isDisplayInput}
      />
    </Form>
  );
};

export const titlesByContentSource = {
  clipboard: "Clipboard Text",
  selectedText: "Selected Text",
  browserTab: "Focused Browser Tab",
};

export const iconsByContentSource = {
  clipboard: Icon.Clipboard,
  selectedText: Icon.TextSelection,
  browserTab: Icon.Globe,
};
