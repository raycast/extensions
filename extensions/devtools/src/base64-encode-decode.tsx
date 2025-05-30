import React, { useState } from 'react';
import { ActionPanel, Action, Form, showToast, Toast } from '@raycast/api';

function base64Encode(str: string) {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    throw new Error('Input is not valid for encoding');
  }
}

function base64Decode(str: string) {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (e) {
    throw new Error('Input is not valid Base64');
  }
}

export default function Command() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState('decode');
  const [error, setError] = useState('');

  function handleConvert() {
    try {
      const result = mode === 'encode' ? base64Encode(input) : base64Decode(input);
      setOutput(result);
      setError('');
      showToast({ style: Toast.Style.Success, title: 'Success!' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setOutput('');
      setError(errorMessage);
      showToast({ style: Toast.Style.Failure, title: 'Error', message: errorMessage });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title={mode === 'encode' ? 'Encode' : 'Decode'}
            onAction={handleConvert}
            shortcut={{ modifiers: ['cmd'], key: 'enter' }}
          />
          {output && <Action.CopyToClipboard title="Copy Output" content={output} />}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Input"
        placeholder="Enter text or Base64 here"
        value={input}
        onChange={setInput}
      />
      <Form.Dropdown id="mode" title="Mode" value={mode} onChange={setMode}>
        <Form.Dropdown.Item value="encode" title="Encode" />
        <Form.Dropdown.Item value="decode" title="Decode" />
      </Form.Dropdown>
      <Form.TextArea
        id="output"
        title="Output"
        value={output}
        onChange={() => {}}
        placeholder="Result will appear here"
        enableMarkdown={false}
        autoFocus={false}
      />
      {error && <Form.Description title="Error" text={error} />}
    </Form>
  );
}
