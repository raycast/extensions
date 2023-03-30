import {
  getPreferenceValues,
  showToast,
  Toast,
  showHUD,
  Clipboard,
} from '@raycast/api';

import beautify from 'js-beautify';

export async function formatJS(text: string) {
  const indent = getIndentation();
  const trimmedText = text.trim();

  if (trimmedText.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Empty input',
    });
    return;
  }

  const options = {
    indent_size: indent === 'tab' ? 1 : parseInt(indent, 10),
    space_in_empty_paren: true,
    indent_with_tabs: indent === 'tab',
  };

  const json = convert(trimmedText);
  if (!json) return;
  const out = beautify(json, options);

  if (autoPasteEnabled()) {
    await Clipboard.paste(out);
    await showHUD('✅ Pasted succesfully!');
  } else {
    await Clipboard.copy(out);
    await showHUD('✅ Copied succesfully!');
  }
}

interface Preferences {
  indent: IndentType;
  autopaste: boolean;
}

type IndentType = 'tab' | '2' | '4' | '8';

function getIndentation(): IndentType {
  const { indent } = getPreferenceValues<Preferences>();
  return indent;
}

function autoPasteEnabled(): boolean {
  const { autopaste } = getPreferenceValues<Preferences>();
  return autopaste;
}

function convert(input: string) {
  if (input.endsWith(';')) input = input.slice(0, -1);
  try {
    if (isExecuteable(input)) throw new Error('executeable');
    const result = Function(`"use strict";return (${input})`)();
    return JSON.stringify(result);
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: 'Please copy a valid JSON/JS Object',
    });
  }
}

function isExecuteable(input: string) {
  return /\([\s\S]*?\)|[\w$]\s*`[\s\S]*?`/.test(input);
}
