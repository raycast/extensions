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
import { useEffect, useState } from "react";
import { summarize } from "./huggingface";

interface Preferences {
  defaultModel: string;
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
      <Form.TextField id="model" title="Model" defaultValue={preferences.defaultModel} />
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
