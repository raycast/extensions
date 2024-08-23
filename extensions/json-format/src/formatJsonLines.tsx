import { Form, ActionPanel, Action } from '@raycast/api';
import { useState } from 'react';

import { formatToJSONLines } from './utils';

interface FormInput {
  input: string;
  result: string;
}

export default function Command() {
  const [input, setInput] = useState<string>('');
  const [result, setResult] = useState<string>('');

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Format"
            onSubmit={async (values: FormInput) => {
              const input: string = values.input;
              const output = formatToJSONLines(input);
              if (output) {
                setResult(output);
              }
            }}
          />
          <Action.SubmitForm
            title="View Result"
            onSubmit={async (values: FormInput) => {
              const input: string = values.input;
              const output = formatToJSONLines(input);
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
        placeholder="Paste JSON Array here…"
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
