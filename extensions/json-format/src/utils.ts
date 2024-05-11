import {
  getPreferenceValues,
  showToast,
  Toast,
  showHUD,
  Clipboard,
} from '@raycast/api';

import beautify from 'js-beautify';

export function formatJS(text: string) {
  const trimmedText = text.trim();

  const firstChar = trimmedText[0];
  let json;
  if (firstChar === '"') {
    json = convert(parse(trimmedText));
  } else {
    json = convert(trimmedText);
  }
  if (!json) return;

  const indent = getIndentation();
  const options = {
    indent_size: indent === 'tab' ? 1 : parseInt(indent, 10),
    space_in_empty_paren: true,
    indent_with_tabs: indent === 'tab',
  };

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
  if (isJson(input)) return input;
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

function parse(input: string) {
  try {
    return JSON.parse(input);
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: 'Please enter a valid JSON string',
    });
    return;
  }
}

export function formatToJSONLines(input: string) {
  if (!isJson(input) || !isArray(input)) {
    showToast({
      style: Toast.Style.Failure,
      title: 'Please enter a valid JSON/JS Array Object',
    });
    return;
  }

  const jsonVal = JSON.parse(`{"data":${input}}`);
  return jsonVal.data.map(JSON.stringify).join('\n');
}

function isJson(str: string) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

function isArray(str: string) {
  return str.startsWith('[') && str.endsWith(']');
}
