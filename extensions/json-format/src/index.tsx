import { ActionPanel, Icon, Form, Action } from '@raycast/api';
import { useState } from 'react';

import { copyFormattedJs, formatJS, parseAndFormatJs } from './utils';

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
                setResult(output);
              }
            }}
          />
          <ActionPanel.Section>
            <Action.SubmitForm
              title="Parse & Format"
              icon={Icon.QuotationMarks}
              shortcut={{ modifiers: ['cmd'], key: 'p' }}
              onSubmit={async (values: FormInput) => {
                const output = await parseAndFormatJs(values.input);

                if (output) {
                  setResult(output);
                }
              }}
            />
            <Action.SubmitForm
              title="Copy Result"
              icon={Icon.Checkmark}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'enter' }}
              onSubmit={async (values: FormInput) => {
                await copyFormattedJs(values.result);
              }}
            />
          </ActionPanel.Section>
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
        value={result}
        onChange={setResult}
      />
    </Form>
  );
}
