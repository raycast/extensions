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

  try {
    JSON.parse(trimmedText);
  } catch (err) {
    showToast({
      style: Toast.Style.Failure,
      title: trimmedText ? 'Invalid input' : 'Empty input',
    });

    return null;
  }

  const options = {
    indent_size: indent === 'tab' ? 1 : parseInt(indent, 10),
    space_in_empty_paren: true,
    indent_with_tabs: indent === 'tab',
  };

  const output = beautify(trimmedText, options);

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
