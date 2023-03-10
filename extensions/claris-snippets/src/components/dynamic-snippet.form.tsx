import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  Icon,
  showHUD,
  showToast,
  Toast,
  Clipboard,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import React from "react";
import { XMLToFMObjects } from "../utils/FmClipTools";
import { SnippetWithPath } from "../utils/types";

type DynamicSnippetFormProps = {
  snippet: SnippetWithPath;
};
export default function DynamicSnippetForm(props: DynamicSnippetFormProps) {
  const { snippet } = props;
  const { pop } = useNavigation();

  const { itemProps, handleSubmit } = useForm({
    initialValues: snippet.dynamicFields
      .map((field) => ({ [field.name]: field.default }))
      .reduce((acc, cur) => ({ ...acc, ...cur }), {}),
    onSubmit: async (values) => {
      // replace the merge tokens with the values from the form
      let snippetText = snippet.snippet;
      snippet.dynamicFields.forEach((field) => {
        snippetText = snippetText.replaceAll(field.name, values[field.name]);
      });

      await Clipboard.copy(snippetText);
      try {
        XMLToFMObjects();
        closeMainWindow();
        pop();
        showHUD("Copied to Clipboard");
      } catch (e) {
        showToast({
          title: "Error",
          style: Toast.Style.Failure,
          message: e instanceof Error ? e.message : "Unknown error",
        });
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Snippet" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Description text={snippet.name} />
      {snippet.dynamicFields.map((field) => {
        if (field.type === "text") {
          return <Form.TextField {...itemProps[field.name]} title={field.nameFriendly} />;
        }
        if (field.type === "dropdown") {
          return (
            <Form.Dropdown {...itemProps[field.name]} title={field.nameFriendly}>
              {field.values.map((val) => (
                <Form.Dropdown.Item key={val} value={val} title={val} />
              ))}
            </Form.Dropdown>
          );
        }
        return null;
      })}
    </Form>
  );
}
