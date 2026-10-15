import { Action, ActionPanel, Form, getPreferenceValues, useNavigation } from "@raycast/api";
import { useState } from "react";
import { CONTENT_TYPE_LABELS, MODE_LABELS, type ContentType, type ConversionMode, type StePreferences } from "../types";
import { isBlank } from "../utils/text";
import { ConversionResultView } from "./ConversionResult";

interface FormValues {
  text: string;
  contentType: ContentType;
  mode: ConversionMode;
}

export function ConversionForm({ initialText = "", info }: { initialText?: string; info?: string }) {
  const prefs = getPreferenceValues<StePreferences>();
  const { push } = useNavigation();
  const [textError, setTextError] = useState<string | undefined>();

  function submit(values: FormValues) {
    if (isBlank(values.text)) {
      setTextError("Enter some text to convert.");
      return;
    }
    push(<ConversionResultView request={{ text: values.text, contentType: values.contentType, mode: values.mode }} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={submit} />
        </ActionPanel>
      }
    >
      {info && <Form.Description title="Note" text={info} />}
      <Form.TextArea
        id="text"
        title="Input Text"
        placeholder="Enter or paste text to convert"
        defaultValue={initialText}
        error={textError}
        onChange={() => textError && setTextError(undefined)}
        enableMarkdown
      />
      <Form.Dropdown id="contentType" title="Content Type" defaultValue={prefs.defaultContentType ?? "auto"}>
        {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((key) => (
          <Form.Dropdown.Item key={key} value={key} title={CONTENT_TYPE_LABELS[key]} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="mode" title="Conversion Mode" defaultValue={prefs.defaultMode ?? "standard"}>
        {(Object.keys(MODE_LABELS) as ConversionMode[]).map((key) => (
          <Form.Dropdown.Item key={key} value={key} title={MODE_LABELS[key]} />
        ))}
      </Form.Dropdown>
      <Form.Description
        title="Privacy"
        text="Text is sent to your AI provider when you press Convert. It is not stored or logged by this extension."
      />
    </Form>
  );
}
