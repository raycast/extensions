import { ActionPanel, Icon, Form, Action, Clipboard, getPreferenceValues, popToRoot, showHUD } from "@raycast/api";
import { useState } from "react";
import title from "title";

interface FormInput {
  title: string;
}

interface Preferences {
  special?: string;
}

const preferences = getPreferenceValues<Preferences>();
const special = preferences.special?.split(",").map((word) => word.trim()) || [];
const capitalizeTitle = (raw: string) => {
  return title(raw, {
    special,
  });
};

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
              Clipboard.copy(capitalizeTitle(values.title));
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
          setCapitalized(capitalizeTitle(value));
        }}
      />
    </Form>
  );
};

export default Title;
