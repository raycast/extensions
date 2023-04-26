import {
  getPreferenceValues,
  showToast,
  Toast,
  showHUD,
  Clipboard,
} from '@raycast/api';

import beautify from 'js-beautify';

export function formatJS(text: string) {
  const indent = getIndentation();
  const trimmedText = text.trim();

  const options = {
    indent_size: indent === 'tab' ? 1 : parseInt(indent, 10),
    space_in_empty_paren: true,
    indent_with_tabs: indent === 'tab',
  };

  const json = convert(trimmedText);
  if (!json) return;
  const output = beautify(json, options);

  return output;
}

export async function copyFormattedJs(result: string) {
  if (autoPasteEnabled()) {
    await Clipboard.paste(result);
    await showHUD('✅ Pasted succesfully!');
  } else {
    await Clipboard.copy(result);
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
