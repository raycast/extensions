import { useState } from "react";
import { Form, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import TransformationList from "./components/TransformationList";

interface Preferences {
  useMultilineInput: boolean;
}

export default function TransformTextInput() {
  const [showTransformations, setShowTransformations] = useState(false);
  const [inputText, setInputText] = useState("");
  const [useMultiline, setUseMultiline] = useState(false);
  const preferences = getPreferenceValues<Preferences>();

  if (showTransformations) {
    return <TransformationList inputText={inputText} />;
  }

  const handleSubmit = (values: { text: string }) => {
    setInputText(values.text);
    setShowTransformations(true);
  };

  const shouldUseMultiline = preferences.useMultilineInput || useMultiline;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Show Transformations"
            icon={Icon.ArrowRight}
            onSubmit={handleSubmit}
            shortcut={shouldUseMultiline ? { modifiers: ["cmd"], key: "return" } : { modifiers: [], key: "return" }}
          />
          {!preferences.useMultilineInput && !useMultiline && (
            <Action
              title="Switch to Text Area"
              icon={Icon.Text}
              onAction={() => setUseMultiline(true)}
              shortcut={{ modifiers: [], key: "arrowDown" }}
            />
          )}
        </ActionPanel>
      }
    >
      {shouldUseMultiline ? (
        <Form.TextArea id="text" title="Input Text" placeholder="Enter or paste text to transform..." autoFocus />
      ) : (
        <Form.TextField id="text" title="Input Text" placeholder="Enter or paste text to transform..." autoFocus />
      )}
    </Form>
  );
}
