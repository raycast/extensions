import { Clipboard, getPreferenceValues, getSelectedText, showHUD } from '@raycast/api';
import { name as extractedText } from '../package.json';
import { processInput } from './processInput';
import { sleep } from './utils';

const prompt = (message: string) => showHUD(`${extractedText}: ${message}`);

export default async function main() {
  // get current selected text from OS
  try {
    const selectedText = await getSelectedText();
    if (!selectedText.trim()) {
      await prompt('No text selected');
      return;
    }

    const preferences = getPreferenceValues<Preferences>();
    const formattedText = processInput(selectedText, preferences);

    if (selectedText === formattedText) {
      await prompt('No need to format');
      return;
    }

    console.debug(`Formatted to ${formattedText}`);

    await Clipboard.paste(formattedText);

    await sleep(100);

    const selectedTextAfterPaste = await getSelectedText();
    if (selectedText === selectedTextAfterPaste) {
      await prompt('Cannot paste, copied to clipboard.');
      await Clipboard.copy(formattedText);
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Cannot copy selected text from frontmost application.') {
        await prompt('No text selected');
        return;
      }
      let errorMessage = error.message;
      if (errorMessage.length > 40) errorMessage = `${errorMessage.slice(0, 40)}...`;
      await prompt(`Cannot format the selected text: ${errorMessage}`);
    }

    await prompt(`Cannot format the selected text`);
  }
}
