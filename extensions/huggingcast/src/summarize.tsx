import {
  Detail,
  Form,
  ActionPanel,
  useNavigation,
  SubmitFormAction,
  getPreferenceValues,
  CopyToClipboardAction,
  PasteAction,
  getSelectedText,
} from "@raycast/api";
import { useState } from "react";
import { summarize } from "./huggingface";

interface Preferences {
  models: string;
}

export default () => {
  const { push } = useNavigation();
  const [text, setText] = useState<string>("");
  const [isLoading, setLoading] = useState<boolean>(false);

  const preferences: Preferences = getPreferenceValues();
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <SubmitFormAction
            title="Summarize"
            onSubmit={async (values) => {
              setLoading(true);
              const summary = await summarize(values.text, values.model);
              setLoading(false);
              push(<Summary text={summary} />);
            }}
          />
          <ActionPanel.Item
            title="Use currently selected text"
            onAction={async () => {
              setText(await getSelectedText());
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Text to summarize" value={text} onChange={(text) => setText(text)} />
      <Form.Dropdown id="model" title="Model">
        {preferences.models
          .split(",")
          .map((path: string) => path.trim())
          .map((path: string, index: number) => (
            <Form.Dropdown.Item key={index} value={path} title={path} />
          ))}
      </Form.Dropdown>
    </Form>
  );
};

const Summary = ({ text }: { text: string }) => {
  return (
    <Detail
      actions={
        <ActionPanel>
          <PasteAction content={text} />
          <CopyToClipboardAction title="Copy Summary" content={text} />
        </ActionPanel>
      }
      markdown={text}
    />
  );
};
