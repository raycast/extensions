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

  const out = beautify(trimmedText, options);

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
