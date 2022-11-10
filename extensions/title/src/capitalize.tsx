import { popToRoot, showHUD, ActionPanel, Icon, Form, Action, Clipboard } from "@raycast/api";
import { useState } from "react";
import title from "title";

interface FormInput {
  title: string;
}

const Title = () => {
  const [capitalized, setCapitalized] = useState<string>("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Checkmark}
            title="Copy to Clipboard"
            onSubmit={(values: FormInput) => {
              Clipboard.copy(title(values.title));
              showHUD("Copied to Clipboard");
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter your title below to get it capitalized properly according to the The Chicago Manual of Style:" />
      <Form.TextField
        id="title"
        placeholder="Paste or Enter Your Title"
        value={capitalized}
        onChange={(value: string) => {
          setCapitalized(title(value));
        }}
      />
    </Form>
  );
};

export default Title;
