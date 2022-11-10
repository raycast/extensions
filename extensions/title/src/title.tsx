import { popToRoot, showHUD, ActionPanel, Icon, Form, Action, Clipboard } from "@raycast/api";
import title from "title";

interface FormInput {
  title: string;
}

const main = () => (
  <Form
    actions={
      <ActionPanel>
        <Action.SubmitForm
          icon={Icon.Checkmark}
          title="Format"
          onSubmit={(values: FormInput) => {
            Clipboard.copy(title(values.title));
            showHUD("Copied to clipboard");
            popToRoot();
          }}
        />
      </ActionPanel>
    }
  >
    <Form.TextField id="title" title="Title" placeholder="Paste or Enter Your Title" />
  </Form>
);

export default main;
