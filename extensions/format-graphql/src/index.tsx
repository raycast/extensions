import { Icon, Form, ActionPanel, Action, showToast, Clipboard, Toast, showHUD, popToRoot } from "@raycast/api";
import prettier from "prettier";

interface CommandForm {
  input: string;
  indent: string;
}

export default function Command() {
  function handleSubmit(values: CommandForm) {
    const { input, indent } = values;

    if (input.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Empty input",
      });
      return;
    }

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
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid GraphQL",
      });
      return;
    }

    Clipboard.copy(output);
    showHUD("Copied to clipboard");
    popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Checkmark} title="Format and Copy" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Input" placeholder="Paste GraphQL here…" />
      <Form.Dropdown id="indent" title="Indentation" storeValue>
        <Form.Dropdown.Item value="tab" title="Tabs" />
        <Form.Dropdown.Item value="2" title="Spaces: 2" />
        <Form.Dropdown.Item value="4" title="Spaces: 4" />
        <Form.Dropdown.Item value="8" title="Spaces: 8" />
      </Form.Dropdown>
    </Form>
  );
}
