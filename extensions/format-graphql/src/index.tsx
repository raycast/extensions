import { Icon, Form, ActionPanel, Action, showToast, Clipboard, Toast, showHUD, popToRoot } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import prettier from "prettier";

interface CommandForm {
  input: string;
  indent: string;
  copy: boolean;
}

export default function Command() {
  const { itemProps, handleSubmit, setValue } = useForm<CommandForm>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Formatting" });
      const { input, indent } = values;

      const useTabs = indent === "tab";
      const tabWidth = indent !== "tab" ? parseInt(indent) : 2;

      const options = {
        parser: "graphql",
        useTabs,
        tabWidth,
      };

      let output;
      try {
        output = prettier.format(input, options);

        toast.style = Toast.Style.Success;
        toast.title = "Formatted GraphQL";
        setValue("input", output);
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.title = "Invalid GraphQL";
        return;
      }
      if (values.copy) {
        await Clipboard.copy(output);
        await showHUD("Copied to clipboard");
        await popToRoot();
      }
    },
    validation: {
      input: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Clipboard}
            title="Format and Copy"
            onSubmit={(values: CommandForm) => handleSubmit({ ...values, copy: true })}
          />
          <Action.SubmitForm
            icon={Icon.Checkmark}
            title="Only Format"
            onSubmit={(values: CommandForm) => handleSubmit({ ...values, copy: false })}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Input" placeholder="Paste GraphQL here…" {...itemProps.input} />
      <Form.Dropdown title="Indentation" storeValue {...itemProps.indent}>
        <Form.Dropdown.Item value="tab" title="Tabs" />
        <Form.Dropdown.Item value="2" title="Spaces: 2" />
        <Form.Dropdown.Item value="4" title="Spaces: 4" />
        <Form.Dropdown.Item value="8" title="Spaces: 8" />
      </Form.Dropdown>
    </Form>
  );
}
