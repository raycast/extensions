import React, { useState, useEffect } from 'react';
import { ActionPanel, Action, Form } from '@raycast/api';

const DEFAULT_LENGTH = 16;
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

function generateRandomString(options: {
  length: number;
  useUpper: boolean;
  useLower: boolean;
  useDigits: boolean;
  useSymbols: boolean;
  customCharset: string;
}) {
  let charset = options.customCharset;
  if (!charset) {
    if (options.useUpper) charset += UPPERCASE;
    if (options.useLower) charset += LOWERCASE;
    if (options.useDigits) charset += DIGITS;
    if (options.useSymbols) charset += SYMBOLS;
  }
  if (!charset) charset = LOWERCASE + UPPERCASE + DIGITS;
  let result = '';
  for (let i = 0; i < options.length; i++) {
    const idx = Math.floor(Math.random() * charset.length);
    result += charset[idx];
  }
  return result;
}

export default function Command() {
  const [length, setLength] = useState(DEFAULT_LENGTH);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(false);
  const [customCharset, setCustomCharset] = useState('');
  const [output, setOutput] = useState('');

  function regenerate() {
    setOutput(
      generateRandomString({
        length,
        useUpper,
        useLower,
        useDigits,
        useSymbols,
        customCharset,
      })
    );
  }

  useEffect(() => {
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, useUpper, useLower, useDigits, useSymbols, customCharset]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Generate"
            onAction={regenerate}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'enter' }}
          />
          <Action.CopyToClipboard title="Copy Output" content={output} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="length"
        title="Length"
        value={length.toString()}
        onChange={(v) => setLength(Number(v.replace(/\D/g, '')) || 0)}
      />
      <Form.Checkbox id="upper" label="Uppercase" value={useUpper} onChange={setUseUpper} />
      <Form.Checkbox id="lower" label="Lowercase" value={useLower} onChange={setUseLower} />
      <Form.Checkbox id="digits" label="Digits" value={useDigits} onChange={setUseDigits} />
      <Form.Checkbox id="symbols" label="Symbols" value={useSymbols} onChange={setUseSymbols} />
      <Form.TextField
        id="customCharset"
        title="Custom Charset (overrides above)"
        value={customCharset}
        onChange={setCustomCharset}
        placeholder="Leave empty to use options above"
      />
      <Form.TextArea
        id="output"
        title="Output"
        value={output}
        onChange={() => {}}
        placeholder="Random string will appear here"
        enableMarkdown={false}
        autoFocus={false}
      />
    </Form>
  );
}
