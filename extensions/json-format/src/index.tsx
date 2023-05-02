import { ActionPanel, Icon, Form, Action } from '@raycast/api';
import { useState } from 'react';

import { copyFormattedJs, formatJS } from './utils';

interface FormInput {
  input: string;
  result: string;
}

export default function main() {
  const [input, setInput] = useState<string>('');
  const [result, setResult] = useState<string>('');

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Format"
            icon={Icon.Clipboard}
            onSubmit={async (values: FormInput) => {
              const output = formatJS(values.input);

              if (output) {
                await copyFormattedJs(output);
              }
            }}
          />
          <Action.SubmitForm
            title="View Result"
            icon={Icon.Checkmark}
            onSubmit={async (values: FormInput) => {
              const output = formatJS(values.input);

              if (output) {
                setResult(output);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Input"
        placeholder="Paste JSON here…"
        value={input}
        onChange={setInput}
      />
      <Form.TextArea
        id="result"
        title="Result"
        placeholder="Command + Shift + Enter to view result..."
        value={result}
        onChange={setResult}
      />
    </Form>
  );
}
