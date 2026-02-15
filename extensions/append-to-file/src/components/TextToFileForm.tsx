import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { buildAppendRequest } from "../lib/append-request";
import { type InsertPosition } from "../lib/formatting";
import { getResolvedPreferences } from "../lib/preferences";
import { FilePicker } from "./FilePicker";

interface FormValues {
  inputText: string;
  insertPosition?: InsertPosition;
}

interface TextToFileFormProps {
  navigationTitle?: string;
  submitTitle?: string;
  initialText?: string;
  isLoading?: boolean;
  initialInsertPosition?: InsertPosition;
  showInsertPosition?: boolean;
}

export function TextToFileForm(props: TextToFileFormProps) {
  const preferences = getResolvedPreferences();
  const { push } = useNavigation();
  const [text, setText] = useState<string>(props.initialText ?? "");
  const showInsertPosition = props.showInsertPosition ?? true;

  useEffect(() => {
    setText(props.initialText ?? "");
  }, [props.initialText]);

  const handleSubmit = useCallback(
    (values: FormValues) => {
      const insertPosition = showInsertPosition
        ? (values.insertPosition ?? preferences.defaultInsertPosition)
        : (props.initialInsertPosition ?? preferences.defaultInsertPosition);

      push(
        <FilePicker
          request={buildAppendRequest(values.inputText, insertPosition)}
          navigationTitle={props.navigationTitle ?? "Append Text to File"}
        />,
      );
    },
    [
      preferences.defaultInsertPosition,
      props.initialInsertPosition,
      props.navigationTitle,
      push,
      showInsertPosition,
    ],
  );

  return (
    <Form
      navigationTitle={props.navigationTitle ?? "Append Text to File"}
      isLoading={props.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.submitTitle ?? "Choose File"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="inputText"
        title="Text"
        value={text}
        onChange={setText}
        autoFocus
      />
      {showInsertPosition ? (
        <Form.Dropdown
          id="insertPosition"
          title="Insert Position"
          defaultValue={preferences.defaultInsertPosition}
        >
          <Form.Dropdown.Item value="end" title="End of File" />
          <Form.Dropdown.Item value="beginning" title="Beginning of File" />
        </Form.Dropdown>
      ) : null}
    </Form>
  );
}
