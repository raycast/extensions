import {
  ActionPanel,
  Icon,
  Form,
  Action,
  showToast,
  Toast,
} from '@raycast/api';
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
              const out = formatJS(values.input);
              await copyFormattedJs(out);
            }}
          />
          <Action.SubmitForm
            title="View Result"
            icon={Icon.Checkmark}
            onSubmit={async (values: FormInput) => {
              const out = formatJS(values.input);
              try {
                JSON.parse(out);
              } catch (err) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: 'Invalid input',
                });
                return;
              }

              setResult(out);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
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
