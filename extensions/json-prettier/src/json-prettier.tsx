import { Clipboard, popToRoot, closeMainWindow, showToast, Toast, showHUD } from '@raycast/api';
import { useEffect } from 'react';

export default () => {
  useEffect(() => {
    main();
    async function main() {
      try {
        const clipboardText = (await Clipboard.readText()) as string;
        const trimmedText = clipboardText.trim();
        let jsObject = parseJson(trimmedText);
        if (!jsObject) {
          eval(`jsObject = ${trimmedText}`);
        }
        await Clipboard.paste(JSON.stringify(jsObject, null, 2));
        showHUD('Pasted succesfully!');
        closeMainWindow();
        popToRoot();
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Invalid',
          message: 'Please copy a valid JSON/JS Object',
        });
        popToRoot();
      }
    }

    function parseJson(input: string) {
      try {
        return JSON.parse(input);
      } catch (err) {
        return;
      }
    }
  });
};
