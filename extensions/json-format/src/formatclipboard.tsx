import {
  Clipboard,
  popToRoot,
  closeMainWindow,
  showToast,
  Toast,
  showHUD,
} from '@raycast/api';
import { autoPasteEnabled, getIndentation } from './utils';

export default async () => {
  const indent = getIndentation();
  const space = indent === 'tab' ? '\t' : parseInt(indent);
  const clipboardText = (await Clipboard.readText()) as string;
  const trimmedText = clipboardText.trim();
  if (trimmedText.length === 0) {
    showToast({
      style: Toast.Style.Failure,
      title: 'Empty input',
    });
    return;
  }
  try {
    const json = JSON.parse(trimmedText);
    const output = JSON.stringify(json, null, space);

    if (autoPasteEnabled()) {
      await Clipboard.paste(output);
      showHUD('Pasted succesfully!');
    } else {
      await Clipboard.copy(output);
      showHUD('Copied succesfully!');
    }
    closeMainWindow();
    popToRoot();
  } catch (err) {
    showToast({
      style: Toast.Style.Failure,
      title: 'Please copy a valid JSON/JS Object',
    });
    popToRoot();
  }
};
